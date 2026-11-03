import { CalendarX2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import type { StaffDashboardItem } from '../../lib/api/types'
import {
  addDays,
  calendarWindow,
  isSameDay,
  serviceColor,
  startOfDay,
  startOfWeek,
  toDateValue,
} from '../../lib/appointments'
import type { AppointmentRow, CalendarMode } from '../../lib/appointments'
import { cn } from '../../lib/cn'
import { formatDay, formatTime } from '../../lib/format'
import { Avatar } from '../ui/avatar'
import { EmptyState } from '../ui/empty-state'

/** The visible band of the day, and how tall one hour is drawn. */
export const DAY_START_HOUR = 8
export const DAY_END_HOUR = 20
const HOUR_HEIGHT = 56
const BAND_MINUTES = (DAY_END_HOUR - DAY_START_HOUR) * 60
const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

/** Minutes from the top of the band, clamped to it. */
function bandOffsetMinutes(iso: string): number {
  const date = new Date(iso)
  return (date.getHours() - DAY_START_HOUR) * 60 + date.getMinutes()
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
  busy = false,
}: AppointmentCalendarProps) {
  const now = useNow()
  const scrollRef = useRef<HTMLDivElement>(null)
  const drag = useDragState()

  const byDay = useMemo(() => {
    const map = new Map<number, AppointmentRow[]>()
    for (const row of rows) {
      const key = startOfDay(new Date(row.scheduledAt)).getTime()
      const bucket = map.get(key)
      if (bucket) bucket.push(row)
      else map.set(key, [row])
    }
    return map
  }, [rows])

  // Keep the band scrolled to the working day rather than to midnight.
  useEffect(() => {
    if (mode === 'month' || !scrollRef.current) return
    const current = bandOffsetMinutes(new Date().toISOString())
    scrollRef.current.scrollTop = Math.max(0, ((current - 60) / 60) * HOUR_HEIGHT)
  }, [mode, anchor])

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
      {mode === 'month' ? (
        <MonthGrid
          anchor={anchor}
          byDay={byDay}
          now={now}
          onSelect={onSelect}
          onSelectDate={onSelectDate}
        />
      ) : (
        <TimeGrid
          mode={mode}
          anchor={anchor}
          byDay={byDay}
          staff={staff}
          now={now}
          scrollRef={scrollRef}
          onSelect={onSelect}
          onCreateAt={onCreateAt}
          onReschedule={onReschedule}
          drag={drag}
        />
      )}
    </div>
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
  now,
  onSelect,
  onSelectDate,
}: {
  anchor: Date
  byDay: ReadonlyMap<number, AppointmentRow[]>
  now: number
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
          const key = startOfDay(date).getTime()
          const dayRows = (byDay.get(key) ?? [])
            .slice()
            .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
          const outside = date.getMonth() !== month
          const today = isSameDay(date, now)

          return (
            <div
              key={key}
              className={cn(
                'min-h-[4.6rem] border-r border-b border-line p-[0.3rem] sm:min-h-[7.6rem] sm:p-[0.45rem]',
                'last:border-r-0 [&:nth-child(7n)]:border-r-0',
                outside && 'bg-hover text-muted',
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
  byDay: ReadonlyMap<number, AppointmentRow[]>
  staff: readonly StaffDashboardItem[]
  now: number
  scrollRef: React.RefObject<HTMLDivElement | null>
  onSelect: (appointmentId: string) => void
  onCreateAt: (input: { start: Date; staffUserId?: string }) => void
  onReschedule: (input: { appointmentId: string; start: Date; staffUserId?: string }) => void
  drag: { state: DragState; setState: (next: DragState) => void }
}

/** One column of the time grid. */
type GridColumn = {
  key: string
  staffUserId: string | undefined
  title: string
  subtitle: string
  date: Date
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
  scrollRef,
  onSelect,
  onCreateAt,
  onReschedule,
  drag,
}: TimeGridProps) {
  const columnRefs = useRef(new Map<string, HTMLDivElement>())

  const columns = useMemo<GridColumn[]>(() => {
    if (mode === 'day') {
      if (staff.length === 0) {
        return [
          {
            key: 'unassigned',
            staffUserId: undefined,
            title: 'Unassigned',
            subtitle: 'No staff column',
            date: startOfDay(anchor),
          },
        ]
      }
      return staff.map((member) => ({
        key: member.userId,
        staffUserId: member.userId,
        title: member.fullName,
        subtitle: member.email,
        date: startOfDay(anchor),
      }))
    }

    const weekStart = startOfWeek(anchor)
    return Array.from({ length: 7 }, (_, index) => {
      const date = addDays(weekStart, index)
      const rows = byDay.get(startOfDay(date).getTime()) ?? []
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
      const snapped = Math.max(0, Math.min(BAND_MINUTES - 15, Math.round(minutes / 15) * 15))

      const start = startOfDay(target.date)
      start.setHours(DAY_START_HOUR, 0, 0, 0)
      start.setMinutes(snapped)

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
  }, [state, setState, columns, onReschedule])

  const minutesNow = (now - startOfDay(new Date(now)).getTime()) / 60_000
  const nowTop = ((minutesNow - DAY_START_HOUR * 60) / 60) * HOUR_HEIGHT
  const showNowLine = nowTop >= 0 && nowTop <= (DAY_END_HOUR - DAY_START_HOUR) * HOUR_HEIGHT

  const bandHeightPx = (DAY_END_HOUR - DAY_START_HOUR) * HOUR_HEIGHT

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
          const isToday = mode === 'week' && isSameDay(column.date, now)
          const rows = byDay.get(startOfDay(column.date).getTime()) ?? []
          const count = rows.filter((row) => row.status !== 'cancelled').length
          const member = staff.find((entry) => entry.userId === column.key)

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
                  <Avatar size="sm" name={member.fullName} decorative />
                ) : null}
                <div className="min-w-0">
                  <b className="block truncate text-label">{column.title}</b>
                  <small className="block truncate text-caption text-muted">
                    {mode === 'day'
                      ? `${column.subtitle} · ${count} appt${count === 1 ? '' : 's'}`
                      : column.subtitle}
                  </small>
                </div>
              </div>
            </div>
          )
        })}

        <div className="sticky left-0 z-10 bg-surface">
          {Array.from({ length: DAY_END_HOUR - DAY_START_HOUR }, (_, index) => (
            <div
              key={index}
              className="pr-[0.5rem] text-right text-caption text-muted tabular"
              style={{ height: HOUR_HEIGHT }}
            >
              {String(DAY_START_HOUR + index).padStart(2, '0')}:00
            </div>
          ))}
        </div>

        {columns.map((column) => {
          const rows = (byDay.get(startOfDay(column.date).getTime()) ?? []).filter(
            (row) => mode === 'week' || row.staffUserId === column.staffUserId,
          )
          const positioned = positionEvents(rows)

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
                  start.setHours(DAY_START_HOUR, 0, 0, 0)
                  start.setMinutes(Math.max(0, Math.min(BAND_MINUTES, minutes)))
                  onCreateAt({ start, staffUserId: column.staffUserId })
                }}
              />

              {positioned.map(({ row, lane, lanes }) => {
                const top = (bandOffsetMinutes(row.scheduledAt) / 60) * HOUR_HEIGHT
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

              {isSameDay(column.date, now) && showNowLine ? (
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
