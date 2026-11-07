import { Check, Clock, CreditCard, Scissors, User, UserCog } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { toast } from 'sonner'
import type { Appointment, CustomerOption, ServiceDashboardItem } from '../../lib/api/types'
import { errorMessage } from '../../lib/api/client'
import {
  useAppointmentAvailability,
  useAppointmentMutations,
  toDateValue,
} from '../../lib/appointments'
import type { StaffOption } from '../../lib/appointments'
import { usePublicPaymentDetails, useAppointmentPayments } from '../../lib/payments/api'
import { cn } from '../../lib/cn'
import { formatDuration, money } from '../../lib/format'
import { Button } from '../ui/button'
import { ConfirmDialog } from '../ui/confirm-dialog'
import { Drawer } from '../ui/drawer'
import { Field, Input, Textarea } from '../ui/field'
import { Skeleton } from '../ui/skeleton'
import { SearchableCustomerSelector } from './SearchableCustomerSelector'
import { SearchableStaffSelector } from './SearchableStaffSelector'

/** How the appointment is paid at booking time. */
export type PaymentArrangement = 'booking_fee' | 'full_payment' | 'pay_after'

/** The concrete payment method for anything due up front. */
export type PaymentMethodChoice = 'cash' | 'mpesa'

export type AppointmentBookingWizardProps = {
  open: boolean
  onClose: () => void
  businessId: string
  /** Staff module entitlement. When false, Step 3 is never rendered. */
  staffModuleEnabled: boolean
  /** Payments module entitlement. When false, Step 5 is never rendered. */
  paymentsEnabled: boolean
  /** The service catalogue the business books from. */
  services: readonly ServiceDashboardItem[]
  /** Pre-filled date (`yyyy-MM-dd`) when the booking starts from the calendar. */
  initialDate?: string | null
  /** Pre-filled start time (`HH:mm`) when the booking starts from the calendar. */
  initialTime?: string | null
  /** Pre-selected staff member when the booking starts from a staff column. */
  initialStaff?: StaffOption | null
  /** Called after the appointment (and any immediate payment) has been created. */
  onBooked: (appointment: Appointment, message: string) => void
}

type WizardStepKey = 'customer' | 'service' | 'staff' | 'time' | 'payment' | 'review'

const STEP_LABELS: Record<WizardStepKey, string> = {
  customer: 'Customer',
  service: 'Service',
  staff: 'Staff',
  time: 'Date & time',
  payment: 'Payment',
  review: 'Review',
}

const STEP_ICONS: Record<WizardStepKey, ReactNode> = {
  customer: <User className="size-4" aria-hidden="true" />,
  service: <Scissors className="size-4" aria-hidden="true" />,
  staff: <UserCog className="size-4" aria-hidden="true" />,
  time: <Clock className="size-4" aria-hidden="true" />,
  payment: <CreditCard className="size-4" aria-hidden="true" />,
  review: <Check className="size-4" aria-hidden="true" />,
}

/**
 * The steps this business actually gets. The wizard builds its step list from the
 * caller's real entitlements, so the staff step disappears entirely (not an empty
 * placeholder) when the optional Staff module is off, and the payment step when
 * Payments is off.
 */
function buildSteps(staffModuleEnabled: boolean, paymentsEnabled: boolean): WizardStepKey[] {
  const steps: WizardStepKey[] = ['customer', 'service']
  if (staffModuleEnabled) steps.push('staff')
  steps.push('time')
  if (paymentsEnabled) steps.push('payment')
  steps.push('review')
  return steps
}

/** Mirrors the server's `BookingFeeFor` (2dp, away from zero). Display only. */
function bookingFeeFor(total: number, percentage: number): number {
  if (total <= 0) return 0
  const pct = Math.min(100, Math.max(0, percentage))
  return Math.round((total * pct) / 100 * 100) / 100
}

/** Local `yyyy-MM-dd` for today. */
function todayValue(): string {
  return toDateValue(new Date())
}

/**
 * The guided, step-by-step booking experience.
 *
 * <para>Six logical steps (customer → service → staff → date/time → payment → review)
 * presented one at a time; the staff and payment steps are dropped from the sequence
 * entirely when the business lacks those modules, so the wizard never shows a dead
 * step. Times come from the server's own availability endpoint, and the appointment is
 * written through the same create route the rest of the platform uses — the browser
 * never decides a price, a duration or that a payment is settled.</para>
 */
export function AppointmentBookingWizard({
  open,
  onClose,
  businessId,
  staffModuleEnabled,
  paymentsEnabled,
  services,
  initialDate,
  initialTime,
  initialStaff,
  onBooked,
}: AppointmentBookingWizardProps) {
  const steps = useMemo(
    () => buildSteps(staffModuleEnabled, paymentsEnabled),
    [staffModuleEnabled, paymentsEnabled],
  )

  const [stepIndex, setStepIndex] = useState(0)
  const [customer, setCustomer] = useState<CustomerOption | null>(null)
  const [serviceIds, setServiceIds] = useState<string[]>([])
  const [staff, setStaff] = useState<StaffOption | null>(initialStaff ?? null)
  const [date, setDate] = useState(initialDate || todayValue)
  const [time, setTime] = useState(initialTime ?? '')
  const [note, setNote] = useState('')
  const [arrangement, setArrangement] = useState<PaymentArrangement>('pay_after')
  const [method, setMethod] = useState<PaymentMethodChoice>('cash')
  const [phone, setPhone] = useState('')
  /** What the operator physically received. Empty means "exactly what is due". */
  const [cashReceived, setCashReceived] = useState('')
  const [confirmDiscard, setConfirmDiscard] = useState(false)

  const step = steps[Math.min(stepIndex, steps.length - 1)]
  const isFirst = stepIndex === 0
  const isLast = stepIndex === steps.length - 1

  const selectedServices = useMemo(
    () => services.filter((service) => serviceIds.includes(service.id)),
    [services, serviceIds],
  )
  const total = selectedServices.reduce((sum, service) => sum + service.price, 0)
  const durationMinutes = selectedServices.reduce((sum, service) => sum + service.durationMinutes, 0)

  const availability = useAppointmentAvailability(
    { businessId, serviceIds, staffId: staff?.userId ?? null, date },
    open && serviceIds.length > 0 && Boolean(date),
  )

  const paymentDetails = usePublicPaymentDetails(businessId, paymentsEnabled)
  const bookingFeePercentage = paymentDetails.data?.bookingFeePercentage ?? 0
  const cashEnabled = paymentDetails.data?.cashEnabled ?? true
  const mpesaEnabled = Boolean(paymentDetails.data?.enabled)
  /** Whether the business can take money now at all (either channel configured). */
  const canTakePayment = cashEnabled || mpesaEnabled

  const bookingFee = bookingFeeFor(total, bookingFeePercentage)
  const amountNow =
    arrangement === 'booking_fee' ? bookingFee : arrangement === 'full_payment' ? total : 0
  const remaining = Math.max(0, total - amountNow)
  /** Cash the operator typed, defaulting to exactly what is due. */
  const cashTyped = cashReceived.trim() === '' ? amountNow : Number(cashReceived)
  const cashMatches = Math.abs(cashTyped - amountNow) < 0.01

  const mutations = useAppointmentMutations()
  const payments = useAppointmentPayments()
  const busy = mutations.create.isPending || payments.create.isPending || payments.confirmCash.isPending

  const dirty =
    Boolean(customer) ||
    serviceIds.length > 0 ||
    Boolean(staff) ||
    Boolean(time) ||
    note.trim().length > 0

  const availableSlots = useMemo(() => {
    const slots = availability.data ?? []
    // Offer only times the server says are free; a booked slot is never selectable.
    return slots.filter((slot) => slot.isAvailable)
  }, [availability.data])

  const start = useMemo(() => {
    if (!time) return null
    const [year, month, day] = date.split('-').map(Number)
    const [hours, minutes] = time.split(':').map(Number)
    if (!year || !month || !day || Number.isNaN(hours) || Number.isNaN(minutes)) return null
    return new Date(year, month - 1, day, hours, minutes)
  }, [date, time])

  const canContinue = (() => {
    switch (step) {
      case 'customer':
        return Boolean(customer)
      case 'service':
        return serviceIds.length > 0
      case 'staff':
        return true // staff may be left unassigned
      case 'time':
        return Boolean(start) && availableSlots.some((slot) => slot.localTime === time)
      case 'payment': {
        if (!paymentsEnabled) return true
        if (amountNow <= 0) return true // pay-after-service needs no method
        if (method === 'cash') return cashEnabled && cashMatches
        return mpesaEnabled && phone.trim().length > 0
      }
      default:
        return true
    }
  })()

  /**
   * A service change moves the bookable grid (duration + eligible staff), so a time
   * chosen against the old selection is no longer confirmed and is cleared. The same
   * applies to a staff or date change. Unrelated selections (customer, note) are kept.
   */
  function toggleService(id: string) {
    setServiceIds((current) =>
      current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id],
    )
    setTime('')
  }

  function changeStaff(next: StaffOption | null) {
    setStaff(next)
    setTime('')
  }

  function changeDate(value: string) {
    setDate(value)
    setTime('')
  }

  const error =
    mutations.create.isError || payments.create.isError
      ? errorMessage(mutations.create.error ?? payments.create.error)
      : payments.confirmCash.isError
        ? errorMessage(payments.confirmCash.error)
        : null

  function reset() {
    setStepIndex(0)
    setCustomer(null)
    setServiceIds([])
    setStaff(null)
    setDate(todayValue())
    setTime('')
    setNote('')
    setArrangement('pay_after')
    setMethod('cash')
    setPhone('')
    setCashReceived('')
    mutations.create.reset()
    payments.create.reset()
    payments.confirmCash.reset()
  }

  function requestClose() {
    if (busy) return
    if (dirty) {
      setConfirmDiscard(true)
      return
    }
    onClose()
  }

  /**
   * Create the appointment, then — when something is due now — create and (for cash)
   * confirm the payment. Everything here is a request: the server computes the amounts
   * from the selected services and is the only thing that decides a payment is settled.
   */
  async function submit() {
    if (!customer || !start || serviceIds.length === 0 || busy) return
    try {
      const appointment = await mutations.create.mutateAsync({
        businessId,
        customerId: customer.userId,
        serviceIds,
        staffUserId: staffModuleEnabled ? (staff?.userId ?? null) : null,
        scheduledAt: start.toISOString(),
        note: note.trim() || null,
      })

      let message = 'Appointment created.'
      if (paymentsEnabled && arrangement !== 'pay_after') {
        const payment = await payments.create.mutateAsync({
          appointmentId: appointment.id,
          method,
          type: arrangement === 'booking_fee' ? 'booking_fee' : 'full_payment',
          phoneNumber: method === 'mpesa' ? phone.trim() : null,
          idempotencyKey: `${appointment.id}:${arrangement}`,
        })
        if (method === 'cash') {
          await payments.confirmCash.mutateAsync({
            paymentId: payment.id,
            appointmentId: appointment.id,
            note: 'Cash received at booking',
          })
          message = `Appointment created. ${money(amountNow)} cash recorded.`
        } else {
          message = `Appointment created. M-PESA request sent to ${phone.trim()}; it stays pending until confirmed.`
        }
      } else if (paymentsEnabled && remaining > 0) {
        message = `Appointment booked. ${money(remaining)} outstanding to collect.`
      }

      onBooked(appointment, message)
      reset()
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  const canSubmit = Boolean(customer) && serviceIds.length > 0 && Boolean(start) && !busy

  /**
   * The three arrangements the design offers, each with its own arithmetic shown so
   * the operator can compare them. The amounts mirror the same rule the API applies
   * (`BookingFeeFor`); the server still recomputes everything when the booking saves.
   */
  const arrangementOptions: {
    key: PaymentArrangement
    label: string
    dueNow: number
    balance: number
    blurb: string
  }[] = [
    {
      key: 'booking_fee',
      label: 'Booking fee',
      dueNow: bookingFee,
      balance: Math.max(0, total - bookingFee),
      blurb: 'Collect a deposit now and settle the rest later.',
    },
    {
      key: 'full_payment',
      label: 'Full payment',
      dueNow: total,
      balance: 0,
      blurb: 'Settle the whole appointment up front.',
    },
    {
      key: 'pay_after',
      label: 'Pay after service',
      dueNow: 0,
      balance: total,
      blurb: 'Take nothing now and collect when the service is done.',
    },
  ]

  // A zero booking fee is the same thing as paying later, so never offer it twice;
  // and a business with no working channel can only pay after service.
  const arrangementRows = arrangementOptions.filter(
    (row) =>
      !(row.key === 'booking_fee' && bookingFee <= 0) &&
      (canTakePayment || row.key === 'pay_after'),
  )

  return (
    <>
      <Drawer
        open={open}
        onClose={requestClose}
        title="New appointment"
        description="A guided booking — customer, services, staff, time and payment."
        bodyClassName="space-y-[1.1rem]"
        footer={
          <div className="flex w-full items-center justify-between gap-[0.6rem]">
            <Button
              type="button"
              onClick={() => setStepIndex((index) => Math.max(0, index - 1))}
              disabled={isFirst || busy}
            >
              Back
            </Button>
            {isLast ? (
              <Button
                type="button"
                variant="primary"
                onClick={() => void submit()}
                disabled={!canSubmit}
              >
                {busy ? 'Booking…' : 'Confirm appointment'}
              </Button>
            ) : (
              <Button
                type="button"
                variant="primary"
                onClick={() => setStepIndex((index) => Math.min(steps.length - 1, index + 1))}
                disabled={!canContinue}
              >
                Continue
              </Button>
            )}
          </div>
        }
      >
        {/* Step indicator — every step the business actually has, in order. */}
        <ol
          aria-label="Booking steps"
          className="flex flex-wrap items-center gap-x-[0.4rem] gap-y-[0.4rem]"
        >
          {steps.map((key, index) => {
            const active = key === step
            const done = index < stepIndex
            return (
              <li key={key} className="flex items-center gap-[0.4rem]">
                <span
                  aria-current={active ? 'step' : undefined}
                  className={cn(
                    'inline-flex items-center gap-[0.35rem] rounded-round border px-[0.6rem] py-[0.25rem] text-meta font-semibold',
                    active
                      ? 'border-transparent bg-inverse text-on-inverse'
                      : done
                        ? 'border-line bg-hover text-fg'
                        : 'border-line text-muted',
                  )}
                >
                  <span aria-hidden="true">
                    {done ? <Check className="size-3.5" /> : STEP_ICONS[key]}
                  </span>
                  {STEP_LABELS[key]}
                </span>
                {index < steps.length - 1 ? (
                  <span aria-hidden="true" className="text-muted">
                    ›
                  </span>
                ) : null}
              </li>
            )
          })}
        </ol>

        {error ? (
          <p className="text-meta font-semibold text-danger-ink" role="alert">
            {error}
          </p>
        ) : null}


        {step === 'customer' ? (
          <StepPanel
            title="Who is this appointment for?"
            hint="Search the business's customers by name, phone or email — or add a new one without leaving this form."
          >
            <SearchableCustomerSelector value={customer} onChange={setCustomer} />
            {customer ? (
              <p className="rounded-lg border border-line bg-hover px-[0.9rem] py-[0.7rem] text-meta">
                <b>{customer.fullName}</b>
                <br />
                <span className="tabular text-muted">
                  {[customer.phoneNumber, customer.email].filter(Boolean).join(' · ') ||
                    'No contact details on file'}
                </span>
              </p>
            ) : null}
          </StepPanel>
        ) : null}

        {step === 'service' ? (
          <StepPanel
            title="Which services are being booked?"
            hint="Pick one or more services. The price and duration the server stores come from the catalogue."
          >
            {services.length === 0 ? (
              <p className="text-meta text-muted">This business has no active services to book.</p>
            ) : (
              <ul className="flex max-h-[20rem] flex-col gap-[0.4rem] overflow-y-auto">
                {services.map((service) => {
                  const selected = serviceIds.includes(service.id)
                  return (
                    <li key={service.id}>
                      <button
                        type="button"
                        aria-pressed={selected}
                        onClick={() => toggleService(service.id)}
                        className={cn(
                          'flex w-full items-start gap-[0.6rem] rounded-lg border px-[0.8rem] py-[0.6rem] text-left transition-colors focus-visible:shadow-ring focus-visible:outline-none',
                          selected ? 'border-transparent bg-hover' : 'border-line hover:bg-hover',
                        )}
                      >
                        <span
                          className={cn(
                            'mt-[0.15rem] grid size-4 shrink-0 place-items-center rounded-[0.25rem] border',
                            selected ? 'border-transparent bg-inverse text-on-inverse' : 'border-line',
                          )}
                          aria-hidden="true"
                        >
                          {selected ? <Check className="size-3" /> : null}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center justify-between gap-[0.6rem]">
                            <span className="truncate font-medium">{service.name}</span>
                            <span className="tabular shrink-0 font-semibold">
                              {money(service.price)}
                            </span>
                          </span>
                          <span className="mt-[0.15rem] flex items-center gap-[0.4rem] text-meta text-muted">
                            <Clock className="size-3.5" aria-hidden="true" />
                            <span className="tabular">{formatDuration(service.durationMinutes)}</span>
                          </span>
                          {service.description ? (
                            <span className="mt-[0.25rem] block text-meta text-muted">
                              {service.description}
                            </span>
                          ) : null}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
            {selectedServices.length > 0 ? (
              <p className="rounded-lg border border-line bg-hover px-[0.9rem] py-[0.7rem] text-meta tabular">
                <b>{selectedServices.length}</b> selected · <b>{formatDuration(durationMinutes)}</b> ·{' '}
                <b>{money(total)}</b>
              </p>
            ) : null}
          </StepPanel>
        ) : null}

        {step === 'staff' ? (
          <StepPanel
            title="Assign a staff member"
            hint="Optional — leave blank to book without assigning anyone."
          >
            <SearchableStaffSelector
              value={staff}
              onChange={changeStaff}
              enabled={staffModuleEnabled}
            />
          </StepPanel>
        ) : null}


        {step === 'time' ? (
          <StepPanel
            title="Pick a date and time"
            hint="Times come from the server's live availability for the chosen services and staff member."
          >
            <Field label="Appointment date" htmlFor="wizard-date">
              <Input
                id="wizard-date"
                type="date"
                value={date}
                min={todayValue()}
                onChange={(event) => changeDate(event.target.value)}
              />
            </Field>

            <div>
              <p className="label">Available times</p>
              {availability.isLoading ? (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(4.3rem,1fr))] gap-[0.4rem]">
                  {Array.from({ length: 8 }, (_, index) => (
                    <Skeleton key={index} className="h-[2.2rem] rounded-md" />
                  ))}
                </div>
              ) : availability.isError ? (
                <p className="text-meta text-danger-ink" role="alert">
                  Availability could not be loaded. Try another day — the server still validates the
                  slot when you confirm.
                </p>
              ) : availableSlots.length === 0 ? (
                <p className="text-meta text-muted">
                  No free slots for these services{staff ? ` and ${staff.fullName}` : ''} on this day.
                  Try another day, or adjust the services
                  {staffModuleEnabled ? ' or staff member' : ''}.
                </p>
              ) : (
                <div
                  role="group"
                  aria-label="Choose a start time"
                  className="grid max-h-[14rem] grid-cols-[repeat(auto-fill,minmax(4.3rem,1fr))] gap-[0.4rem] overflow-y-auto"
                >
                  {availableSlots.map((slot) => {
                    const active = slot.localTime === time
                    return (
                      <button
                        key={`${slot.startAtUtc}-${slot.staffUserId ?? 'any'}`}
                        type="button"
                        aria-pressed={active}
                        onClick={() => {
                          setTime(slot.localTime)
                          // A specific staff member's slot resolves who will serve it.
                          if (slot.staffUserId && staffModuleEnabled) {
                            setStaff({
                              userId: slot.staffUserId,
                              fullName: slot.staffName,
                              email: '',
                              avatarUrl: null,
                            })
                          }
                        }}
                        className={cn(
                          'chip w-full justify-center tabular focus-visible:shadow-ring focus-visible:outline-none',
                          active && 'border-transparent bg-inverse text-on-inverse',
                        )}
                      >
                        {slot.localTime}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            <Field label="Notes for the team" htmlFor="wizard-note" optional>
              <Textarea
                id="wizard-note"
                rows={2}
                maxLength={500}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Allergies, preparation instructions, payment preference…"
              />
            </Field>
          </StepPanel>
        ) : null}


        {step === 'payment' ? (
          <StepPanel
            title="How will this be paid?"
            hint="Choose when the business collects payment. Amounts are calculated by the server from the selected services."
          >
            <p className="text-meta tabular">
              Appointment total: <b>{money(total)}</b>
            </p>

            <div className="overflow-hidden rounded-lg border border-line">
              <table className="w-full text-meta">
                <thead className="bg-hover text-muted">
                  <tr>
                    <th className="px-[0.7rem] py-[0.45rem] text-left font-semibold">Arrangement</th>
                    <th className="px-[0.7rem] py-[0.45rem] text-right font-semibold">Due now</th>
                    <th className="px-[0.7rem] py-[0.45rem] text-right font-semibold">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {arrangementRows.map((row) => {
                    const active = arrangement === row.key
                    return (
                      <tr
                        key={row.key}
                        className={cn('cursor-pointer border-t border-line', active && 'bg-hover')}
                        onClick={() => setArrangement(row.key)}
                      >
                        <td className="px-[0.7rem] py-[0.55rem]">
                          <label className="flex cursor-pointer items-center gap-[0.5rem]">
                            <input
                              type="radio"
                              name="payment-arrangement"
                              value={row.key}
                              checked={active}
                              onChange={() => setArrangement(row.key)}
                              className="size-4"
                            />
                            <span>
                              <span className="block font-medium">{row.label}</span>
                              <span className="block text-muted">{row.blurb}</span>
                            </span>
                          </label>
                        </td>
                        <td className="tabular px-[0.7rem] py-[0.55rem] text-right font-semibold">
                          {money(row.dueNow)}
                        </td>
                        <td className="tabular px-[0.7rem] py-[0.55rem] text-right">
                          {money(row.balance)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>


            {amountNow > 0 ? (
              <div className="space-y-[0.7rem] rounded-lg border border-line p-[0.8rem]">
                <p className="text-meta">
                  Collecting <b className="tabular">{money(amountNow)}</b> now.
                </p>

                <div className="flex flex-wrap gap-[0.4rem]" role="group" aria-label="Payment method">
                  <button
                    type="button"
                    aria-pressed={method === 'cash'}
                    disabled={!cashEnabled}
                    onClick={() => setMethod('cash')}
                    className={cn(
                      'chip focus-visible:shadow-ring focus-visible:outline-none',
                      method === 'cash' && 'border-transparent bg-inverse text-on-inverse',
                      !cashEnabled && 'opacity-50',
                    )}
                  >
                    Cash
                  </button>
                  <button
                    type="button"
                    aria-pressed={method === 'mpesa'}
                    disabled={!mpesaEnabled}
                    onClick={() => setMethod('mpesa')}
                    className={cn(
                      'chip focus-visible:shadow-ring focus-visible:outline-none',
                      method === 'mpesa' && 'border-transparent bg-inverse text-on-inverse',
                      !mpesaEnabled && 'opacity-50',
                    )}
                  >
                    M-PESA
                  </button>
                </div>

                {method === 'cash' ? (
                  <Field
                    label="Cash received"
                    htmlFor="wizard-cash"
                    error={
                      !cashMatches
                        ? `Enter exactly ${money(amountNow)} to record cash now.`
                        : undefined
                    }
                  >
                    <Input
                      id="wizard-cash"
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step={1}
                      value={cashReceived}
                      onChange={(event) => setCashReceived(event.target.value)}
                      placeholder={String(amountNow)}
                    />
                  </Field>
                ) : (
                  <Field
                    label="M-PESA phone number"
                    htmlFor="wizard-phone"
                    hint="The platform sends an STK prompt to this number. The payment stays pending until M-PESA confirms it."
                  >
                    <Input
                      id="wizard-phone"
                      type="tel"
                      inputMode="tel"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      placeholder="0712 345 678"
                    />
                  </Field>
                )}

                <p className="text-meta text-muted">
                  {method === 'cash'
                    ? 'Cash is recorded against this appointment only once you confirm it here.'
                    : 'Nothing is marked paid from the request itself — only M-PESA’s own confirmation settles it.'}
                </p>
              </div>
            ) : (
              <p className="rounded-lg border border-line bg-hover px-[0.9rem] py-[0.7rem] text-meta">
                Nothing is collected now. <b className="tabular">{money(total)}</b> stays outstanding
                and can be collected later from the appointment.
              </p>
            )}
          </StepPanel>
        ) : null}


        {step === 'review' ? (
          <StepPanel
            title="Review and confirm"
            hint="Check every detail before the appointment is created."
          >
            <dl className="grid grid-cols-[auto_1fr] gap-x-[1rem] gap-y-[0.5rem] text-meta">
              <dt className="text-muted">Customer</dt>
              <dd className="font-medium">{customer?.fullName ?? '—'}</dd>

              <dt className="text-muted">Services</dt>
              <dd className="space-y-[0.15rem]">
                {selectedServices.length === 0
                  ? '—'
                  : selectedServices.map((service) => (
                      <div key={service.id} className="flex items-center justify-between gap-[0.6rem]">
                        <span>{service.name}</span>
                        <span className="tabular">{money(service.price)}</span>
                      </div>
                    ))}
              </dd>

              {staffModuleEnabled ? (
                <>
                  <dt className="text-muted">Staff member</dt>
                  <dd className="font-medium">{staff?.fullName ?? 'Unassigned'}</dd>
                </>
              ) : null}

              <dt className="text-muted">Date &amp; time</dt>
              <dd className="font-medium">
                {date} {time ? `· ${time}` : ''}
              </dd>

              <dt className="text-muted">Duration</dt>
              <dd className="tabular">{formatDuration(durationMinutes)}</dd>

              <dt className="text-muted">Appointment total</dt>
              <dd className="tabular font-semibold">{money(total)}</dd>

              <dt className="text-muted">Payment arrangement</dt>
              <dd className="font-medium">
                {!paymentsEnabled || arrangement === 'pay_after'
                  ? 'Pay after service'
                  : arrangement === 'booking_fee'
                    ? 'Booking fee'
                    : 'Full payment'}
              </dd>

              <dt className="text-muted">Due now</dt>
              <dd className="tabular">
                {money(paymentsEnabled ? amountNow : 0)}
                {paymentsEnabled && amountNow > 0
                  ? ` · ${method === 'cash' ? 'Cash' : 'M-PESA'}`
                  : ''}
              </dd>

              <dt className="text-muted">Outstanding</dt>
              <dd className="tabular">{money(paymentsEnabled ? remaining : total)}</dd>
            </dl>

            {note.trim() ? (
              <p className="rounded-lg border border-line bg-hover px-[0.9rem] py-[0.7rem] text-meta">
                <span className="text-muted">Note: </span>
                {note.trim()}
              </p>
            ) : null}
          </StepPanel>
        ) : null}
      </Drawer>

      <ConfirmDialog
        open={confirmDiscard}
        tone="danger"
        title="Discard this appointment?"
        description="The details you have entered will be lost."
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        onCancel={() => setConfirmDiscard(false)}
        onConfirm={() => {
          setConfirmDiscard(false)
          reset()
          onClose()
        }}
      />
    </>
  )
}

/**
 * One step's body: a title, a one-line explanation and the step's controls. Kept
 * local so every step reads the same and the wizard body stays declarative.
 */
function StepPanel({
  title,
  hint,
  children,
}: {
  title: string
  hint: string
  children: ReactNode
}) {
  return (
    <section className="min-w-0 space-y-[0.7rem]">
      <div>
        <h3 className="text-subheading font-semibold text-fg">{title}</h3>
        <p className="mt-[0.15rem] text-meta text-muted">{hint}</p>
      </div>
      {children}
    </section>
  )
}

