import { CalendarDays, ChevronDown, MoreHorizontal } from 'lucide-react'
import { Fragment, useEffect, useMemo, useState } from 'react'
import type { PublicOpeningHours } from '../../lib/api/types'
import {
  addDaysToDateKey,
  appointmentReference,
  appointmentTimingLabel,
  browserTimeZone,
  fromDateValue,
  intervalMinutes,
  minuteRangeIsOpen,
  minuteToClock,
  resolveDayScheduleForKey,
  resolveTimeZone,
  serviceColor,
  zonedDateKey,
  zonedMinuteOfDay,
} from '../../lib/appointments'
import type { AppointmentRow, AppointmentStatus } from '../../lib/appointments'
import { cn } from '../../lib/cn'
import { formatDate, formatDuration, formatTime, money } from '../../lib/format'
import { Avatar } from '../ui/avatar'
import { Button } from '../ui/button'
import { Menu } from '../ui/menu'
import { AppointmentStatusBadge } from './AppointmentStatusBadge'
import { AppointmentQuickActions, appointmentActionItems } from './AppointmentActions'
import type { AppointmentAction } from './AppointmentActions'
import { CustomerTypeBadge } from '../ui/customer-type-badge'

/**
 * Timeline — what is actually happening during the selected period.
 *
 * This is a chronological feed, not a restyled card grid and not a table. It reads
 * top to bottom as a day runs: a time spine on the left, one compact row per
 * appointment on the right, and the idle stretches between bookings called out as
 * gaps so a quiet morning is visible at a glance rather than inferred from missing
 * rows.
 *
 * The grouping adapts to the period the screen is showing:
 *
 *  - a single day opens its rows directly (the gaps are the point);
 *  - a week groups by day with a count per day, today marked;
 *  - a month groups by date with counts and collapsed days, because a month of
 *    bookings must not render hundreds of rows into the DOM at once.
 *
 * Rows stay compact and every appointment action is preserved: the status menu and
 * the quick actions are the same ones the table and the calendar use.
 */

/** How the timeline is being read — decides grouping and default expansion. */
export type TimelineScope = 'day' | 'week' | 'month'

export type AppointmentTimelineProps = {
  rows: readonly AppointmentRow[]
  /** The period the rows describe. */
  scope: TimelineScope
  /** The day the period is anchored on, as a business-local `yyyy-MM-dd`. */
  anchor: string
  onOpen: (appointmentId: string) => void
  onAction: (action: AppointmentAction, row: AppointmentRow) => void
  /** The server's total for the current filters, for the "Show more" step. */
  totalCount?: number
  onShowMore?: () => void
  step?: number
  busy?: boolean
  /**
   * The business's opening hours. Each day group then shows its own opening and
   * closing times, marks a closed day, and flags a booking that falls outside the
   * day's hours. Omitted while the read is in flight, which must never be drawn as
   * "closed".
   */
  hours?: PublicOpeningHours | null
  /**
   * The business timezone the schedule is expressed in. Defaults to the browser's,
   * which is what the pre-existing behaviour assumed.
   */
  timeZone?: string
  /** Open the corresponding calendar day (the week/month → day drill-down). */
  onOpenCalendarDay?: (date: Date) => void
}

const OPEN_STATUSES: readonly AppointmentStatus[] = ['booked', 'confirmed', 'pending_payment']

/** Where an appointment sits relative to now, decided by its scheduled times alone. */
export type TimelineState = 'past' | 'current' | 'upcoming'

/**
 * Past / current / upcoming, from the booked interval — never from `CreatedAt` and
 * never by rewriting the stored status. A "confirmed" booking whose time has passed
 * is still confirmed in the database; the timeline simply draws it as finished.
 */
export function timelineState(row: AppointmentRow, now: number = Date.now()): TimelineState {
  const start = new Date(row.scheduledAt).getTime()
  const end = new Date(row.endAt).getTime()
  if (now < start) return 'upcoming'
  if (now >= end) return 'past'
  return 'current'
}

const STATE_LABEL: Record<TimelineState, string> = {
  past: 'Finished',
  current: 'In progress',
  upcoming: 'Upcoming',
}

/** `09:00–18:00`, or null when the business is closed or the hours are unknown. */
export function openingHoursLabel(
  hours: PublicOpeningHours | null | undefined,
  dateKey: string,
): string | null {
  if (!hours) return null
  const schedule = resolveDayScheduleForKey(hours, dateKey)
  if (schedule.isClosed || schedule.periods.length === 0) return null
  return schedule.periods
    .map((period) => `${minuteToClock(period.openMinute)}–${minuteToClock(period.closeMinute)}`)
    .join(', ')
}

/** True when the business is shut for the whole of a business-local day. */
export function isClosedDay(
  hours: PublicOpeningHours | null | undefined,
  dateKey: string,
): boolean {
  if (!hours) return false
  return resolveDayScheduleForKey(hours, dateKey).isClosed
}

/**
 * True when the booked window is not fully inside the day's opening hours — before
 * opening, after closing, across a break, on a closed day, or spanning midnight.
 * Only answered when the hours are actually known.
 */
export function isOutsideOpeningHours(
  hours: PublicOpeningHours | null | undefined,
  dateKey: string,
  row: AppointmentRow,
  timeZone: string,
): boolean {
  if (!hours) return false
  const schedule = resolveDayScheduleForKey(hours, dateKey)
  if (schedule.isClosed) return true
  const startMinute = zonedMinuteOfDay(row.scheduledAt, timeZone)
  const endMinute = zonedMinuteOfDay(row.endAt, timeZone)
  if (endMinute < startMinute) return true // spans business midnight
  return !minuteRangeIsOpen(schedule.periods, startMinute, endMinute)
}

/**
 * `Today` / `Tomorrow` / `Yesterday` / `Tue 12 May`, resolved in business-local days
 * so the heading cannot disagree with the date the bookings were grouped under.
 */
function dayHeading(dateKey: string, todayKey: string): { relative: string; exact: string } {
  const date = fromDateValue(dateKey) ?? new Date(Number.NaN)
  const exact = formatDate(date)
  if (dateKey === todayKey) return { relative: 'Today', exact }
  if (dateKey === addDaysToDateKey(todayKey, 1)) return { relative: 'Tomorrow', exact }
  if (dateKey === addDaysToDateKey(todayKey, -1)) return { relative: 'Yesterday', exact }
  const weekday = new Intl.DateTimeFormat('en-GB', { weekday: 'long' }).format(date)
  return { relative: weekday, exact }
}

/** The idle stretch between two bookings, and whether it fell outside opening hours. */
function gapInfo(
  previousEndIso: string,
  nextStartIso: string,
  outside: boolean,
): { text: string; outside: boolean } | null {
  const gapMinutes = Math.round(
    (new Date(nextStartIso).getTime() - new Date(previousEndIso).getTime()) / 60_000,
  )
  if (gapMinutes < 5) return null
  return { text: `${formatDuration(gapMinutes)} free`, outside }
}

type DayGroup = {
  key: string
  /** The business-local `yyyy-MM-dd` this day group covers. */
  dateKey: string
  /** The same day as a plain calendar date, for headings and drill-down. */
  dayStart: Date
  rows: AppointmentRow[]
  /** The day's own scheduled minutes and value, for the day's summary line. */
  minutes: number
  value: number
}

/**
 * Group the rows by BUSINESS-LOCAL day, in clock order.
 *
 * An appointment near midnight belongs to the day the business was open for, not the
 * day the viewer's clock is on, so this keys on `zonedDateKey` rather than on a local
 * `startOfDay`.
 */
function buildGroups(rows: readonly AppointmentRow[], timeZone: string): DayGroup[] {
  const map = new Map<string, AppointmentRow[]>()
  for (const row of rows) {
    const key = zonedDateKey(row.scheduledAt, timeZone)
    const bucket = map.get(key)
    if (bucket) bucket.push(row)
    else map.set(key, [row])
  }

  return [...map.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .map(([dateKey, dayRows]) => {
      const ordered = [...dayRows].sort(
        (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
      )
      return {
        key: dateKey,
        dateKey,
        dayStart: fromDateValue(dateKey) ?? new Date(Number.NaN),
        rows: ordered,
        minutes: ordered.reduce((sum, row) => sum + row.durationMinutes, 0),
        value: ordered.reduce((sum, row) => sum + (row.price ?? 0), 0),
      }
    })
}

/**
 * A clock that ticks while a "now" marker is wanted.
 *
 * Runs at most every 30 seconds — often enough that the business-local time and the
 * marker stay honest, rare enough not to rerender the feed constantly. The interval
 * is cleared on unmount, so nothing is left running when the page is left.
 */
function useMinuteClock(enabled: boolean): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!enabled) return undefined
    const timer = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(timer)
  }, [enabled])
  return now
}

/** A compact past / in-progress / upcoming chip, driven by the clock, not by status. */
function StateChip({ state }: { state: TimelineState }) {
  const tone =
    state === 'current'
      ? 'bg-selected font-semibold text-accent-ink'
      : state === 'upcoming'
        ? 'bg-sunken font-semibold text-fg'
        : 'bg-hover font-semibold text-muted'
  return (
    <span className={cn('rounded-pill px-[0.4rem] py-[0.05rem] text-caption', tone)}>
      {STATE_LABEL[state]}
    </span>
  )
}

/** One appointment on the spine: time, who, what, who serves it, and its state. */
function TimelineRow({
  row,
  state,
  outsideHours,
  onOpen,
  onAction,
  busy,
}: {
  row: AppointmentRow
  /** Past / current / upcoming, from the booked interval. */
  state: TimelineState
  /** True when the booked window falls outside the day's opening hours. */
  outsideHours: boolean
  onOpen: () => void
  onAction: (action: AppointmentAction) => void
  busy: boolean
}) {
  const accent = serviceColor(row.serviceId)
  const cancelled = row.status === 'cancelled' || row.status === 'no_show'

  return (
    <li
      className={cn('relative pl-[4.2rem]', state === 'past' && !cancelled && 'opacity-80')}
      data-state={state}
      data-outside-hours={outsideHours ? 'true' : undefined}
    >
      {/* The time sits in the gutter, so the reader scans a single clock column. */}
      <button
        type="button"
        onClick={onOpen}
        className="absolute left-0 w-[3.5rem] pt-[0.1rem] text-right focus-visible:shadow-ring focus-visible:outline-none"
        aria-label={`Open ${row.customerName} at ${formatTime(row.scheduledAt)}`}
      >
        <span className="block text-label font-semibold tabular">{formatTime(row.scheduledAt)}</span>
        <span className="block text-caption text-muted tabular">{formatDuration(row.durationMinutes)}</span>
      </button>

      {/* The dot on the spine carries the service colour, so a day's shape is legible
          without reading a single card. */}
      <span
        aria-hidden="true"
        className="absolute top-[0.45rem] left-[3.9rem] size-[0.55rem] rounded-round ring-2 ring-bg"
        style={{ backgroundColor: cancelled ? 'var(--fg-disabled)' : accent }}
      />

      <div
        className={cn(
          'mb-[0.5rem] min-w-0 overflow-hidden rounded-lg border border-line bg-surface px-[0.7rem] py-[0.55rem] transition-colors',
          cancelled && 'opacity-70',
        )}
      >
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-[0.6rem]">
          <button
            type="button"
            onClick={onOpen}
            className="min-w-0 flex-1 text-left focus-visible:shadow-ring focus-visible:outline-none"
          >
            <span className="flex min-w-0 flex-wrap items-center gap-[0.4rem]">
              <Avatar size="sm" name={row.customerName} src={row.customerAvatarUrl ?? undefined} decorative />
              <b className={cn('truncate font-semibold', cancelled && 'line-through')}>
                {row.customerName}
              </b>
              <CustomerTypeBadge type={row.customerType} />
            </span>
            <span className="mt-[0.15rem] flex min-w-0 flex-wrap items-center gap-x-[0.45rem] text-meta text-muted">
              <span className="font-medium text-fg">{row.serviceName}</span>
              <span aria-hidden="true">·</span>
              <span className="truncate">{row.staffName ?? 'Unassigned'}</span>
              <span aria-hidden="true">·</span>
              <span className="tabular">{money(row.price ?? 0)}</span>
            </span>
          </button>

          <div className="flex shrink-0 items-center gap-[0.2rem]">
            <AppointmentStatusBadge status={row.status} />
            <Menu
              items={appointmentActionItems(row.status, onAction)}
              triggerLabel={`Actions for ${row.customerName} (${appointmentReference(row.id)})`}
              trigger={<MoreHorizontal className="size-4" aria-hidden="true" />}
            />
          </div>
        </div>

        <div className="mt-[0.45rem] flex flex-wrap items-center justify-between gap-[0.5rem]">
          <span className="flex min-w-0 flex-wrap items-center gap-[0.4rem] text-caption text-subtle">
            <StateChip state={state} />
            {outsideHours ? (
              // A booking that starts before opening, ends after closing or spans the
              // night is called out, so it never reads as an ordinary free slot.
              <span className="rounded-pill border border-line bg-sunken px-[0.4rem] py-[0.05rem] font-semibold text-fg">
                Outside opening hours
              </span>
            ) : null}
            <span className="truncate">
              {appointmentTimingLabel(row)} · ref {appointmentReference(row.id)}
            </span>
          </span>
          <AppointmentQuickActions status={row.status} onAction={onAction} disabled={busy} />
        </div>
      </div>
    </li>
  )
}


/** The current-time marker: a rule on the spine labelled with the business-local clock. */
function NowMarker({ timeZone, now }: { timeZone: string; now: number }) {
  const label = minuteToClock(zonedMinuteOfDay(now, timeZone))
  return (
    <li className="relative -ml-[1px] py-[0.15rem] pl-[4.2rem]" data-now-marker="true">
      <span
        aria-hidden="true"
        className="absolute top-[0.75rem] -left-[1px] h-[2px] w-[3.1rem] bg-danger"
      />
      <span className="text-caption font-semibold text-accent">Now {label}</span>
    </li>
  )
}

/**
 * One day of the timeline: its heading, its hours, its current-time marker and its
 * rows in clock order.
 *
 * The heading carries the business's own schedule for the day — opening and closing
 * times, or a "Closed" state — so the feed reads as the business's day rather than a
 * generic list. Today's section also carries a live current-time marker positioned
 * where "now" falls between the bookings, so it never covers an appointment.
 */
function TimelineDay({
  group,
  scope,
  hours,
  timeZone,
  now,
  todayKey,
  onOpen,
  onAction,
  onOpenCalendarDay,
  busy,
}: {
  group: DayGroup
  scope: TimelineScope
  hours: PublicOpeningHours | null
  timeZone: string
  now: number
  todayKey: string
  onOpen: (appointmentId: string) => void
  onAction: (action: AppointmentAction, row: AppointmentRow) => void
  onOpenCalendarDay?: (date: Date) => void
  busy: boolean
}) {
  const isToday = group.dateKey === todayKey
  const { relative, exact } = dayHeading(group.dateKey, todayKey)
  const closed = isClosedDay(hours, group.dateKey)
  const hoursLabel = openingHoursLabel(hours, group.dateKey)
  const schedule = resolveDayScheduleForKey(hours, group.dateKey)

  // A single day is the whole point of the view, so it is open. A month of days is
  // collapsed unless something is happening today, which is what keeps a busy month
  // from rendering hundreds of rows at once.
  const [open, setOpen] = useState(scope === 'day' || isToday)

  const upcoming = group.rows.filter((row) => OPEN_STATUSES.includes(row.status as AppointmentStatus)).length

  /** How many rows have already started — where the "now" marker belongs. */
  const startedCount = group.rows.filter((row) => new Date(row.scheduledAt).getTime() <= now).length

  /** Is a stretch between two bookings outside the day's opening hours? */
  const gapIsOutside = (gapStartIso: string, nextStartIso: string): boolean => {
    if (!hours) return false
    if (schedule.isClosed) return true
    const startMinute = zonedMinuteOfDay(gapStartIso, timeZone)
    const endMinute = Math.min(1440, startMinute + intervalMinutes(gapStartIso, nextStartIso))
    return !minuteRangeIsOpen(schedule.periods, startMinute, endMinute)
  }

  return (
    <section className="mb-[1.1rem] min-w-0" aria-label={`${relative} ${exact}`} data-day={group.dateKey}>
      <div className="sticky top-0 z-[3] -mx-[0.2rem] flex flex-wrap items-center gap-x-[0.6rem] gap-y-[0.25rem] bg-bg px-[0.2rem] py-[0.45rem]">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-baseline gap-[0.5rem] text-left focus-visible:shadow-ring focus-visible:outline-none"
        >
          <ChevronDown
            className={cn('size-4 shrink-0 text-muted transition-transform', !open && '-rotate-90')}
            aria-hidden="true"
          />
          <b className={cn('text-label', isToday && 'text-accent-ink')}>{relative}</b>
          <span className="truncate text-meta text-muted">{exact}</span>
        </button>

        {/* The business's own schedule for this day — never a generic 08:00–20:00. */}
        {closed ? (
          <span className="rounded-pill border border-line bg-sunken px-[0.45rem] py-[0.05rem] text-caption font-semibold text-muted">
            Closed
          </span>
        ) : hoursLabel ? (
          <span className="text-caption text-muted tabular">{hoursLabel}</span>
        ) : null}

        {isToday ? (
          <span className="rounded-pill bg-selected px-[0.45rem] py-[0.05rem] text-caption font-semibold text-accent-ink tabular">
            Now {minuteToClock(zonedMinuteOfDay(now, timeZone))}
          </span>
        ) : null}

        <span className="ml-auto flex shrink-0 items-center gap-[0.5rem] text-caption text-muted tabular">
          <span className="rounded-pill bg-sunken px-[0.5rem] py-[0.1rem] font-semibold">
            {group.rows.length}
          </span>
          <span className="max-[30rem]:hidden">
            {formatDuration(group.minutes)}
            {group.value > 0 ? ` · ${money(group.value)}` : ''}
          </span>
          {upcoming > 0 ? <span className="max-[30rem]:hidden">{upcoming} to come</span> : null}
          {onOpenCalendarDay ? (
            <button
              type="button"
              onClick={() => onOpenCalendarDay(group.dayStart)}
              aria-label={`Open ${exact} in the calendar`}
              className="grid size-[1.5rem] place-items-center rounded-sm text-muted transition-colors hover:bg-hover hover:text-fg focus-visible:shadow-ring focus-visible:outline-none"
            >
              <CalendarDays className="size-3.5" aria-hidden="true" />
            </button>
          ) : null}
        </span>
      </div>

      {open ? (
        <ol className="relative mt-[0.4rem] list-none border-l border-line p-0 pl-0">
          {group.rows.map((row, index) => {
            const previous = index > 0 ? group.rows[index - 1] : null
            const gap = previous
              ? gapInfo(previous.endAt, row.scheduledAt, gapIsOutside(previous.endAt, row.scheduledAt))
              : null
            return (
              <Fragment key={row.id}>
                {isToday && index === startedCount ? (
                  <NowMarker timeZone={timeZone} now={now} />
                ) : null}
                {gap ? (
                  <li className="relative -ml-[1px] py-[0.15rem] pl-[4.2rem]">
                    <span className="text-caption text-subtle">
                      {gap.text}
                      {gap.outside ? ' · outside opening hours' : ''}
                    </span>
                  </li>
                ) : null}
                <TimelineRow
                  row={row}
                  state={timelineState(row, now)}
                  outsideHours={isOutsideOpeningHours(hours, group.dateKey, row, timeZone)}
                  busy={busy}
                  onOpen={() => onOpen(row.id)}
                  onAction={(action) => onAction(action, row)}
                />
              </Fragment>
            )
          })}

          {isToday && startedCount === group.rows.length ? (
            <NowMarker timeZone={timeZone} now={now} />
          ) : null}

          {group.rows.length === 0 ? (
            <li className="relative -ml-[1px] py-[0.15rem] pl-[4.2rem]">
              <span className="text-caption text-subtle">
                {closed ? 'No bookings — the business is closed.' : 'No appointments booked.'}
              </span>
            </li>
          ) : null}
        </ol>
      ) : (
        <p className="mt-[0.3rem] pl-[1.3rem] text-meta text-muted">
          {group.rows.length} appointment{group.rows.length === 1 ? '' : 's'} · open to see the order
        </p>
      )}
    </section>
  )
}

/** A day group with no rows, for a day view that must still show its hours. */
function emptyDayGroup(dateKey: string): DayGroup {
  return {
    key: dateKey,
    dateKey,
    dayStart: fromDateValue(dateKey) ?? new Date(Number.NaN),
    rows: [],
    minutes: 0,
    value: 0,
  }
}

export function AppointmentTimeline({
  rows,
  scope,
  anchor,
  onOpen,
  onAction,
  totalCount,
  onShowMore,
  step = 24,
  busy = false,
  hours = null,
  timeZone,
  onOpenCalendarDay,
}: AppointmentTimelineProps) {
  const zone = useMemo(() => resolveTimeZone(timeZone, browserTimeZone()), [timeZone])
  const todayKey = useMemo(() => zonedDateKey(Date.now(), zone), [zone])
  const groups = useMemo(() => buildGroups(rows, zone), [rows, zone])

  /**
   * A single-day view must still render the day — with its own opening hours — even
   * when nothing is booked, so an empty day reads as "nothing scheduled", not as a
   * missing day.
   */
  const displayGroups = useMemo(() => {
    if (scope !== 'day') return groups
    if (groups.some((group) => group.dateKey === anchor)) return groups
    return [emptyDayGroup(anchor)]
  }, [groups, scope, anchor])

  /** The clock only ticks while today is actually on screen. */
  const includesToday = useMemo(() => {
    if (scope === 'day') return anchor === todayKey
    return displayGroups.some((group) => group.dateKey === todayKey)
  }, [scope, anchor, todayKey, displayGroups])

  const now = useMinuteClock(includesToday)
  const remaining = Math.max(0, (totalCount ?? rows.length) - rows.length)

  return (
    <div className="grid min-w-0 gap-[0.2rem]" aria-busy={busy || undefined}>
      {displayGroups.map((group) => (
        <TimelineDay
          key={group.key}
          group={group}
          scope={scope}
          hours={hours}
          timeZone={zone}
          now={now}
          todayKey={todayKey}
          onOpen={onOpen}
          onAction={onAction}
          onOpenCalendarDay={onOpenCalendarDay}
          busy={busy}
        />
      ))}

      {remaining > 0 && onShowMore ? (
        <div className="flex flex-col items-center gap-[0.4rem] py-[0.8rem]">
          <Button onClick={onShowMore} disabled={busy}>
            Load {Math.min(step, remaining)} more
          </Button>
          <span className="text-meta text-muted tabular">
            {rows.length} of {totalCount} shown
          </span>
        </div>
      ) : null}

      {displayGroups.length === 0 ? null : (
        <p className="pt-[0.4rem] text-center text-caption text-subtle">
          Ordered by the clock, with the business&rsquo;s opening hours and the free stretches between
          bookings shown.
        </p>
      )}
    </div>
  )
}
