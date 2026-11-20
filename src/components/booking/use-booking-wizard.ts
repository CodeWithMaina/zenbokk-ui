import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Appointment, CustomerOption } from '../../lib/api/types'
import { ApiError, errorMessage } from '../../lib/api/client'
import { useAppointmentAvailability, useAppointmentMutations } from '../../lib/appointments'
import type { BookingCatalogueService, BookingDraft, BookingType, PaymentMethod, PaymentPlan } from '../../lib/booking'
import {
  DEFAULT_BOOKING_PERCENT,
  bookingEndMinutes,
  bookingPercentValid,
  bookingReference,
  bookingStartMinutes,
  bookingStepComplete,
  checkCustomTime,
  clockToMinutes,
  emptyBookingDraft,
  minutesToClock,
  normaliseMpesaCode,
  serviceTotals,
  todayKey,
  walkInStartMinutes,
} from '../../lib/booking'
import { useAppointmentPayments, usePublicPaymentDetails, useSubmitMpesaMessage } from '../../lib/payments/api'
import { scanMpesaMessage } from '../../lib/payments/mpesa-message'

/**
 * The booking flow's one central state.
 *
 * Mobile and desktop render the same draft: this hook owns it, and every step
 * panel is a controlled view of it. Writes go through the app's existing
 * appointments and payments clients — nothing here invents an endpoint, a status
 * or a figure the server would disagree with.
 */

export type BookingPrefill = {
  customer?: CustomerOption | null
  services?: readonly BookingCatalogueService[]
  date?: string | null
  slot?: string | null
  /** Reserved for a future staff step; carried through untouched today. */
  staffUserId?: string | null
}

/** What the backend answered once the booking was submitted. */
export type BookingOutcome = {
  appointment: Appointment
  /** `AP-3F2A9C41`, derived from the appointment's own id. */
  reference: string
  /** The payment row the server created, when one was taken. */
  paymentId: string | null
  /** True when a payment was expected but could not be recorded. */
  paymentFailed: boolean
  /** The server's own words for a payment that is not settled yet. */
  paymentNote: string | null
}

export type BookingWizardApi = ReturnType<typeof useBookingWizard>

/** `2026-05-12` + `09:30` → the instant, in the browser's timezone. */
function startInstant(date: string, clock: string): Date | null {
  const minutes = clockToMinutes(clock)
  if (minutes == null) return null
  const [year, month, day] = date.split('-').map(Number)
  if (!year || !month || !day) return null
  return new Date(year, month - 1, day, Math.floor(minutes / 60), minutes % 60, 0, 0)
}

export function useBookingWizard({
  open,
  businessId,
  services,
  prefill,
  paymentsEnabled,
}: {
  open: boolean
  businessId: string
  /** The bookable catalogue the business books from. */
  services: readonly BookingCatalogueService[]
  prefill?: BookingPrefill
  /** Payments module entitlement; when off, step 4 records nothing at all. */
  paymentsEnabled: boolean
}) {
  const [draft, setDraft] = useState<BookingDraft>(() => emptyBookingDraft())
  const [outcome, setOutcome] = useState<BookingOutcome | null>(null)
  const [failure, setFailure] = useState<string | null>(null)
  const [attempting, setAttempting] = useState(false)
  const inFlight = useRef(false)

  const mutations = useAppointmentMutations()
  const payments = useAppointmentPayments()
  const submitConfirmation = useSubmitMpesaMessage()
  const publicDetails = usePublicPaymentDetails(businessId, open && paymentsEnabled)

  /** The business's own booking-fee percentage, or the named fallback. */
  const configuredPercent = useMemo(() => {
    const value = publicDetails.data?.bookingFeePercentage
    return typeof value === 'number' && bookingPercentValid(value) ? value : null
  }, [publicDetails.data])

  const manualMpesaConfigured = publicDetails.data?.enabled ?? false

  const patch = useCallback((changes: Partial<BookingDraft>) => {
    setDraft((previous) => ({ ...previous, ...changes }))
  }, [])

  const reset = useCallback(() => {
    const fresh = emptyBookingDraft()
    fresh.services = [...(prefill?.services ?? [])]
    fresh.customer = prefill?.customer ?? null
    fresh.type = prefill?.date ? 'appointment' : null
    fresh.date = prefill?.date ?? null
    fresh.slot = prefill?.slot ?? null
    fresh.percent = configuredPercent ?? fresh.percent
    setDraft(fresh)
    setOutcome(null)
    setFailure(null)
    setAttempting(false)
    inFlight.current = false
  }, [configuredPercent, prefill?.customer, prefill?.date, prefill?.services, prefill?.slot])

  // Opening the flow (and reopening it for another booking) starts clean. Keyed
  // on `open` alone: `reset` changes identity when the business's payment
  // configuration arrives, and re-running it then would discard typed work. The
  // ref keeps the effect honest — it always calls the current `reset` — without
  // making `reset` a trigger.
  const resetRef = useRef(reset)
  useEffect(() => {
    resetRef.current = reset
  }, [reset])

  useEffect(() => {
    if (open) resetRef.current()
  }, [open])

  // The business's configured booking percentage usually arrives after the flow
  // opens. Adopt it while the owner has not touched the field, so the deposit
  // they see is the business's own policy rather than the built-in fallback.
  useEffect(() => {
    if (configuredPercent == null) return
    setDraft((previous) =>
      previous.percent === DEFAULT_BOOKING_PERCENT && previous.plan === 'full'
        ? { ...previous, percent: configuredPercent }
        : previous,
    )
  }, [configuredPercent])

  const totals = serviceTotals(draft.services)
  const startMinutes = bookingStartMinutes(draft)
  const endMinutes = bookingEndMinutes(draft)

  /** Availability is only ever asked for an appointment with services chosen. */
  const availability = useAppointmentAvailability(
    {
      businessId,
      serviceIds: draft.services.map((service) => service.id),
      date: draft.date ?? '',
    },
    open && draft.type === 'appointment' && Boolean(draft.date) && draft.services.length > 0,
  )

  /** The day's real slots, straight from the server's answer. */
  const slots = useMemo(() => availability.data ?? [], [availability.data])

  // ── Step navigation ─────────────────────────────────────────────

  const goTo = useCallback((step: number) => {
    setDraft((previous) => ({ ...previous, step: Math.max(0, Math.min(4, step)) }))
  }, [])

  const next = useCallback(() => {
    setDraft((previous) => {
      if (!bookingStepComplete(previous.step, previous)) return previous
      const upcoming = { ...previous, step: Math.min(4, previous.step + 1) }
      // The payer's number is a sensible default the moment the payment step opens.
      if (upcoming.step === 3 && upcoming.payerPhone === '' && previous.customer?.phoneNumber) {
        upcoming.payerPhone = previous.customer.phoneNumber
      }
      return upcoming
    })
  }, [])

  const back = useCallback(() => {
    setDraft((previous) => ({ ...previous, step: Math.max(0, previous.step - 1) }))
  }, [])

  // ── Step 1: booking type and customer ───────────────────────────

  const setType = useCallback((type: BookingType) => {
    setDraft((previous) => {
      if (previous.type === type) return previous
      // Switching between a walk-in and an appointment invalidates the other's
      // timing, so nothing stale is ever carried across.
      return {
        ...previous,
        type,
        // Switching between a walk-in and an appointment invalidates the other's
        // timing, so nothing stale is ever carried across.
        date: type === 'walk_in' ? null : previous.date,
        slot: null,
        walkInStart: type === 'walk_in' ? previous.walkInStart : null,
        customTime: '',
        customResult: null,
      }
    })
  }, [])

  const setCustomer = useCallback((customer: CustomerOption | null) => {
    setDraft((previous) => ({
      ...previous,
      customer,
      payerPhone: previous.payerPhone === '' && customer?.phoneNumber ? customer.phoneNumber : previous.payerPhone,
    }))
  }, [])

  // ── Step 2: services ────────────────────────────────────────────

  /** Toggling a service invalidates a chosen time, because the booking's length changed. */
  const toggleService = useCallback((service: BookingCatalogueService) => {
    setDraft((previous) => {
      const chosen = previous.services.some((line) => line.id === service.id)
      const nextServices = chosen
        ? previous.services.filter((line) => line.id !== service.id)
        : [...previous.services, service]
      return {
        ...previous,
        services: nextServices,
        slot: null,
        customTime: '',
        customResult: null,
      }
    })
  }, [])

  // ── Step 3: date and time ───────────────────────────────────────

  const shiftWalkIn = useCallback((deltaMinutes: number) => {
    setDraft((previous) => ({
      ...previous,
      walkInStart: Math.max(0, walkInStartMinutes(previous) + deltaMinutes),
    }))
  }, [])

  const setWalkInStart = useCallback((minutes: number) => {
    setDraft((previous) => ({ ...previous, walkInStart: Math.max(0, minutes) }))
  }, [])

  const setDate = useCallback((date: string) => {
    setDraft((previous) => ({ ...previous, date, slot: null, customTime: '', customResult: null }))
  }, [])

  const setSlot = useCallback((slot: string) => {
    setDraft((previous) => ({
      ...previous,
      slot,
      customTime: '',
      customResult: null,
    }))
  }, [])

  const setCustomTime = useCallback((value: string) => {
    setDraft((previous) => ({ ...previous, customTime: value }))
  }, [])

  /**
   * Check a typed start time against the slots the server just returned for this
   * day and these services. The grid is the API's own answer, never extended
   * locally, and the result is stored so the step can explain its refusal.
   */
  const checkTime = useCallback(() => {
    setDraft((previous) => {
      if (previous.date == null) return previous
      const result = checkCustomTime(slots, previous.customTime, serviceTotals(previous.services).durationMinutes)
      return {
        ...previous,
        customResult: result,
        slot: result.ok ? result.time : null,
      }
    })
  }, [slots])

  // ── Step 4: payment ─────────────────────────────────────────────

  const setPlan = useCallback((plan: PaymentPlan) => {
    setDraft((previous) => ({ ...previous, plan }))
  }, [])

  const setMethod = useCallback((method: PaymentMethod) => {
    setDraft((previous) => ({ ...previous, method }))
  }, [])

  const setPercent = useCallback((percent: number) => {
    setDraft((previous) => ({ ...previous, percent }))
  }, [])

  const setTransactionCode = useCallback((value: string) => {
    setDraft((previous) => ({ ...previous, transactionCode: normaliseMpesaCode(value) }))
  }, [])

  const setPayerPhone = useCallback((value: string) => {
    setDraft((previous) => ({ ...previous, payerPhone: value }))
  }, [])

  const setReference = useCallback((value: string) => {
    setDraft((previous) => ({ ...previous, reference: value }))
  }, [])

  const setConfirmation = useCallback((value: string) => {
    setDraft((previous) => ({ ...previous, confirmation: value }))
  }, [])

  /** What the pasted confirmation reads as, before it is ever sent. */
  const scannedConfirmation = useMemo(
    () => (draft.confirmation.trim() ? scanMpesaMessage(draft.confirmation) : null),
    [draft.confirmation],
  )


  // ── Submitting ──────────────────────────────────────────────────

  /**
   * Confirm the booking.
   *
   * The appointment is created first, because the payments API needs its id. If
   * the appointment lands but the payment does not, that is reported as its own
   * state — with the appointment's reference kept — so a retry can never book the
   * same appointment twice; only the payment call is repeated.
   */
  const submit = useCallback(async () => {
    if (inFlight.current || !draft.customer || draft.services.length === 0 || !draft.type) return
    if (!bookingStepComplete(2, draft) || !bookingStepComplete(3, draft)) return
    setFailure(null)

    const walkIn = draft.type === 'walk_in'
    const date = walkIn ? todayKey() : (draft.date ?? '')
    const clock = walkIn ? minutesToClock(walkInStartMinutes(draft)) : (draft.slot ?? '')
    const start = startInstant(date, clock)
    if (!start) {
      setFailure('Choose a date and a start time before confirming.')
      goTo(2)
      return
    }

    inFlight.current = true
    setAttempting(true)
    try {
      const takeNothingNow = !paymentsEnabled || draft.plan === 'after'
      const appointment = await mutations.create.mutateAsync({
        businessId,
        customerId: draft.customer.userId,
        serviceIds: draft.services.map((service) => service.id),
        scheduledAt: start.toISOString(),
        payAfterService: takeNothingNow,
      })

      const reference = bookingReference(appointment.id)
      let paymentId: string | null = null
      let paymentFailed = false
      let paymentNote: string | null = null

      if (!takeNothingNow) {
        try {
          const payment = await payments.create.mutateAsync({
            appointmentId: appointment.id,
            method: draft.method === 'mpesa' ? 'mpesa' : 'cash',
            type: draft.plan === 'booking' ? 'booking_fee' : 'full_payment',
            phoneNumber: draft.method === 'mpesa' ? draft.payerPhone.trim() : null,
            amount: null,
            idempotencyKey: `${appointment.id}:${draft.plan}`,
          })
          paymentId = payment.id

          if (draft.method === 'cash') {
            await payments.confirmCash.mutateAsync({
              paymentId: payment.id,
              appointmentId: appointment.id,
              note: draft.reference.trim()
                ? `Received by ${draft.reference.trim()}`
                : 'Cash received at booking',
            })
            paymentNote = 'Recorded as received.'
          } else if (draft.confirmation.trim()) {
            // A manual M-PESA claim stays pending until its confirmation is
            // submitted for the owner to verify. Nothing here settles it.
            const scanned = scanMpesaMessage(draft.confirmation)
            if (!scanned.ok) {
              paymentNote = scanned.error
            } else {
              const submitted = await submitConfirmation.mutateAsync({
                paymentId: payment.id,
                message: draft.confirmation.trim(),
              })
              paymentNote =
                submitted.status === 'submitted'
                  ? 'Confirmation submitted for you to verify in Payments.'
                  : `Recorded as ${submitted.status}.`
            }
          } else {
            paymentNote = 'Waiting for the customer’s M-Pesa confirmation before it can be verified.'
          }
        } catch (paymentError) {
          // The appointment exists; only the money did not land. Keep the
          // reference so a retry re-runs the payment, never the booking.
          paymentFailed = true
          paymentNote = errorMessage(paymentError)
        }
      } else if (paymentsEnabled) {
        paymentNote = 'The full balance is outstanding and will be collected after the service.'
      }

      setOutcome({ appointment, reference, paymentId, paymentFailed, paymentNote })
      mutations.create.reset()
      payments.create.reset()
      payments.confirmCash.reset()
      submitConfirmation.reset()
    } catch (error) {
      if (error instanceof ApiError && error.code === 'STAFF_TIME_UNAVAILABLE') {
        // The slot was taken between loading the day and confirming it. Send the
        // owner back to the time step with the server's own words, and clear the
        // choice so a stale slot is never re-submitted.
        setDraft((previous) => ({ ...previous, slot: null, customResult: null }))
        setFailure(error.message)
        goTo(2)
      } else {
        setFailure(errorMessage(error))
      }
    } finally {
      inFlight.current = false
      setAttempting(false)
    }
  }, [
    businessId,
    draft,
    goTo,
    mutations.create,
    payments.confirmCash,
    payments.create,
    paymentsEnabled,
    submitConfirmation,
  ])


  /** Retry only the payment, for an appointment that was already created. */
  const retryPayment = useCallback(async () => {
    if (!outcome || inFlight.current) return
    if (draft.plan === 'after') return
    inFlight.current = true
    setAttempting(true)
    try {
      const payment = await payments.create.mutateAsync({
        appointmentId: outcome.appointment.id,
        method: draft.method === 'mpesa' ? 'mpesa' : 'cash',
        type: draft.plan === 'booking' ? 'booking_fee' : 'full_payment',
        phoneNumber: draft.method === 'mpesa' ? draft.payerPhone.trim() : null,
        amount: null,
        idempotencyKey: `${outcome.appointment.id}:${draft.plan}`,
      })
      let paymentNote = 'Recorded.'
      if (draft.method === 'cash') {
        await payments.confirmCash.mutateAsync({
          paymentId: payment.id,
          appointmentId: outcome.appointment.id,
          note: draft.reference.trim() ? `Received by ${draft.reference.trim()}` : 'Cash received at booking',
        })
        paymentNote = 'Recorded as received.'
      }
      setOutcome({ ...outcome, paymentId: payment.id, paymentFailed: false, paymentNote })
    } catch (error) {
      setOutcome({ ...outcome, paymentFailed: true, paymentNote: errorMessage(error) })
    } finally {
      inFlight.current = false
      setAttempting(false)
    }
  }, [draft.method, draft.plan, draft.payerPhone, draft.reference, outcome, payments.confirmCash, payments.create])

  /** Dismiss the confirmation and start a fresh booking in the same dialog. */
  const startAnother = useCallback(() => {
    reset()
  }, [reset])

  return {
    draft,
    patch,
    totals,
    startMinutes,
    endMinutes,
    slots,
    availability,
    configuredPercent,
    manualMpesaConfigured,
    scannedConfirmation,
    paymentsEnabled,
    outcome,
    failure,
    attempting,
    submit,
    retryPayment,
    startAnother,
    reset,
    goTo,
    next,
    back,
    setType,
    setCustomer,
    toggleService,
    shiftWalkIn,
    setWalkInStart,
    setDate,
    setSlot,
    setCustomTime,
    checkTime,
    setPlan,
    setMethod,
    setPercent,
    setTransactionCode,
    setPayerPhone,
    setReference,
    setConfirmation,
    /** The catalogue the caller passed in, for the services step. */
    catalogue: services,
  }
}

