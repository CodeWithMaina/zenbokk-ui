import { CalendarClock } from 'lucide-react'
import { useMemo } from 'react'
import type { AppointmentDashboardItem, ServiceDashboardItem } from '../../lib/api/types'
import { browserTimeZone, addDaysToDateKey, resolveTimeZone, zonedDateKey } from '../../lib/appointments'
import {
  appointmentStatusLabel,
  appointmentStatusTone,
} from '../../lib/dashboard/appointment-status'
import { cn } from '../../lib/cn'
import { formatDate, formatTime, money } from '../../lib/format'
import { AppointmentCard } from '../ui/appointment-card'
import { Badge } from '../ui/badge'
import type { Tone } from '../ui/badge'
import { Button } from '../ui/button'
import { ClientAppointmentPayment } from './ClientAppointmentPayment'

export type ClientAppointmentTimelineProps = {
  rows: readonly AppointmentDashboardItem[]
  /** The business's service bucket, used for each row's duration and price. */
  services: Map<string, ServiceDashboardItem>
  /** Business timezone instant dates are grouped by. Defaults to the browser's. */
  timeZone?: string | null
  onOpenAppointment?: (appointmentId: string) => void
  /** Payments module access, so a row only offers payment detail when it can load. */
  paymentsEnabled?: boolean
  hasMore?: boolean
  loadingMore?: boolean
  onLoadMore?: () => void
}

/** Payment state of an appointment, from the aggregate the list already carries. */
const PAYMENT_CHIP: Record<string, { label: string; tone: Tone }> = {
  paid: { label: 'Paid', tone: 'success' },
  partially_paid: { label: 'Partly paid', tone: 'warning' },
  awaiting_verification: { label: 'Payment to verify', tone: 'warning' },
  unpaid: { label: 'Unpaid', tone: 'neutral' },
  failed: { label: 'Payment failed', tone: 'danger' },
  refunded: { label: 'Refunded', tone: 'neutral' },
}

export function appointmentPaymentChip(
  status: string | undefined,
): { label: string; tone: Tone } | null {
  if (!status) return null
  return PAYMENT_CHIP[status] ?? { label: status.replace(/_/g, ' '), tone: 'neutral' }
}

const WEEKDAY = new Intl.DateTimeFormat('en-GB', { weekday: 'long' })

/** A business-local `yyyy-MM-dd` key read back as a plain calendar date. */
function dateFromKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year, (month ?? 1) - 1, day ?? 1)
}

type DayGroup = { key: string; rows: AppointmentDashboardItem[] }

/** Group newest-day-first, and newest appointment first inside each day. */
function buildGroups(rows: readonly AppointmentDashboardItem[], zone: string): DayGroup[] {
  const map = new Map<string, AppointmentDashboardItem[]>()
  for (const row of rows) {
    const key = zonedDateKey(row.scheduledAt, zone)
    const bucket = map.get(key)
    if (bucket) bucket.push(row)
    else map.set(key, [row])
  }

  return [...map.entries()]
    .sort(([a], [b]) => (a < b ? 1 : a > b ? -1 : 0))
    .map(([key, group]) => ({
      key,
      rows: [...group].sort(
        (a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime(),
      ),
    }))
}

function relativeDayLabel(key: string, todayKey: string): string {
  if (key === todayKey) return 'Today'
  if (key === addDaysToDateKey(todayKey, -1)) return 'Yesterday'
  return WEEKDAY.format(dateFromKey(key))
}


/**
 * A client's appointment history as a date-grouped timeline.
 *
 * The newest day is at the top and the newest appointment at the top of its day —
 * the order the list endpoint is asked for. Each day is a marker on the spine, and
 * every appointment reuses the shared `AppointmentCard`, so the history reads with
 * the same vocabulary as the rest of the appointments module (status pill, staff,
 * service lines, price) rather than inventing a second visual system.
 *
 * Days are keyed in the BUSINESS timezone, so a late-evening booking groups under
 * the day the business was open for rather than the viewer's device day.
 */
export function ClientAppointmentTimeline({
  rows,
  services,
  timeZone,
  onOpenAppointment,
  paymentsEnabled = false,
  hasMore = false,
  loadingMore = false,
  onLoadMore,
}: ClientAppointmentTimelineProps) {
  const zone = useMemo(
    () => resolveTimeZone(timeZone ?? undefined, browserTimeZone()),
    [timeZone],
  )
  const todayKey = useMemo(() => zonedDateKey(new Date(), zone), [zone])
  const groups = useMemo(() => buildGroups(rows, zone), [rows, zone])

  return (
    <div className="flex flex-col gap-[0.9rem]">
      <ol className="m-0 flex list-none flex-col gap-[1.15rem] p-0">
        {groups.map((group) => {
          const day = dateFromKey(group.key)
          const count = group.rows.length
          const dayTotal = group.rows.reduce(
            (sum, row) => sum + (services.get(row.serviceId)?.price ?? 0),
            0,
          )

          return (
            <li key={group.key}>
              <div className="mb-[0.55rem] flex items-center gap-[0.7rem]">
                <span className="grid size-[2.4rem] shrink-0 place-items-center rounded-round border border-line bg-hover leading-none">
                  <b className="text-label font-bold tabular">{day.getDate()}</b>
                  <span className="text-[0.58rem] font-semibold tracking-caps text-muted uppercase">
                    {day.toLocaleDateString('en-GB', { month: 'short' })}
                  </span>
                </span>
                <div className="min-w-0">
                  <p className="text-label font-semibold">
                    {relativeDayLabel(group.key, todayKey)}
                  </p>
                  <p className="text-caption text-muted">
                    {formatDate(day)} · {count} appointment{count === 1 ? '' : 's'}
                    {dayTotal > 0 ? ` · ${money(dayTotal)}` : ''}
                  </p>
                </div>
              </div>

              <ul className="m-0 ml-[1.2rem] flex list-none flex-col gap-[0.6rem] border-l border-line p-0 pl-[0.9rem]">
                {group.rows.map((row) => {
                  const service = services.get(row.serviceId)
                  const chip = appointmentPaymentChip(row.paymentStatus)

                  return (
                    <li key={row.id} className="min-w-0">
                      <AppointmentCard
                        appointment={{
                          id: row.id,
                          day: String(new Date(row.scheduledAt).getDate()),
                          month: new Date(row.scheduledAt).toLocaleDateString('en-GB', {
                            month: 'short',
                          }),
                          weekday: formatDate(new Date(row.scheduledAt)),
                          time: `${formatTime(row.scheduledAt)}–${formatTime(row.endAt)}`,
                          status: row.status,
                          statusLabel: appointmentStatusLabel(row.status),
                          statusTone: appointmentStatusTone(row.status),
                          staff: row.staffName
                            ? `With ${row.staffName}`
                            : 'No staff assigned',
                          services: [
                            {
                              name: row.serviceName,
                              duration: service?.durationMinutes,
                              price: service?.price,
                            },
                          ],
                        }}
                        onOpen={
                          onOpenAppointment ? () => onOpenAppointment(row.id) : undefined
                        }
                      />

                      {chip || typeof row.amountPaid === 'number' ? (
                        <div className="mt-[0.35rem] flex flex-wrap items-center gap-[0.5rem] pl-[0.1rem]">
                          {chip ? <Badge tone={chip.tone}>{chip.label}</Badge> : null}
                          {typeof row.amountPaid === 'number' && row.amountPaid > 0 ? (
                            <span className="text-caption text-muted tabular">
                              {money(row.amountPaid)} received
                            </span>
                          ) : null}
                          {typeof row.balance === 'number' && row.balance > 0 ? (
                            <span className="text-caption text-muted tabular">
                              {money(row.balance)} outstanding
                            </span>
                          ) : null}
                        </div>
                      ) : null}

                      <ClientAppointmentPayment
                        appointmentId={row.id}
                        enabled={paymentsEnabled}
                      />
                    </li>
                  )
                })}
              </ul>
            </li>
          )
        })}
      </ol>

      {hasMore ? (
        <Button
          variant="ghost"
          className={cn('self-center', loadingMore && 'opacity-70')}
          disabled={loadingMore}
          onClick={onLoadMore}
        >
          <CalendarClock className="size-4" aria-hidden="true" />
          {loadingMore ? 'Loading…' : 'Load earlier appointments'}
        </Button>
      ) : null}
    </div>
  )
}
