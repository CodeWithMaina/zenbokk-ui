import { CalendarX2 } from 'lucide-react'
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import type { PublicOpeningHours, StaffDashboardItem } from '../../lib/api/types'
import {
  addDays,
  browserTimeZone,
  calendarWindow,
  minuteToClock,
  resolveDaySchedule,
  resolveTimeZone,
  scheduleBand,
  serviceColor,
  startOfDay,
  startOfWeek,
  toDateValue,
  zonedDateKey,
  zonedMinuteOfDay,
} from '../../lib/appointments'
import type { AppointmentRow, CalendarMode } from '../../lib/appointments'
import { appointmentStatusLabel } from '../../lib/dashboard/appointment-status'
import { cn } from '../../lib/cn'
import { formatDay, formatTime } from '../../lib/format'
import { Avatar } from '../ui/avatar'
import { StatusPill } from '../ui/badge'
import { EmptyState } from '../ui/empty-state'

/**
 * The fallback band, used only while the business's real opening hours are
 * unknown (the request is still in flight, or it failed). Whenever the hours are
 * available the calendar draws the business's OWN schedule — see `scheduleBand` —
 * so a clinic that opens at 07:00 and a salon that closes at 21:00 are both drawn
 * honestly, and neither is squeezed into a hardcoded 08:00–20:00 working day.
 */
export const DAY_START_HOUR = 8
export const DAY_END_HOUR = 20
const HOUR_HEIGHT = 56
const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

/** Minutes from the top of the band, given the band's own start and the business zone. */
function bandOffsetMinutes(iso: string, startMinute: number, timeZone: string): number {
  return zonedMinuteOfDay(iso, timeZone) - startMinute
}

/** Height in pixels for a booked interval, clipped to the visible band. */
function bandHeight(startIso: string, endIso: string): number {
  const minutes =
    (new Date(endIso).getTime() - new Date(startIso).getTime()) / 60_000
  return Math.max(18, (minutes / 60) * HOUR_HEIGHT - 2)
}

export type CalendarEvent = {
  row: AppointmentRow
  lane: number
  lanes: number
}

/**
 * Side-by-side placement for overlapping events.
 *
 * Events are grouped into clusters of transitively-overlapping appointments; a
 * cluster's width is split between the lanes it needed. Splitting per cluster
 * (rather than across the whole column) keeps a busy morning readable without
 * squashing a quiet afternoon.
 */
export function positionEvents(rows: readonly AppointmentRow[]): CalendarEvent[] {
  const sorted = [...rows].sort(
    (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
  )

  const placed: CalendarEvent[] = []
  let cluster: { row: AppointmentRow; lane: number }[] = []
  let laneEnds: number[] = []
  let clusterEnd = Number.NEGATIVE_INFINITY

  const flush = () => {
    const lanes = Math.max(1, laneEnds.length)
    for (const entry of cluster) placed.push({ ...entry, lanes })
    cluster = []
    laneEnds = []
  }

  for (const row of sorted) {
    const start = new Date(row.scheduledAt).getTime()
    const end = new Date(row.endAt).getTime()

    if (cluster.length > 0 && start >= clusterEnd) flush()

    let lane = laneEnds.findIndex((laneEnd) => laneEnd <= start)
    if (lane < 0) {
      lane = laneEnds.length
      laneEnds.push(end)
    } else {
      laneEnds[lane] = end
    }

    cluster.push({ row, lane })
    clusterEnd = Math.max(clusterEnd, end)
  }

  flush()
  return placed
}

/** A coloured event block, shared by the month chips and the time grid. */
function EventBlock({
  row,
  compact = false,
  onSelect,
  onPointerDown,
  dragging,
}: {
  row: AppointmentRow
  compact?: boolean
  onSelect: () => void
  onPointerDown?: (event: ReactPointerEvent<HTMLButtonElement>) => void
  dragging?: boolean
}) {
  const color = serviceColor(row.serviceId)
  const dimmed = row.status === 'cancelled'

  return (
    <button
      type="button"
      onClick={onSelect}
      onPointerDown={onPointerDown}
      title={`${row.customerName} · ${row.serviceName} · ${row.staffName ?? 'Unassigned'}`}
      style={{ borderColor: color, backgroundColor: `color-mix(in srgb, ${color} 13%, var(--surface))` }}
      className={cn(
        'group block w-full overflow-hidden rounded-xs border-l-[3px] text-left',
        compact ? 'px-[0.4rem] py-[0.1rem]' : 'px-[0.5rem] py-[0.25rem]',
        dimmed && 'opacity-50',
        dragging && 'cursor-grabbing opacity-90 shadow-overlay',
        onPointerDown && 'cursor-grab touch-none',
      )}
    >
      <b
        className={cn(
          'block truncate font-bold',
          compact ? 'text-caption' : 'text-[0.78rem]',
          dimmed && 'line-through',
        )}
      >
        {compact ? `${formatTime(row.scheduledAt)} ${row.customerName}` : row.customerName}
      </b>
      {!compact ? (
        <span className="block truncate text-caption text-muted">
          {formatTime(row.scheduledAt)}–{formatTime(row.endAt)} · {row.serviceName}
        </span>
      ) : null}
    </button>
  )
}

/** Status colour used by the block's dot, mirroring the design's indicator. */
const STATUS_DOT: Record<string, string> = {
  booked: 'var(--warning-solid)',
  confirmed: 'var(--success-solid)',
  completed: 'var(--fg-muted)',
  cancelled: 'var(--danger-solid)',
  no_show: 'var(--danger-solid)',
}

export function statusDotColor(status: string): string {
  return STATUS_DOT[status] ?? 'var(--fg-muted)'
}

/**
 * The day view on a phone.
 *
 * A staff-column grid is the right shape for a wide screen and the wrong one for a
 * 375px one: shrinking it hides most of the day behind horizontal scrolling inside a
 * card. Phones therefore get a compact agenda — one row per booking, in clock order,
 * with the time as the rail — built from the same rows, the same status vocabulary
 * and the same business hours as the grid. The grid itself is not removed; it is
 * simply not the phone's layout.
 */
function DayAgenda({
  date,
  rows,
  hours,
  onSelect,
}: {
  date: Date
  rows: readonly AppointmentRow[]
  hours: PublicOpeningHours | null
  onSelect: (appointmentId: string) => void
}) {
  const schedule = resolveDaySchedule(hours, date)
  const closed = Boolean(hours) && schedule.isClosed
  const hoursLabel = schedule.periods
    .map((period) => `${minuteToClock(period.openMinute)}–${minuteToClock(period.closeMinute)}`)
    .join(', ')

  const ordered = [...rows].sort(
    (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
  )

  return (
    <div className="p-[0.85rem]">
      <div className="mb-[0.7rem] flex items-baseline justify-between gap-[0.6rem]">
        <div className="min-w-0">
          <p className="text-label font-semibold">{formatDay(date)}</p>
          <p className="text-caption text-muted">
            {closed
              ? 'Closed — no opening hours'
              : hoursLabel
                ? `Open ${hoursLabel}`
                : 'Opening hours not set'}
          </p>
        </div>
        <span className="shrink-0 text-caption text-muted tabular">
          {ordered.length} appointment{ordered.length === 1 ? '' : 's'}
        </span>
      </div>

      {ordered.length === 0 ? (
        <p className="rounded-card bg-sunken px-[0.85rem] py-[0.9rem] text-meta text-muted">
          {closed
            ? 'The business is closed on this day. Bookings cannot be taken outside the opening schedule.'
            : 'Nothing is booked for this day. Tap an empty slot on a larger screen, or use New booking.'}
        </p>
      ) : (
        <ol className="m-0 flex list-none flex-col gap-[0.45rem] p-0">
          {ordered.map((row) => {
            const dimmed = row.status === 'cancelled'
            return (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => onSelect(row.id)}
                  className="flex w-full items-start gap-[0.6rem] rounded-card border border-line bg-surface px-[0.65rem] py-[0.6rem] text-left transition-colors hover:bg-hover focus-visible:shadow-ring focus-visible:outline-none"
                >
                  <span
                    aria-hidden="true"
                    className="mt-[0.35rem] h-[2.1rem] w-[3px] shrink-0 rounded-pill"
                    style={{ backgroundColor: statusDotColor(row.status) }}
                  />
                  <span className="w-[2.55rem] shrink-0 pt-[0.1rem] text-caption font-semibold text-muted tabular">
                    {formatTime(row.scheduledAt)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-[0.5rem]">
                      <b
                        className={cn(
                          'min-w-0 truncate text-label font-semibold',
                          dimmed && 'line-through opacity-60',
                        )}
                      >
                        {row.customerName}
                      </b>
                      <StatusPill status={row.status} className="shrink-0">
                        {appointmentStatusLabel(row.status)}
                      </StatusPill>
                    </span>
                    <span className="mt-[0.15rem] block truncate text-caption text-muted">
                      {row.serviceName} · {formatTime(row.scheduledAt)}–{formatTime(row.endAt)}
                    </span>
                    <span className="mt-[0.1rem] block truncate text-caption text-subtle">
                      {row.staffName ?? 'Unassigned'}
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}


export type AppointmentCalendarProps = {
  mode: CalendarMode
  anchor: Date
  /** Every appointment inside the visible window. */
  rows: readonly AppointmentRow[]
  /** Staff columns for the day view. */
  staff: readonly StaffDashboardItem[]
  onSelect: (appointmentId: string) => void
  /** A click on empty grid space — the design's "book at this time". */
  onCreateAt: (input: { start: Date; staffUserId?: string }) => void
  /** A completed drag. The caller performs the write; nothing is moved optimistically. */
  onReschedule: (input: { appointmentId: string; start: Date; staffUserId?: string }) => void
  /** Month-cell click: open that day. */
  onSelectDate: (date: Date) => void
  /**
   * A month cell was clicked: open the WEEK containing that date.
   *
   * This is the first step of the calendar's hierarchy (month → week → day). When
   * it is not supplied the cell falls back to `onSelectDate`, so a caller that only
   * knows about single dates keeps working unchanged.
   */
  onOpenWeek?: (date: Date) => void
  /** A day header in the week view was clicked: open that DAY. */
  onOpenDay?: (date: Date) => void
  /**
   * Move to a broader period without changing the selected date (day → week →
   * month). Supplying it renders the period trail; omitting it hides the trail.
   */
  onModeChange?: (mode: CalendarMode) => void
  /**
   * The business's opening hours (from the scheduling domain). When supplied, the
   * time grid's band, its per-day labels and its closed-day treatment follow the
   * business's real schedule; when omitted — still loading, or the read failed —
   * the grid falls back to a safe default band and never claims a day is closed.
   */
  hours?: PublicOpeningHours | null
  /**
   * The business timezone the pane is drawn in. The band, the per-day lookups and the
   * "now" line all read the clock through it, so an appointment sits where the
   * business's own day puts it rather than where the viewer's device does. Omitted
   * (or equal to the browser's) reproduces the previous behaviour exactly.
   */
  timeZone?: string
  busy?: boolean
}

/**
 * The calendar view: month, week and day.
 *
 * Every block is a real appointment in the visible window, positioned from its
 * persisted `scheduledAt`/`endAt`. Dragging is offered in the day view (the
 * design's staff-column board) and **never** moves the row on screen: the drop
 * calls `onReschedule`, which performs the API write, and the query
 * invalidation redraws from the server's answer. A refused move therefore
 * leaves the block exactly where it was, with the server's error shown.
 */
export function AppointmentCalendar({
  mode,
  anchor,
  rows,
  staff,
  onSelect,
  onCreateAt,
  onReschedule,
  onSelectDate,
  onOpenWeek,
  onOpenDay,
  onModeChange,
  hours = null,
  timeZone,
  busy = false,
}: AppointmentCalendarProps) {
  const now = useNow()
  const scrollRef = useRef<HTMLDivElement>(null)
  const drag = useDragState()

  /** The business timezone every pane date and instant is read through. */
  const zone = useMemo(() => resolveTimeZone(timeZone, browserTimeZone()), [timeZone])
  const todayKey = useMemo(() => zonedDateKey(now, zone), [now, zone])

  // Rows are bucketed by BUSINESS-LOCAL day, so a booking near midnight falls in the
  // column the business was open for, not the one the viewer's clock happens to be on.
  const byDay = useMemo(() => {
    const map = new Map<string, AppointmentRow[]>()
    for (const row of rows) {
      const key = zonedDateKey(row.scheduledAt, zone)
      const bucket = map.get(key)
      if (bucket) bucket.push(row)
      else map.set(key, [row])
    }
    return map
  }, [rows, zone])

  /**
   * The local days the current period actually shows. The band is the union of
   * their opening hours, so a week whose Saturday opens later than its weekdays
   * still fits its whole Saturday into the same grid as the early weekdays.
   */
  const visibleDates = useMemo(() => {
    if (mode === 'month') {
      const { start } = calendarWindow('month', anchor)
      return Array.from({ length: 42 }, (_, index) => addDays(start, index))
    }
    if (mode === 'week') {
      const weekStart = startOfWeek(anchor)
      return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index))
    }
    return [startOfDay(anchor)]
  }, [mode, anchor])

  const band = useMemo(() => scheduleBand(hours, visibleDates), [hours, visibleDates])

  // Keep the band scrolled to around "now" rather than to the top of the day, so
  // the current hour is visible when the page opens — without hiding the earlier
  // working hours, which stay one scroll up.
  useEffect(() => {
    if (mode === 'month' || !scrollRef.current) return
    const current = bandOffsetMinutes(new Date().toISOString(), band.startMinute, zone)
    scrollRef.current.scrollTop = Math.max(0, ((current - 60) / 60) * HOUR_HEIGHT)
  }, [mode, anchor, band.startMinute, zone])

  if (rows.length === 0 && mode === 'month') {
    return (
      <div className="card">
        <EmptyState
          icon={<CalendarX2 className="size-5" aria-hidden="true" />}
          title="Nothing scheduled this month"
          description="No appointments fall inside the dates shown. Use Today or New booking to get started."
        />
      </div>
    )
  }

  return (
    <div className="card overflow-hidden" aria-busy={busy || undefined}>
      {onModeChange ? (
        <PeriodTrail mode={mode} anchor={anchor} onModeChange={onModeChange} />
      ) : null}
      {mode === 'month' ? (
        <MonthGrid
          anchor={anchor}
          byDay={byDay}
          hours={hours}
          todayKey={todayKey}
          onSelect={onSelect}
          onSelectDate={onOpenWeek ?? onSelectDate}
        />
      ) : (
        <>
          {mode === 'day' ? (
            <div className="sm:hidden">
              <DayAgenda
                date={startOfDay(anchor)}
                rows={byDay.get(toDateValue(startOfDay(anchor))) ?? []}
                hours={hours}
                onSelect={onSelect}
              />
            </div>
          ) : null}
          <div className={mode === 'day' ? 'hidden sm:block' : undefined}>
            <TimeGrid
              mode={mode}
              anchor={anchor}
              byDay={byDay}
              staff={staff}
              now={now}
              hours={hours}
              band={band}
              zone={zone}
              todayKey={todayKey}
              scrollRef={scrollRef}
              onSelect={onSelect}
              onCreateAt={onCreateAt}
              onReschedule={onReschedule}
              onOpenDay={onOpenDay}
              drag={drag}
            />
          </div>
        </>
      )}
    </div>
  )
}

/**
 * Where the calendar is, and how to widen it: `Month · Week · Day`.
 *
 * The trail is both the answer to "which period am I looking at?" and the drill-up
 * control (daily → weekly → monthly). Moving to a broader period deliberately does
 * NOT touch the selected date — the week or month that contains it is what opens,
 * so a date picked three clicks ago is never thrown away.
 */
function PeriodTrail({
  mode,
  anchor,
  onModeChange,
}: {
  mode: CalendarMode
  anchor: Date
  onModeChange: (mode: CalendarMode) => void
}) {
  /** Broadest first, so the trail reads left to right like a breadcrumb. */
  const trail: readonly { value: CalendarMode; label: string }[] = [
    { value: 'month', label: 'Month' },
    { value: 'week', label: 'Week' },
    { value: 'day', label: 'Day' },
  ]

  const period =
    mode === 'month'
      ? new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(anchor)
      : mode === 'week'
        ? `${formatDay(calendarWindow('week', anchor).start)} – ${formatDay(addDays(calendarWindow('week', anchor).start, 6))}`
        : formatDay(anchor)

  return (
    <nav
      aria-label="Calendar period"
      className="flex flex-wrap items-center gap-[0.3rem] border-b border-line px-[0.7rem] py-[0.5rem]"
    >
      {trail.map((step, index) => {
        const current = step.value === mode
        return (
          <Fragment key={step.value}>
            {index > 0 ? (
              <span aria-hidden="true" className="text-caption text-subtle">
                /
              </span>
            ) : null}
            {current ? (
              <span
                aria-current="true"
                className="rounded-sm bg-hover px-[0.45rem] py-[0.15rem] text-caption font-semibold text-fg"
              >
                {step.label}
              </span>
            ) : (
              <button
                type="button"
                onClick={() => onModeChange(step.value)}
                aria-label={`Show the ${step.label.toLowerCase()} view`}
                className="rounded-sm px-[0.45rem] py-[0.15rem] text-caption font-medium text-muted transition-colors hover:bg-hover hover:text-fg focus-visible:shadow-ring focus-visible:outline-none"
              >
                {step.label}
              </button>
            )}
          </Fragment>
        )
      })}
      <span className="ml-[0.3rem] truncate text-caption text-subtle">{period}</span>
    </nav>
  )
}

/** A ticking clock, so "now" lines and relative labels stay honest. */
function useNow(): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(timer)
  }, [])
  return now
}

type DragState = {
  appointmentId: string | null
  originX: number
  originY: number
  offsetX: number
  offsetY: number
  active: boolean
  overStaffId: string | null
}

/** Pointer-drag bookkeeping for the day board. */
function useDragState() {
  const [state, setState] = useState<DragState>({
    appointmentId: null,
    originX: 0,
    originY: 0,
    offsetX: 0,
    offsetY: 0,
    active: false,
    overStaffId: null,
  })
  return { state, setState }
}

function MonthGrid({
  anchor,
  byDay,
  hours,
  todayKey,
  onSelect,
  onSelectDate,
}: {
  anchor: Date
  byDay: ReadonlyMap<string, AppointmentRow[]>
  hours: PublicOpeningHours | null
  todayKey: string
  onSelect: (appointmentId: string) => void
  onSelectDate: (date: Date) => void
}) {
  const { start } = calendarWindow('month', anchor)
  const month = anchor.getMonth()

  return (
    <div>
      <div className="grid grid-cols-7 border-b border-line bg-hover">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="px-[0.6rem] py-[0.55rem] text-caption font-semibold tracking-caps text-muted uppercase"
          >
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {Array.from({ length: 42 }, (_, index) => {
          const date = addDays(start, index)
          const key = toDateValue(date)
          const dayRows = (byDay.get(key) ?? [])
            .slice()
            .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
          const outside = date.getMonth() !== month
          const today = key === todayKey
          const closed = resolveDaySchedule(hours, date).isClosed

          return (
            <div
              key={key}
              className={cn(
                'min-h-[4.6rem] border-r border-b border-line p-[0.3rem] sm:min-h-[7.6rem] sm:p-[0.45rem]',
                'last:border-r-0 [&:nth-child(7n)]:border-r-0',
                outside && 'bg-hover text-muted',
                closed && !outside && 'bg-sunken',
              )}
            >
              <div className="mb-[0.3rem] flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => onSelectDate(date)}
                  aria-label={`Open ${formatDay(date)}`}
                  className={cn(
                    'grid size-[1.7rem] place-items-center rounded-round text-label font-semibold tabular transition-colors hover:bg-hover focus-visible:shadow-ring focus-visible:outline-none',
                    today && 'bg-inverse text-on-inverse hover:bg-inverse',
                  )}
                >
                  {date.getDate()}
                </button>
                {dayRows.length > 0 ? (
                  <span className="rounded-pill bg-success-soft px-[0.4rem] text-caption font-bold text-success-ink tabular">
                    {dayRows.length}
                  </span>
                ) : closed && !outside ? (
                  // A closed day is called out, so an empty cell reads as "shut"
                  // rather than "nothing booked".
                  <span className="rounded-pill bg-hover px-[0.4rem] text-caption font-semibold text-subtle">
                    Closed
                  </span>
                ) : null}
              </div>

              <div className="space-y-[0.2rem] max-sm:hidden">
                {dayRows.slice(0, 3).map((row) => (
                  <EventBlock
                    key={row.id}
                    row={row}
                    compact
                    onSelect={() => onSelect(row.id)}
                  />
                ))}
                {dayRows.length > 3 ? (
                  <p className="pl-[0.2rem] text-caption font-semibold text-muted">
                    +{dayRows.length - 3} more
                  </p>
                ) : null}
              </div>

              {/* Phones show a dot per appointment instead of the text blocks. */}
              <div className="hidden flex-wrap gap-[0.2rem] max-sm:flex">
                {dayRows.slice(0, 12).map((row) => (
                  <span
                    key={row.id}
                    aria-hidden="true"
                    className="size-[0.45rem] rounded-round"
                    style={{ backgroundColor: serviceColor(row.serviceId) }}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

type TimeGridProps = {
  mode: Exclude<CalendarMode, 'month'>
  anchor: Date
  byDay: ReadonlyMap<string, AppointmentRow[]>
  staff: readonly StaffDashboardItem[]
  now: number
  hours: PublicOpeningHours | null
  /** The hour-aligned band the grid draws, derived from the business's hours. */
  band: { startMinute: number; endMinute: number }
  /** The business timezone instants are read in. */
  zone: string
  /** The business-local `yyyy-MM-dd` of today. */
  todayKey: string
  scrollRef: React.RefObject<HTMLDivElement | null>
  onSelect: (appointmentId: string) => void
  onCreateAt: (input: { start: Date; staffUserId?: string }) => void
  onReschedule: (input: { appointmentId: string; start: Date; staffUserId?: string }) => void
  /** A weekday header was clicked: open that day (week → day drill-down). */
  onOpenDay?: (date: Date) => void
  drag: { state: DragState; setState: (next: DragState) => void }
}

/** One column of the time grid. */
type GridColumn = {
  key: string
  staffUserId: string | undefined
  title: string
  subtitle: string
  date: Date
  /** True for the single solo-mode column, which owns the whole day. */
  all?: boolean
  /** True for the column that collects rows with no (or an unknown) staff member. */
  unassigned?: boolean
}

/** The drag payload a completed move produces. */
export type AppointmentMove = {
  appointmentId: string
  start: Date
  staffUserId?: string
}


/**
 * Day and week share one time grid: a staff column per practitioner in the day
 * view, a calendar column per weekday in the week view. Both position blocks
 * from the persisted times, draw a "now" line on today, and turn a click on
 * empty space into a pre-filled booking.
 */
function TimeGrid({
  mode,
  anchor,
  byDay,
  staff,
  now,
  hours,
  band,
  zone,
  todayKey,
  scrollRef,
  onSelect,
  onCreateAt,
  onReschedule,
  onOpenDay,
  drag,
}: TimeGridProps) {
  const columnRefs = useRef(new Map<string, HTMLDivElement>())

  const columns = useMemo<GridColumn[]>(() => {
    if (mode === 'day') {
      const date = startOfDay(anchor)
      const dayRows = byDay.get(toDateValue(date)) ?? []

      // Solo mode: no staff bucket to split by (the Staff module is off, or nobody is
      // listed), so the day is ONE column. It owns every booking for that day — a
      // staff-column filter here would hide appointments the header is counting.
      if (staff.length === 0) {
        return [
          {
            key: 'all',
            staffUserId: undefined,
            title: 'All appointments',
            subtitle: 'Solo view',
            date,
            all: true,
          },
        ]
      }

      const known = new Set(staff.map((member) => member.userId))
      const columns: GridColumn[] = staff.map((member) => ({
        key: member.userId,
        staffUserId: member.userId,
        title: member.fullName,
        subtitle: member.email,
        date,
      }))

      // A booking can be unassigned, or still point at a staff member who is no longer
      // in the bucket. Those rows must stay visible somewhere, so they get their own
      // column instead of disappearing.
      const hasOrphans = dayRows.some(
        (row) => !row.staffUserId || !known.has(row.staffUserId),
      )
      if (hasOrphans) {
        columns.push({
          key: 'unassigned',
          staffUserId: undefined,
          title: 'Unassigned',
          subtitle: 'No staff on the booking',
          date,
          unassigned: true,
        })
      }

      return columns
    }

    const weekStart = startOfWeek(anchor)
    return Array.from({ length: 7 }, (_, index) => {
      const date = addDays(weekStart, index)
      const rows = byDay.get(toDateValue(date)) ?? []
      return {
        key: toDateValue(date),
        staffUserId: undefined,
        title: formatDay(date),
        subtitle: `${rows.length} appt${rows.length === 1 ? '' : 's'}`,
        date,
      }
    })
  }, [mode, anchor, staff, byDay])

  const { state, setState } = drag

  /** The rows a column owns: the whole day in solo mode, one staff member otherwise. */
  const knownStaff = useMemo(() => new Set(staff.map((member) => member.userId)), [staff])
  const rowsForColumn = useCallback(
    (column: GridColumn) => {
      const dayRows = byDay.get(toDateValue(column.date)) ?? []
      if (mode === 'week' || column.all) return dayRows
      if (column.unassigned) {
        return dayRows.filter((row) => !row.staffUserId || !knownStaff.has(row.staffUserId))
      }
      return dayRows.filter((row) => row.staffUserId === column.staffUserId)
    },
    [byDay, knownStaff, mode],
  )

  // The band, in pixels. Derived from the business's hours (via `band`), not from a
  // fixed working day, so the drop target and the grid lines agree at any opening time.
  const bandMinutes = Math.max(60, band.endMinute - band.startMinute)
  const hourCount = Math.max(1, Math.round(bandMinutes / 60))
  const bandHeightPx = hourCount * HOUR_HEIGHT

  // Window-level move/up, so a fast drag that leaves the block still lands.
  useEffect(() => {
    if (!state.appointmentId) return

    const onMove = (event: PointerEvent) => {
      const dx = event.clientX - state.originX
      const dy = event.clientY - state.originY
      const active = state.active || Math.hypot(dx, dy) > 6
      if (!active) return
      setState({ ...state, active, offsetX: dx, offsetY: dy })
    }

    const onUp = (event: PointerEvent) => {
      const current = state
      setState({
        appointmentId: null,
        originX: 0,
        originY: 0,
        offsetX: 0,
        offsetY: 0,
        active: false,
        overStaffId: null,
      })
      if (!current.active || !current.appointmentId) return

      const hit = [...columnRefs.current.entries()].find(([, element]) => {
        const rect = element.getBoundingClientRect()
        return event.clientX >= rect.left && event.clientX < rect.right
      })
      if (!hit) return

      const [key, element] = hit
      const target = columns.find((entry) => entry.key === key)
      if (!target) return

      const rect = element.getBoundingClientRect()
      const offsetY = event.clientY - rect.top
      const minutes = Math.round((offsetY / HOUR_HEIGHT) * 60)
      const snapped = Math.max(0, Math.min(bandMinutes - 15, Math.round(minutes / 15) * 15))

      const start = startOfDay(target.date)
      start.setHours(0, 0, 0, 0)
      start.setMinutes(band.startMinute + snapped)

      onReschedule({ appointmentId: current.appointmentId, start, staffUserId: target.staffUserId })
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [state, setState, columns, onReschedule, band, bandMinutes])

  const minutesNow = zonedMinuteOfDay(now, zone)
  const nowTop = ((minutesNow - band.startMinute) / 60) * HOUR_HEIGHT
  const showNowLine = nowTop >= 0 && nowTop <= bandHeightPx

  return (
    <div
      ref={scrollRef}
      className="max-h-[calc(100dvh-17rem)] min-h-[24rem] overflow-auto"
    >
      <div
        className="grid"
        style={{
          gridTemplateColumns: `3.6rem repeat(${columns.length}, minmax(${
            mode === 'day' ? '12.5rem' : '9.5rem'
          }, 1fr))`,
        }}
      >
        <div className="sticky top-0 left-0 z-30 border-b border-line bg-hover" aria-hidden="true" />

        {columns.map((column) => {
          const isToday = mode === 'week' && toDateValue(column.date) === todayKey
          const rows = rowsForColumn(column)
          const count = rows.filter((row) => row.status !== 'cancelled').length
          const member = staff.find((entry) => entry.userId === column.key)
          // The business's real hours for this column's day. "Closed" is only ever
          // claimed when the hours are actually known — an unanswered read must not
          // be drawn as a closure.
          const schedule = resolveDaySchedule(hours, column.date)
          const closed = Boolean(hours) && schedule.isClosed
          const hoursLabel = schedule.periods
            .map((period) => `${minuteToClock(period.openMinute)}–${minuteToClock(period.closeMinute)}`)
            .join(', ')

          return (
            <div
              key={column.key}
              className={cn(
                'sticky top-0 z-20 min-w-0 border-b border-l border-line bg-hover px-[0.7rem] py-[0.6rem]',
                isToday && 'text-accent',
              )}
            >
              <div className="flex min-w-0 items-center gap-[0.55rem]">
                {mode === 'day' && member ? (
                  <Avatar
                    size="sm"
                    name={member.fullName}
                    src={member.avatarUrl ?? undefined}
                    decorative
                  />
                ) : null}
                <div className="min-w-0">
                  {mode === 'week' && onOpenDay ? (
                    // The day header IS the drill-down: one tap opens that day's
                    // schedule with the same date the column was showing.
                    <button
                      type="button"
                      onClick={() => onOpenDay(column.date)}
                      aria-label={`Open ${formatDay(column.date)}`}
                      className="block w-full min-w-0 text-left focus-visible:shadow-ring focus-visible:outline-none"
                    >
                      <b className="block truncate text-label">{column.title}</b>
                      <small
                        className={cn(
                          'block truncate text-caption',
                          closed ? 'font-semibold text-subtle' : 'text-muted',
                        )}
                      >
                        {closed ? 'Closed' : `${column.subtitle} · ${hoursLabel}`}
                      </small>
                    </button>
                  ) : (
                    <>
                      <b className="block truncate text-label">{column.title}</b>
                      <small className="block truncate text-caption text-muted">
                        {mode === 'day'
                          ? `${column.subtitle} · ${count} appt${count === 1 ? '' : 's'}${
                              closed ? ' · closed' : ''
                            }`
                          : column.subtitle}
                      </small>
                    </>
                  )}
                </div>
              </div>
            </div>
          )
        })}

        <div className="sticky left-0 z-10 bg-surface">
          {Array.from({ length: hourCount }, (_, index) => (
            <div
              key={index}
              className="pr-[0.5rem] text-right text-caption text-muted tabular"
              style={{ height: HOUR_HEIGHT }}
            >
              {minuteToClock(band.startMinute + index * 60)}
            </div>
          ))}
        </div>

        {columns.map((column) => {
          const rows = rowsForColumn(column)
          const positioned = positionEvents(rows)
          const closed = Boolean(hours) && resolveDaySchedule(hours, column.date).isClosed

          return (
            <div
              key={column.key}
              ref={(element) => {
                if (element) columnRefs.current.set(column.key, element)
                else columnRefs.current.delete(column.key)
              }}
              className="relative border-l border-line"
              style={{ height: bandHeightPx }}
            >
              {closed ? (
                // A closed day still renders the grid — appointments booked on a
                // non-working day (if the domain ever allows one) must not vanish —
                // but the column is visually muted and clicking it will not offer a
                // slot the business has said it is shut for.
                <div
                  className="pointer-events-none absolute inset-0 z-[1] bg-sunken/60"
                  aria-hidden="true"
                >
                  <span className="absolute top-[0.4rem] left-1/2 -translate-x-1/2 rounded-pill bg-surface px-[0.5rem] py-[0.1rem] text-caption font-semibold text-subtle shadow-sm">
                    Closed
                  </span>
                </div>
              ) : (
                <button
                  type="button"
                  tabIndex={-1}
                  aria-hidden="true"
                  className="absolute inset-0 cursor-cell focus:outline-none"
                  onClick={(event) => {
                    const rect = event.currentTarget.getBoundingClientRect()
                    const minutes =
                      Math.round(((event.clientY - rect.top) / HOUR_HEIGHT) * 60 / 15) * 15
                    const start = startOfDay(column.date)
                    start.setHours(0, 0, 0, 0)
                    start.setMinutes(
                      band.startMinute + Math.max(0, Math.min(bandMinutes - 15, minutes)),
                    )
                    onCreateAt({ start, staffUserId: column.staffUserId })
                  }}
                />
              )}

              {positioned.map(({ row, lane, lanes }) => {
                const top = (bandOffsetMinutes(row.scheduledAt, band.startMinute, zone) / 60) * HOUR_HEIGHT
                const height = bandHeight(row.scheduledAt, row.endAt)
                const isDragging = state.appointmentId === row.id && state.active
                const canDrag =
                  mode === 'day' && row.status !== 'cancelled' && row.status !== 'completed'

                return (
                  <div
                    key={row.id}
                    className="absolute"
                    style={{
                      top,
                      height,
                      left: `calc(${(lane / lanes) * 100}% + 2px)`,
                      width: `calc(${100 / lanes}% - 4px)`,
                      transform: isDragging
                        ? `translate(${state.offsetX}px, ${state.offsetY}px)`
                        : undefined,
                      zIndex: isDragging ? 6 : 1,
                    }}
                  >
                    <EventBlock
                      row={row}
                      dragging={isDragging}
                      onSelect={() => onSelect(row.id)}
                      onPointerDown={
                        canDrag
                          ? (event) => {
                              if (event.button !== 0) return
                              setState({
                                appointmentId: row.id,
                                originX: event.clientX,
                                originY: event.clientY,
                                offsetX: 0,
                                offsetY: 0,
                                active: false,
                                overStaffId: null,
                              })
                            }
                          : undefined
                      }
                    />
                  </div>
                )
              })}

              {toDateValue(column.date) === todayKey && showNowLine ? (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute right-0 left-0 z-[2] h-[2px] bg-danger"
                  style={{ top: nowTop }}
                />
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}
// APPOINTMENTS_CALENDAR_NEXT
