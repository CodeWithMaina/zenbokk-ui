import { ArrowLeft, Check, CreditCard, Phone } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { MODULE } from '../../lib/entitlements'
import {
  appointmentDuration,
  appointmentReference,
  appointmentTimingLabel,
  appointmentTotal,
  paymentStatusLabel,
  serviceColor,
  serviceLines,
  toAppointmentRows,
  toDateValue,
} from '../../lib/appointments'
import type { AppointmentRow } from '../../lib/appointments'
import {
  useAppointment,
  useAppointmentActivity,
  useCustomerAppointments,
  useStaffDay,
} from '../../lib/appointments'
import { cn } from '../../lib/cn'
import { useDashboardContext } from '../../lib/dashboard/dashboard-context'
import { formatDate, formatDuration, formatTime, money } from '../../lib/format'
import { useAppointmentPaymentSummary } from '../../lib/payments/api'
import { ActivityTimeline } from '../ui/activity-timeline'
import { Avatar } from '../ui/avatar'
import { StatusPill } from '../ui/badge'
import { Button } from '../ui/button'
import { Card, SectionCard } from '../ui/card'
import { DescriptionList, DescriptionRow } from '../ui/description-list'
import { Field, Textarea } from '../ui/field'
import { MetricGrid } from '../ui/metric-tile'
import { Skeleton, SkeletonText } from '../ui/skeleton'
import { AppointmentStatusBadge } from './AppointmentStatusBadge'
import { AppointmentErrorState } from './AppointmentEmptyState'
import { AppointmentQuickActions } from './AppointmentActions'
import type { AppointmentAction } from './AppointmentActions'

export type AppointmentDetailProps = {
  appointmentId: string
  /** The list row, so the header can paint before the detail request lands. */
  row: AppointmentRow | null
  onBack: () => void
  onAction: (action: AppointmentAction) => void
  onOpenAppointment: (appointmentId: string) => void
  onSaveNote: (note: string | null) => void
  noteSaving?: boolean
  noteError?: string | null
  busy?: boolean
}

const DAY_START_HOUR = 8
const DAY_END_HOUR = 20
const DAY_SPAN_MINUTES = (DAY_END_HOUR - DAY_START_HOUR) * 60

/** Status → the tone the activity feed draws its dot in. */
const ACTIVITY_TONES: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
  booked: 'warning',
  confirmed: 'success',
  completed: 'success',
  cancelled: 'danger',
  no_show: 'danger',
}

/** The design's back link above a detail page. */
function BackButton({ onBack }: { onBack: () => void }) {
  return (
    <button
      type="button"
      onClick={onBack}
      className="mb-[0.4rem] inline-flex min-h-[2.4rem] items-center gap-[0.3rem] font-medium text-muted transition-colors hover:text-fg focus-visible:shadow-ring focus-visible:outline-none"
    >
      <ArrowLeft className="size-4" aria-hidden="true" />
      Appointments
    </button>
  )
}

/**
 * Full appointment record.
 *
 * Everything on the page is persisted data: the record itself, its service
 * lines, its status history (the activity feed), the customer's other visits,
 * the staff member's day and — when the business is entitled to the payments
 * module — the server's own payment summary. Nothing is inferred from the
 * booking alone, and the payment card never claims a payment the ledger does not
 * hold.
 */
export function AppointmentDetail({
  appointmentId,
  row,
  onBack,
  onAction,
  onOpenAppointment,
  onSaveNote,
  noteSaving = false,
  noteError,
  busy = false,
}: AppointmentDetailProps) {
  const { hasModule } = useDashboardContext()
  const paymentsEnabled = hasModule(MODULE.payments)

  const detail = useAppointment(appointmentId)
  const activity = useAppointmentActivity(appointmentId)
  const appointment = detail.data ?? null

  const customerId = appointment?.customerId ?? row?.customerId ?? null
  const history = useCustomerAppointments(customerId, Boolean(customerId))

  const staffUserId = appointment?.staffUserId ?? row?.staffUserId ?? null
  const staffDayKey = appointment ? toDateValue(new Date(appointment.scheduledAt)) : ''
  const staffDay = useStaffDay(staffUserId, staffDayKey, Boolean(staffUserId) && Boolean(staffDayKey))

  const payment = useAppointmentPaymentSummary(appointmentId, paymentsEnabled)

  const [note, setNote] = useState('')
  useEffect(() => {
    setNote(appointment?.note ?? '')
  }, [appointment?.note, appointmentId])

  const lines = useMemo(() => (appointment ? serviceLines(appointment) : []), [appointment])

  const historyRows = useMemo(
    () => (history.data ? toAppointmentRows(history.data) : []),
    [history.data],
  )
  const completed = historyRows.filter((entry) => entry.status === 'completed')
  const cancelled = historyRows.filter((entry) => entry.status === 'cancelled')
  const otherVisits = historyRows.filter((entry) => entry.id !== appointmentId).slice(0, 5)

  const staffDayRows = useMemo(
    () => (staffDay.data ? toAppointmentRows(staffDay.data) : []),
    [staffDay.data],
  )

  if (detail.isError) {
    return (
      <div>
        <BackButton onBack={onBack} />
        <AppointmentErrorState error={detail.error} onRetry={() => void detail.refetch()} />
      </div>
    )
  }

  if (!appointment) {
    return (
      <div>
        <BackButton onBack={onBack} />
        <Card className="space-y-[0.9rem] p-[1.2rem]" aria-busy="true">
          <Skeleton className="h-6 w-[40%]" />
          <SkeletonText lines={3} />
        </Card>
      </div>
    )
  }

  const total = appointmentTotal(appointment)
  const duration = appointmentDuration(appointment)
  const primaryAction: AppointmentAction =
    appointment.status === 'booked'
      ? 'confirm'
      : appointment.status === 'confirmed'
        ? 'complete'
        : 'rebook'

  return (
    <div className="pb-[6rem] md:pb-0">
      <BackButton onBack={onBack} />

      <header className="flex flex-wrap items-center justify-between gap-[0.9rem] pb-[1.1rem] pt-[0.2rem]">
        <div className="flex min-w-0 flex-[1_1_20rem] items-center gap-[0.9rem]">
          <Avatar size="lg" name={row?.customerName ?? 'Customer'} decorative />
          <div className="min-w-0">
            <h1 className="truncate text-title font-bold tracking-tight">
              {row?.customerName ?? 'Appointment'}
            </h1>
            <div className="mt-[0.3rem] flex flex-wrap items-center gap-x-[0.8rem] gap-y-[0.3rem] text-meta text-muted">
              <AppointmentStatusBadge status={appointment.status} />
              <span className="tabular">{appointmentReference(appointment.id)}</span>
              {row?.customerPhone ? <span className="tabular">{row.customerPhone}</span> : null}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-[0.5rem] max-md:hidden">
          <Button variant="primary" onClick={() => onAction(primaryAction)} disabled={busy}>
            {primaryAction === 'confirm' ? (
              <Check className="size-3.5" aria-hidden="true" />
            ) : primaryAction === 'complete' ? (
              <Check className="size-3.5" aria-hidden="true" />
            ) : null}
            {primaryAction === 'confirm'
              ? 'Confirm'
              : primaryAction === 'complete'
                ? 'Mark completed'
                : 'Rebook'}
          </Button>
          <AppointmentQuickActions
            status={appointment.status}
            onAction={onAction}
            disabled={busy}
          />
        </div>
      </header>

      <div className="grid items-start gap-[1.1rem] lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-[1rem]">
          <PremiumSummary
            lines={lines}
            scheduledAt={appointment.scheduledAt}
            endAt={appointment.endAt}
            status={appointment.status}
            staffName={row?.staffName ?? null}
            timing={row ? appointmentTimingLabel(row) : ''}
          />

          <MetricGrid
            items={[
              { value: formatDuration(duration), label: 'Duration' },
              { value: money(total), label: 'Price' },
              { value: completed.length, label: 'Completed visits' },
            ]}
          />

          <SectionCard title="Details">
            <DescriptionList>
              {lines.map((line) => (
                <DescriptionRow
                  key={line.serviceCatalogItemId}
                  label={line.name}
                  value={`${formatDuration(line.durationMinutes)} · ${money(line.price)}`}
                />
              ))}
              <DescriptionRow label="Staff" value={row?.staffName ?? 'Unassigned'} />
              <DescriptionRow label="Date" value={formatDate(appointment.scheduledAt)} />
              <DescriptionRow
                label="Time"
                value={`${formatTime(appointment.scheduledAt)} – ${formatTime(appointment.endAt)}`}
              />
              <DescriptionRow label="Reminders">
                {appointment.reminderOptOut ? 'Opted out by the customer' : 'Scheduled'}
              </DescriptionRow>
            </DescriptionList>
          </SectionCard>

          <SectionCard
            title={`${(row?.staffName ?? 'Staff').split(' ')[0]}’s day`}
            description={`${staffDayRows.length} appointment${staffDayRows.length === 1 ? '' : 's'} on ${formatDate(appointment.scheduledAt)}`}
          >
            <StaffDayStrip
              rows={staffDayRows}
              highlightId={appointment.id}
              day={appointment.scheduledAt}
            />
          </SectionCard>

          <SectionCard title="Notes" description="Kept with the booking and visible to your team.">
            <Field label="Note for the team" htmlFor="appointment-detail-note">
              <Textarea
                id="appointment-detail-note"
                rows={3}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Allergies, preparation instructions, payment preference…"
              />
            </Field>
            <div className="mt-[0.6rem] flex items-center gap-[0.6rem]">
              <Button onClick={() => onSaveNote(note.trim() || null)} disabled={noteSaving}>
                {noteSaving ? 'Saving…' : 'Save note'}
              </Button>
              {noteError ? (
                <span className="text-meta font-semibold text-danger-ink" role="alert">
                  {noteError}
                </span>
              ) : null}
            </div>
          </SectionCard>
        </div>

        <div className="flex min-w-0 flex-col gap-[1rem]">
          <SectionCard title="Customer">
            <div className="flex items-center gap-[0.7rem]">
              <Avatar name={row?.customerName ?? 'Customer'} decorative />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{row?.customerName ?? 'Customer'}</p>
                <p className="truncate text-meta text-muted tabular">
                  {row?.customerPhone ?? row?.customerEmail ?? 'No contact on file'}
                </p>
              </div>
              {row?.customerPhone ? (
                <a
                  href={`tel:${row.customerPhone.replace(/\s/g, '')}`}
                  aria-label={`Call ${row.customerName}`}
                  className="btn btn-icon"
                >
                  <Phone className="size-4" aria-hidden="true" />
                </a>
              ) : null}
            </div>

            <MetricGrid
              className="mt-[0.9rem]"
              items={[
                { value: completed.length, label: 'Visits' },
                {
                  value: money(completed.reduce((sum, entry) => sum + (entry.price ?? 0), 0)),
                  label: 'Completed value',
                },
                { value: cancelled.length, label: 'Cancelled' },
              ]}
            />

            <div className="mt-[0.9rem]">
              {history.isLoading ? (
                <SkeletonText lines={3} />
              ) : otherVisits.length === 0 ? (
                <p className="text-meta text-muted">No other visits yet.</p>
              ) : (
                <ul>
                  {otherVisits.map((entry) => (
                    <li key={entry.id}>
                      <button
                        type="button"
                        onClick={() => onOpenAppointment(entry.id)}
                        className="flex w-full items-center gap-[0.7rem] border-t border-line py-[0.6rem] text-left first:border-t-0 focus-visible:shadow-ring focus-visible:outline-none"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold">{entry.serviceName}</span>
                          <span className="block text-caption text-muted tabular">
                            {formatDate(entry.scheduledAt)} · {formatTime(entry.scheduledAt)}
                          </span>
                        </span>
                        <AppointmentStatusBadge status={entry.status} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </SectionCard>

          {paymentsEnabled ? (
            <SectionCard title="Payment">
              {payment.isLoading ? (
                <SkeletonText lines={4} />
              ) : payment.isError ? (
                <p className="text-meta text-muted">
                  The payment summary could not be loaded for this appointment.
                </p>
              ) : payment.data ? (
                <>
                  <DescriptionList>
                    <DescriptionRow label="Service total" value={money(payment.data.serviceTotal)} />
                    <DescriptionRow label="Paid" value={money(payment.data.amountPaid)} />
                    <DescriptionRow
                      label="Balance"
                      value={
                        <span className="flex items-center gap-[0.5rem]">
                          <CreditCard className="size-4 text-muted" aria-hidden="true" />
                          {money(payment.data.balance)}
                        </span>
                      }
                    />
                    <DescriptionRow label="Status">
                      <StatusPill
                        status={
                          payment.data.paymentStatus === 'paid'
                            ? 'completed'
                            : payment.data.paymentStatus === 'unpaid'
                              ? 'booked'
                              : 'confirmed'
                        }
                      >
                        {paymentStatusLabel(payment.data.paymentStatus)}
                      </StatusPill>
                    </DescriptionRow>
                  </DescriptionList>

                  {payment.data.payments.length > 0 ? (
                    <ul className="mt-[0.8rem]">
                      {payment.data.payments.map((entry) => (
                        <li
                          key={entry.id}
                          className="flex items-center justify-between gap-[0.7rem] border-t border-line py-[0.55rem] text-meta"
                        >
                          <span className="min-w-0">
                            <span className="block truncate font-semibold">
                              {entry.method} · {entry.reference}
                            </span>
                            <span className="block text-caption text-muted">
                              {formatDate(entry.createdAt)}
                            </span>
                          </span>
                          <span className="shrink-0 font-semibold tabular">
                            {money(entry.amount, entry.currency)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-[0.8rem] text-meta text-muted">
                      No payment has been recorded against this appointment.
                    </p>
                  )}
                </>
              ) : null}
            </SectionCard>
          ) : null}

          <SectionCard title="Activity" description="Every status change, newest first.">
            {activity.isLoading ? (
              <SkeletonText lines={4} />
            ) : activity.isError ? (
              <p className="text-meta text-muted">The activity history could not be loaded.</p>
            ) : (
              <ActivityTimeline
                entries={(activity.data ?? []).map((entry) => ({
                  id: entry.id,
                  title: entry.note ?? `Status: ${entry.status}`,
                  description: entry.changedByName
                    ? `${entry.status} · by ${entry.changedByName}`
                    : entry.status,
                  time: `${formatDate(entry.changedAt)}, ${formatTime(entry.changedAt)}`,
                  tone: ACTIVITY_TONES[entry.status] ?? 'neutral',
                }))}
              />
            )}
          </SectionCard>
        </div>
      </div>

      {/* Phone action bar, mirroring the design's sticky footer. */}
      <div className="fixed inset-x-0 bottom-0 z-20 flex items-center justify-between gap-[0.8rem] border-t border-line bg-bg px-[1rem] py-[0.7rem] md:hidden">
        <div className="min-w-0">
          <b className="block text-label tabular">{money(total)}</b>
          <span className="block truncate text-caption text-muted">
            {formatTime(appointment.scheduledAt)} · {lines[0]?.name ?? 'Service'}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-[0.5rem]">
          <Button variant="primary" onClick={() => onAction(primaryAction)} disabled={busy}>
            {primaryAction === 'confirm'
              ? 'Confirm'
              : primaryAction === 'complete'
                ? 'Complete'
                : 'Rebook'}
          </Button>
          <Button onClick={() => onAction('reschedule')} disabled={busy}>
            Reschedule
          </Button>
        </div>
      </div>
    </div>
  )
}

/**
 * The dark summary panel from the design: service, date, the appointment's time
 * block and the booked → confirmed → completed ladder.
 *
 * A cancelled or missed appointment replaces the ladder with the terminal state,
 * because there is no further step to show.
 */
function PremiumSummary({
  lines,
  scheduledAt,
  endAt,
  status,
  staffName,
  timing,
}: {
  lines: ReturnType<typeof serviceLines>
  scheduledAt: string
  endAt: string
  status: string
  staffName: string | null
  timing: string
}) {
  const reached = status === 'completed' ? 3 : status === 'confirmed' ? 2 : 1
  const terminal = status === 'cancelled' || status === 'no_show'

  return (
    <div className="flex flex-col gap-[1.1rem] rounded-card border border-premium-gold/25 bg-premium p-[1.25rem] text-premium-ink shadow-raised">
      <div className="flex items-start justify-between gap-[0.8rem]">
        <div className="min-w-0">
          <p className="text-caption tracking-caps text-premium-muted uppercase">
            {lines.map((line) => line.name).join(' + ') || 'Service'}
          </p>
          <p className="mt-[0.15rem] text-label font-semibold">{formatDate(scheduledAt)}</p>
        </div>
        <span className="shrink-0 rounded-pill border border-premium-gold/40 px-[0.7rem] py-[0.2rem] text-caption font-semibold text-premium-gold capitalize">
          {status.replace('_', ' ')}
        </span>
      </div>

      <div>
        <p className="text-metric leading-none font-semibold tracking-tight tabular">
          {formatTime(scheduledAt)}
          <small className="ml-[0.3rem] text-label font-medium text-premium-muted">
            – {formatTime(endAt)}
          </small>
        </p>
        <p className="mt-[0.4rem] text-meta text-premium-muted">
          {timing}
          {staffName ? ` · with ${staffName}` : ''}
        </p>
      </div>

      {terminal ? (
        <p className="text-meta font-semibold text-premium-gold">
          {status === 'cancelled' ? 'Cancelled' : 'No-show — the customer did not attend'}
        </p>
      ) : (
        <ol className="flex items-start">
          {['Booked', 'Confirmed', 'Completed'].map((label, index) => {
            const done = index < reached
            return (
              <li key={label} className="flex flex-1 flex-col items-start gap-[0.4rem]">
                <span
                  aria-hidden="true"
                  className={cn(
                    'grid size-[1.7rem] place-items-center rounded-round border',
                    done
                      ? 'border-premium-gold bg-premium-gold text-premium'
                      : 'border-premium-gold/40 bg-premium text-premium',
                  )}
                >
                  {done ? <Check className="size-3.5" strokeWidth={3} /> : null}
                </span>
                <small className="text-caption text-premium-muted">{label}</small>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}

/**
 * The staff member's day as a compact strip (08:00–20:00), with the appointment
 * being viewed outlined.
 *
 * The blocks are that day's real appointments, so the strip answers "how full is
 * this practitioner's day, and where does this visit sit in it" from data rather
 * than from a calculation.
 */
function StaffDayStrip({
  rows,
  highlightId,
  day,
}: {
  rows: readonly AppointmentRow[]
  highlightId: string
  day: string
}) {
  const dayStart = useMemo(() => {
    const start = new Date(day)
    start.setHours(DAY_START_HOUR, 0, 0, 0)
    return start.getTime()
  }, [day])

  const offset = (iso: string) => {
    const minutes = (new Date(iso).getTime() - dayStart) / 60_000
    return (minutes / DAY_SPAN_MINUTES) * 100
  }

  const bookedMinutes = rows.reduce((sum, row) => sum + row.durationMinutes, 0)

  return (
    <>
      <div className="relative h-[3rem] rounded-lg border border-line bg-hover">
        {rows.map((row) => {
          const left = Math.max(0, Math.min(100, offset(row.scheduledAt)))
          const width = Math.max(
            1.5,
            Math.min(100 - left, (row.durationMinutes / DAY_SPAN_MINUTES) * 100),
          )
          const isCurrent = row.id === highlightId

          return (
            <span
              key={row.id}
              title={`${row.customerName} · ${formatTime(row.scheduledAt)}`}
              aria-hidden="true"
              className={cn(
                'absolute top-[0.4rem] bottom-[0.4rem] rounded-xs',
                isCurrent && 'ring-2 ring-fg',
              )}
              style={{
                left: `${left}%`,
                width: `${width}%`,
                backgroundColor: `color-mix(in srgb, ${serviceColor(row.serviceId)} ${
                  isCurrent ? '100%' : '35%'
                }, var(--surface))`,
              }}
            />
          )
        })}
      </div>

      <div className="mt-[0.3rem] flex justify-between text-caption text-muted tabular">
        {[DAY_START_HOUR, 11, 14, 17, DAY_END_HOUR].map((hour) => (
          <span key={hour}>{String(hour).padStart(2, '0')}:00</span>
        ))}
      </div>

      <p className="mt-[0.6rem] text-meta text-muted">
        {rows.length} appointment{rows.length === 1 ? '' : 's'} ·{' '}
        {formatDuration(bookedMinutes)} booked. The outlined block is this appointment.
      </p>
    </>
  )
}
