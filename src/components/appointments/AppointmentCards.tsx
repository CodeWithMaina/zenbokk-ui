import { MoreHorizontal } from 'lucide-react'
import { useMemo } from 'react'
import {
  addDays,
  appointmentProgress,
  appointmentReference,
  appointmentTimingLabel,
  isSameDay,
  serviceColor,
  startOfDay,
} from '../../lib/appointments'
import type { AppointmentRow } from '../../lib/appointments'
import { cn } from '../../lib/cn'
import { formatDate, formatDuration, formatTime, money } from '../../lib/format'
import { Avatar } from '../ui/avatar'
import { Menu } from '../ui/menu'
import { Progress } from '../ui/progress'
import { AppointmentStatusBadge } from './AppointmentStatusBadge'
import { AppointmentQuickActions, appointmentActionItems } from './AppointmentActions'
import type { AppointmentAction } from './AppointmentActions'

export type AppointmentCardsProps = {
  rows: readonly AppointmentRow[]
  /** Group by day when the list is ordered by time (the design's default). */
  groupByDate: boolean
  onOpen: (appointmentId: string) => void
  onAction: (action: AppointmentAction, row: AppointmentRow) => void
  busy?: boolean
}

/** `Today` / `Tomorrow` / `Yesterday` / `Monday` — the design's group headings. */
function groupHeading(dayStart: number, now: number): string {
  if (isSameDay(dayStart, now)) return 'Today'
  if (isSameDay(dayStart, addDays(new Date(now), 1))) return 'Tomorrow'
  if (isSameDay(dayStart, addDays(new Date(now), -1))) return 'Yesterday'
  return new Intl.DateTimeFormat('en-GB', { weekday: 'long' }).format(new Date(dayStart))
}

/**
 * Card view — the phone-first presentation.
 *
 * Cards group by day when the list is ordered by time, so a scrolling reader
 * always knows which day they are in; any other sort renders one flat grid,
 * because a heading that does not match the ordering would mislead.
 */
export function AppointmentCards({
  rows,
  groupByDate,
  onOpen,
  onAction,
  busy = false,
}: AppointmentCardsProps) {
  const now = Date.now()

  const groups = useMemo(() => {
    if (!groupByDate) return [{ key: 'all', heading: null as string | null, date: null, rows }]

    const map = new Map<number, AppointmentRow[]>()
    for (const row of rows) {
      const key = startOfDay(new Date(row.scheduledAt)).getTime()
      const bucket = map.get(key)
      if (bucket) bucket.push(row)
      else map.set(key, [row])
    }

    return [...map.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([key, dayRows]) => ({
        key: String(key),
        heading: groupHeading(key, now),
        date: key,
        rows: dayRows,
      }))
  }, [rows, groupByDate, now])

  return (
    <div className="grid gap-[1.3rem]" aria-busy={busy || undefined}>
      {groups.map((group) => (
        <section key={group.key}>
          {group.heading ? (
            <div className="sticky top-0 z-[3] flex items-baseline gap-[0.6rem] bg-bg py-[0.5rem]">
              <b className="text-label">{group.heading}</b>
              <span className="text-meta text-muted">
                {group.date === null ? '' : formatDate(new Date(group.date))}
              </span>
              <span className="ml-auto text-meta text-muted tabular">
                {group.rows.length} appointment{group.rows.length === 1 ? '' : 's'}
              </span>
            </div>
          ) : null}

          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,19rem),1fr))] gap-[0.7rem]">
            {group.rows.map((row) => (
              <AppointmentCard
                key={row.id}
                row={row}
                showDate={!groupByDate}
                now={now}
                onOpen={() => onOpen(row.id)}
                onAction={(action) => onAction(action, row)}
                busy={busy}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

/** A single appointment card. */
function AppointmentCard({
  row,
  showDate,
  now,
  onOpen,
  onAction,
  busy,
}: {
  row: AppointmentRow
  showDate: boolean
  now: number
  onOpen: () => void
  onAction: (action: AppointmentAction) => void
  busy: boolean
}) {
  const color = serviceColor(row.serviceId)
  const progress = appointmentProgress(row, now)
  const dimmed = row.status === 'cancelled'
  const showActions = row.status === 'booked' || row.status === 'confirmed'

  return (
    <article
      className={cn(
        'relative flex flex-col gap-[0.8rem] rounded-card border border-line bg-surface p-[1.05rem] transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-[2px] hover:border-muted hover:shadow-raised',
        dimmed && 'opacity-65',
      )}
    >
      <span
        aria-hidden="true"
        className="absolute top-[-1px] left-[1.05rem] h-[3px] w-[2.8rem] rounded-b-xs"
        style={{ backgroundColor: color }}
      />

      <div className="flex items-start justify-between gap-[0.6rem] pt-[0.2rem]">
        <div className="min-w-0">
          <p className="text-metric leading-[1.1] font-semibold tracking-snug tabular">
            {formatTime(row.scheduledAt)}
            <small className="ml-[0.35rem] text-label font-medium text-muted">
              – {formatTime(row.endAt)}
            </small>
          </p>
          <p className="text-meta text-muted">
            {showDate ? `${formatDate(row.scheduledAt)} · ` : ''}
            {appointmentTimingLabel(row, now)}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-[0.2rem]">
          <AppointmentStatusBadge status={row.status} />
          <Menu
            items={appointmentActionItems(row.status, onAction)}
            triggerLabel={`Actions for ${row.customerName} (${appointmentReference(row.id)})`}
            trigger={<MoreHorizontal className="size-4" aria-hidden="true" />}
          />
        </div>
      </div>

      {progress !== null ? (
        <Progress
          value={progress}
          ariaLabel={`${progress}% of this appointment has elapsed`}
          barClassName="bg-fg"
        />
      ) : null}

      <div
        className="flex min-w-0 items-center gap-[0.55rem] rounded-lg px-[0.8rem] py-[0.55rem]"
        style={{ backgroundColor: `color-mix(in srgb, ${color} 11%, var(--surface))` }}
      >
        <span aria-hidden="true" className="size-[0.6rem] shrink-0 rounded-round" style={{ backgroundColor: color }} />
        <b className="min-w-0 truncate font-semibold">{row.serviceName}</b>
        <span className="ml-auto shrink-0 text-meta text-muted">
          {formatDuration(row.durationMinutes)}
        </span>
      </div>

      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 items-center gap-[0.7rem] text-left focus-visible:shadow-ring focus-visible:outline-none"
      >
        <Avatar name={row.customerName} decorative />
        <span className="min-w-0 flex-1">
          <span className={cn('block truncate font-semibold', dimmed && 'line-through')}>
            {row.customerName}
          </span>
          <span className="block truncate text-caption text-muted">
            {row.customerPhone ?? row.customerEmail ?? 'No contact'}
          </span>
        </span>
      </button>

      <div className="flex flex-wrap items-center justify-between gap-[0.6rem] border-t border-dashed border-line pt-[0.7rem]">
        <span className="flex items-center gap-[0.5rem] text-meta">
          {row.staffName ? (
            <>
              <Avatar size="sm" name={row.staffName} decorative />
              <span className="min-w-0 truncate">{row.staffName}</span>
            </>
          ) : (
            <span className="text-muted">Unassigned</span>
          )}
        </span>
        <b className="font-bold tabular">{row.price === null ? '—' : money(row.price)}</b>
      </div>

      {showActions ? (
        <AppointmentQuickActions status={row.status} onAction={onAction} disabled={busy} />
      ) : null}
    </article>
  )
}
