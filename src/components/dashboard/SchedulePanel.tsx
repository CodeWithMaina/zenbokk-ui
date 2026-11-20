import { Link } from '@tanstack/react-router'
import { CalendarClock, CalendarDays, ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { useState } from 'react'
import type { AppointmentDashboardItem } from '../../lib/api/types'
import { paymentStatusLabel } from '../../lib/appointments/types'
import { addDaysToDateKey } from '../../lib/appointments/timezone'
import { cn } from '../../lib/cn'
import { appointmentStatusLabel } from '../../lib/dashboard/appointment-status'
import {
  appointmentValue,
  clockInZone,
  countByStatus,
  dateKeyChip,
  dateKeyLabel,
  dayBand,
  minutesInZone,
  nextUp,
  scheduleBreakdown,
  scheduleStatus,
  staffColumns,
} from '../../lib/dashboard/schedule'
import { formatDuration, formatNumber, money } from '../../lib/format'
import { Avatar } from '../ui/avatar'
import { StatusPill } from '../ui/badge'
import { SectionCard } from '../ui/card'
import { EmptyState } from '../ui/empty-state'
import { SegmentedControl } from '../ui/segmented-control'
import { Skeleton } from '../ui/skeleton'

/** The gutter that carries the hour labels; one hour is `--dash-hour` tall (CSS). */
const GUTTER = '2.4rem'

export type SchedulePanelProps = {
  items: readonly AppointmentDashboardItem[]
  /** The day on screen, as a business-local `yyyy-MM-dd` key. */
  dayKey: string
  /** The business's today, in the same key form. */
  todayKey: string
  /** The business timezone every clock in this card is read in. */
  timeZone: string
  /** The live instant (refreshed by the caller) — drives "Now" and "next up". */
  now: Date
  loading?: boolean
  error?: string | null
  /** The caller's role may move a booking to confirmed. */
  canConfirm?: boolean
  /** The appointment whose confirmation is in flight. */
  confirmingId?: string | null
  /** Which shape to open in. Calendar is the dashboard's default. */
  initialView?: ScheduleView
  onConfirm: (item: AppointmentDashboardItem) => void
  onDayChange: (dayKey: string) => void
  /** Jump back to today, offered only while another day is on screen. */
  onToday?: () => void
  className?: string
}

type ScheduleView = 'list' | 'calendar'

/**
 * The day's schedule, in the two shapes the reference offers.
 *
 * **Calendar is the default**: the day as a staff grid is the fastest way to see
 * where the gaps are, and the list stays one tap away for a chronological read.
 * Both views answer from the same rows, on the same business-local day, so the
 * switch changes the shape of the answer and never the question.
 *
 * Every clock here is the business's, not the browser's: the caller passes the
 * zone the scheduling domain publishes, and each instant is formatted in it.
 * Confirming a booking is the only write, and it goes through the appointments
 * module's own mutation — this card has no private notion of a legal transition.
 */
export function SchedulePanel({
  items,
  dayKey,
  todayKey,
  timeZone,
  now,
  loading = false,
  error = null,
  canConfirm = false,
  confirmingId = null,
  initialView = 'calendar',
  onConfirm,
  onDayChange,
  onToday,
  className,
}: SchedulePanelProps) {
  const [view, setView] = useState<ScheduleView>(initialView)

  const isToday = dayKey === todayKey
  const completed = countByStatus(items, ['completed'])
  const next = nextUp(items, now)
  const groups = scheduleBreakdown(items)

  const description = loading
    ? 'Reading the day…'
    : items.length === 0
      ? `${isToday ? 'Today' : dateKeyLabel(dayKey)} · nothing booked`
      : `${isToday ? '' : `${dateKeyLabel(dayKey)} · `}${completed} of ${formatNumber(
          items.length,
        )} completed${next ? ` · next at ${clockInZone(next.scheduledAt, timeZone)}` : ''}`

  return (
    <SectionCard
      icon={<CalendarDays />}
      iconTone="success"
      title={isToday ? 'Today’s schedule' : 'Schedule'}
      description={description}
      titleClassName="font-display font-normal"
      className={cn('min-w-0 p-[clamp(0.7rem,1vw,1rem)]', className)}
      contentClassName="mt-[0.65rem]"
      action={
        <div className="flex items-center gap-[0.5rem]">
          {!isToday && onToday ? (
            <button
              type="button"
              onClick={onToday}
              className="link text-meta font-semibold whitespace-nowrap"
            >
              Today
            </button>
          ) : null}
          <SegmentedControl
            label="Schedule view"
            value={view}
            onValueChange={setView}
            options={[
              { value: 'calendar', label: 'Calendar' },
              { value: 'list', label: 'List' },
            ]}
          />
        </div>
      }
    >
      {error ? (
        <p className="mb-[0.6rem] text-meta font-semibold text-danger-ink" role="alert">
          {error}
        </p>
      ) : null}

      {view === 'calendar' ? (
        <WeekStrip dayKey={dayKey} todayKey={todayKey} onDayChange={onDayChange} />
      ) : null}

      {items.length > 0 ? (
        <>
          <div className="dash-status-bar" role="img" aria-label={statusSummary(groups)}>
            {groups.map((group) => (
              <i
                key={group.key}
                data-status={group.status}
                style={{ flexGrow: group.count }}
                className="bg-st-solid"
              />
            ))}
          </div>
          <div className="dash-legend">
            {groups.map((group) => (
              <span key={group.key} data-status={group.status}>
                <b className="bg-st-solid" aria-hidden="true" />
                {group.count} {group.label}
              </span>
            ))}
          </div>
        </>
      ) : null}

      {loading ? (
        <div className="grid gap-[0.4rem]" aria-busy="true" aria-label="Loading the schedule">
          <Skeleton className="h-[3.2rem] rounded-lg" />
          <Skeleton className="h-[3.2rem] rounded-lg" />
          <Skeleton className="h-[3.2rem] rounded-lg" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<CalendarClock className="size-5" />}
          title={isToday ? 'Nothing booked today' : 'Nothing booked for this day'}
          description={
            isToday
              ? 'Quiet day. Share your booking link so regulars can fill the gaps.'
              : 'Choose another day above, or open the full week in Appointments.'
          }
          action={
            <Link to="/dashboard/appointments" className="btn btn-ghost no-underline">
              Open appointments
              <ChevronRight className="size-[0.9rem]" aria-hidden="true" />
            </Link>
          }
        />
      ) : view === 'calendar' ? (
        <ScheduleCalendar
          items={items}
          dayKey={dayKey}
          todayKey={todayKey}
          now={now}
          timeZone={timeZone}
        />
      ) : (
        <ScheduleList
          items={items}
          now={now}
          isToday={isToday}
          timeZone={timeZone}
          nextId={next?.id ?? null}
          canConfirm={canConfirm}
          confirmingId={confirmingId}
          onConfirm={onConfirm}
        />
      )}
    </SectionCard>
  )
}

/** One sentence for the status bar's screen-reader label. */
function statusSummary(groups: ReturnType<typeof scheduleBreakdown>): string {
  return groups.map((group) => `${group.count} ${group.label}`).join(', ')
}


/** The rolling week around today, so the strip always shows the current week. */
function WeekStrip({
  dayKey,
  todayKey,
  onDayChange,
}: {
  dayKey: string
  todayKey: string
  onDayChange: (dayKey: string) => void
}) {
  const start = addDaysToDateKey(todayKey, -2)
  const days = Array.from({ length: 7 }, (_, index) => addDaysToDateKey(start, index))

  return (
    <div className="dash-week" role="group" aria-label="Choose a day">
      {days.map((key) => {
        const chip = dateKeyChip(key)
        const selected = key === dayKey
        const current = key === todayKey
        return (
          <button
            key={key}
            type="button"
            aria-pressed={selected}
            aria-label={dateKeyLabel(key)}
            onClick={() => onDayChange(key)}
            className={cn(
              'dash-week-day',
              current && 'is-today',
              selected && 'is-on',
            )}
          >
            <small>{chip.weekday}</small>
            <b>{chip.day}</b>
          </button>
        )
      })}
    </div>
  )
}

function ScheduleList({
  items,
  now,
  isToday,
  timeZone,
  nextId,
  canConfirm,
  confirmingId,
  onConfirm,
}: {
  items: readonly AppointmentDashboardItem[]
  now: Date
  isToday: boolean
  timeZone: string
  nextId: string | null
  canConfirm: boolean
  confirmingId: string | null
  onConfirm: (item: AppointmentDashboardItem) => void
}) {
  const sorted = [...items].sort(
    (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
  )

  const rows: ReactNode[] = []
  let placedNow = false

  for (const item of sorted) {
    if (isToday && !placedNow && new Date(item.scheduledAt).getTime() > now.getTime()) {
      rows.push(<NowRow key="now" now={now} timeZone={timeZone} />)
      placedNow = true
    }

    rows.push(
      <ScheduleRow
        key={item.id}
        item={item}
        timeZone={timeZone}
        isNext={item.id === nextId}
        canConfirm={canConfirm}
        confirming={confirmingId === item.id}
        onConfirm={onConfirm}
      />,
    )
  }

  if (isToday && !placedNow) rows.push(<NowRow key="now" now={now} timeZone={timeZone} />)

  return <ul className="dash-tl">{rows}</ul>
}

function ScheduleRow({
  item,
  timeZone,
  isNext,
  canConfirm,
  confirming,
  onConfirm,
}: {
  item: AppointmentDashboardItem
  timeZone: string
  isNext: boolean
  canConfirm: boolean
  confirming: boolean
  onConfirm: (item: AppointmentDashboardItem) => void
}) {
  const durationMinutes =
    (new Date(item.endAt).getTime() - new Date(item.scheduledAt).getTime()) / 60_000
  const value = appointmentValue(item)
  const pending = item.status === 'booked' || item.status === 'pending_payment'
  const status = scheduleStatus(item.status)

  return (
    <li className={cn('dash-ti', isNext && 'is-next')} data-status={status}>
      <span className="dash-ti-time">
        {clockInZone(item.scheduledAt, timeZone)}
        <small>{formatDuration(durationMinutes)}</small>
      </span>
      <span className="dash-ti-rail" aria-hidden="true">
        <i />
      </span>
      <div className="dash-ti-body">
        <b className="text-label">
          <Link
            to="/dashboard/appointments/$appointmentId"
            params={{ appointmentId: item.id }}
            className="dash-ti-name"
          >
            {item.customerName}
          </Link>
          {isNext ? <em className="dash-ti-next">NEXT UP</em> : null}
        </b>
        <span className="block text-meta text-muted">
          {item.serviceName}
          {item.staffName ? ` · ${item.staffName.split(' ')[0]}` : ''}
        </span>
        {pending ? (
          <span className="mt-[0.1rem] flex items-center gap-[0.7rem]">
            {canConfirm ? (
              <button
                type="button"
                className="link text-caption font-semibold text-accent"
                onClick={() => onConfirm(item)}
                disabled={confirming}
              >
                {confirming ? 'Confirming…' : 'Confirm'}
              </button>
            ) : null}
            <Link
              to="/dashboard/appointments/$appointmentId"
              params={{ appointmentId: item.id }}
              className="link text-caption font-semibold text-accent"
            >
              Open
            </Link>
          </span>
        ) : null}
      </div>
      <div className="dash-ti-side">
        <StatusPill status={status}>{appointmentStatusLabel(item.status)}</StatusPill>
        {value !== null ? <small>{money(value)}</small> : null}
        {item.paymentStatus ? <small>{paymentStatusLabel(item.paymentStatus)}</small> : null}
      </div>
    </li>
  )
}

/** Where the day has got to. Only drawn for the live day. */
function NowRow({ now, timeZone }: { now: Date; timeZone: string }) {
  return (
    <li className="dash-ti dash-ti-now">
      <span className="dash-ti-time">{clockInZone(now, timeZone)}</span>
      <span className="dash-ti-rail" aria-hidden="true">
        <i />
      </span>
      <div className="dash-ti-now-row">Now</div>
    </li>
  )
}


/**
 * The day as a staff-column grid.
 *
 * The band comes from the day's own bookings (`dayBand`), so an early start or a
 * late finish widens the grid instead of being clipped; the columns are the staff
 * who actually have work (`staffColumns`). The staff header is sticky inside the
 * scroller, so names stay readable while the hours scroll, and the whole grid
 * scrolls sideways below `min-width` rather than squeezing five columns into a
 * phone.
 */
function ScheduleCalendar({
  items,
  dayKey,
  todayKey,
  now,
  timeZone,
}: {
  items: readonly AppointmentDashboardItem[]
  dayKey: string
  todayKey: string
  now: Date
  timeZone: string
}) {
  const { startHour, endHour } = dayBand(items, timeZone)
  const columns = staffColumns(items)
  const hours = Array.from(
    { length: endHour - startHour },
    (_, index) => startHour + index,
  )
  const gridTemplateColumns = `${GUTTER} repeat(${columns.length}, minmax(6.5rem, 1fr))`
  const bandHeight = `calc(${endHour - startHour} * var(--dash-hour))`

  const isToday = dayKey === todayKey
  const nowMinutes = minutesInZone(now, timeZone) - startHour * 60
  const showNow = isToday && nowMinutes >= 0 && nowMinutes <= (endHour - startHour) * 60

  return (
    <div className="dash-cal">
      <div className="dash-cal-inner">
        <div className="dash-cal-head" style={{ gridTemplateColumns }}>
          <span aria-hidden="true" />
          {columns.map((column) => (
            <span key={column.key}>
              <Avatar
                name={column.name}
                size="sm"
                className="size-[1.4rem] text-[0.6rem]"
                decorative
              />
              {column.name.split(' ')[0]}
              <small aria-hidden="true">{column.items.length}</small>
            </span>
          ))}
        </div>

        <div className="dash-cal-body" style={{ gridTemplateColumns }}>
          <div className="dash-cal-hours" aria-hidden="true">
            {hours.map((hour) => (
              <span key={hour}>{hour}:00</span>
            ))}
          </div>

          {columns.map((column) => (
            <div key={column.key} className="dash-cal-col" style={{ height: bandHeight }}>
              {column.items.map((item) => {
                const offset = minutesInZone(item.scheduledAt, timeZone) - startHour * 60
                const duration =
                  (new Date(item.endAt).getTime() - new Date(item.scheduledAt).getTime()) / 60_000
                const top = Math.max(0, offset) / 60

                return (
                  <Link
                    key={item.id}
                    to="/dashboard/appointments/$appointmentId"
                    params={{ appointmentId: item.id }}
                    className="dash-cal-event"
                    data-status={scheduleStatus(item.status)}
                    title={`${clockInZone(item.scheduledAt, timeZone)} · ${item.customerName} · ${item.serviceName}`}
                    style={{
                      top: `calc(${top.toFixed(3)} * var(--dash-hour))`,
                      height: `calc(${(duration / 60).toFixed(3)} * var(--dash-hour) - 0.12rem)`,
                    }}
                  >
                    <b>{item.customerName}</b>
                    <span>
                      {clockInZone(item.scheduledAt, timeZone)} · {item.serviceName}
                    </span>
                  </Link>
                )
              })}
            </div>
          ))}

          {showNow ? (
            <div
              className="dash-cal-now"
              aria-hidden="true"
              style={{ top: `calc(${(nowMinutes / 60).toFixed(3)} * var(--dash-hour))` }}
            >
              <span className="dash-cal-now-label">{clockInZone(now, timeZone)}</span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

