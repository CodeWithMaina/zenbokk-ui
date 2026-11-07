import { ArrowLeft, Check, CreditCard, Phone } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { MODULE } from '../../lib/entitlements'
import {
  appointmentDuration,
  appointmentReference,
  appointmentTimingLabel,
  appointmentTotal,
  paymentStatusLabel,
  serviceLines,
} from '../../lib/appointments'
import type { AppointmentRow } from '../../lib/appointments'
import { useAppointment, useAppointmentActivity } from '../../lib/appointments'
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
import { AppointmentPaymentActions } from './AppointmentPaymentActions'
import { AppointmentQuickActions } from './AppointmentActions'
import type { AppointmentAction } from './AppointmentActions'

export type AppointmentDetailProps = {
  appointmentId: string
  /** The list row, so the header can paint before the detail request lands. */
  row: AppointmentRow | null
  onBack: () => void
  onAction: (action: AppointmentAction) => void
  /** Open the customer's details page, when the module can resolve one. */
  onOpenCustomer?: (customerId: string) => void
  onSaveNote: (note: string | null) => void
  noteSaving?: boolean
  noteError?: string | null
  busy?: boolean
}

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
 * Everything on this page concerns this appointment alone: the record itself,
 * its service lines, the customer and staff member it names, its notes, its own
 * payment summary and its own status history (the activity feed). It never reads
 * or shows the customer's other bookings or the staff member's other
 * appointments — those belong to their own screens.
 */
export function AppointmentDetail({
  appointmentId,
  row,
  onBack,
  onAction,
  onOpenCustomer,
  onSaveNote,
  noteSaving = false,
  noteError,
  busy = false,
}: AppointmentDetailProps) {
  const { business, hasModule, hasPermission } = useDashboardContext()
  const paymentsEnabled = hasModule(MODULE.payments)
  // Payment actions are gated on the caller's permissions. The backend enforces the
  // same codes (and the business scope) — this only decides what is offered.
  const canInitiatePayment = hasPermission('payments.create')
  const canConfirmCash = hasPermission('payments.confirm_cash')

  const detail = useAppointment(appointmentId)
  const activity = useAppointmentActivity(appointmentId)
  const appointment = detail.data ?? null

  const customerId = appointment?.customerId ?? row?.customerId ?? null

  const payment = useAppointmentPaymentSummary(appointmentId, paymentsEnabled)

  const [note, setNote] = useState('')
  useEffect(() => {
    setNote(appointment?.note ?? '')
  }, [appointment?.note, appointmentId])

  const lines = useMemo(() => (appointment ? serviceLines(appointment) : []), [appointment])

  // The two people on this appointment, resolved by the appointment endpoint
  // itself (with the list row as a fallback while the request is in flight).
  const customerName = appointment?.customerName ?? row?.customerName ?? 'Customer'
  const customerPhone = appointment?.customerPhone ?? row?.customerPhone ?? null
  const customerEmail = appointment?.customerEmail ?? row?.customerEmail ?? null
  const customerAvatarUrl = appointment?.customerAvatarUrl ?? row?.customerAvatarUrl ?? null
  const staffName = appointment?.staffName ?? row?.staffName ?? null
  const staffAvatarUrl = appointment?.staffAvatarUrl ?? row?.staffAvatarUrl ?? null

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
          <Avatar size="lg" name={customerName} src={customerAvatarUrl ?? undefined} decorative />
          <div className="min-w-0">
            <h1 className="truncate text-title font-bold tracking-tight">{customerName}</h1>
            <div className="mt-[0.3rem] flex flex-wrap items-center gap-x-[0.8rem] gap-y-[0.3rem] text-meta text-muted">
              <AppointmentStatusBadge status={appointment.status} />
              <span className="tabular">{appointmentReference(appointment.id)}</span>
              {customerPhone ? <span className="tabular">{customerPhone}</span> : null}
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
            staffName={staffName}
            timing={row ? appointmentTimingLabel(row) : ''}
          />

          <MetricGrid
            items={[
              { value: formatDuration(duration), label: 'Duration' },
              { value: money(total), label: 'Price' },
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
              <DescriptionRow
                label="Staff"
                value={
                  staffName ? (
                    <span className="flex items-center justify-end gap-[0.45rem]">
                      <Avatar
                        size="sm"
                        name={staffName}
                        src={staffAvatarUrl ?? undefined}
                        decorative
                      />
                      {staffName}
                    </span>
                  ) : (
                    'Unassigned'
                  )
                }
              />
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
              <Avatar name={customerName} src={customerAvatarUrl ?? undefined} decorative />
              <div className="min-w-0 flex-1">
                {onOpenCustomer && customerId ? (
                  <button
                    type="button"
                    onClick={() => onOpenCustomer(customerId)}
                    className="block max-w-full truncate text-left font-semibold hover:underline focus-visible:shadow-ring focus-visible:outline-none"
                  >
                    {customerName}
                  </button>
                ) : (
                  <p className="truncate font-semibold">{customerName}</p>
                )}
                <p className="truncate text-meta text-muted tabular">
                  {customerPhone ?? customerEmail ?? 'No contact on file'}
                </p>
              </div>
              {customerPhone ? (
                <a
                  href={`tel:${customerPhone.replace(/\s/g, '')}`}
                  aria-label={`Call ${customerName}`}
                  className="btn btn-icon"
                >
                  <Phone className="size-4" aria-hidden="true" />
                </a>
              ) : null}
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

                  <AppointmentPaymentActions
                    appointmentId={appointmentId}
                    businessId={business.id}
                    summary={payment.data}
                    collectable={
                      appointment.status !== 'cancelled' && appointment.status !== 'no_show'
                    }
                    canInitiate={canInitiatePayment}
                    canConfirmCash={canConfirmCash}
                  />
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

