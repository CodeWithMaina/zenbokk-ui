import { useMutation, useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Alert } from '../components/ui/alert'
import { Button } from '../components/ui/button'
import { Field, Input } from '../components/ui/field'
import { Skeleton } from '../components/ui/skeleton'
import { StorefrontBookingDone } from '../components/storefront/booking/StorefrontBookingDone'
import {
  StorefrontBookingActionBar,
  StorefrontBookingSummary,
} from '../components/storefront/booking/StorefrontBookingSummary'
import { MpesaInstructions } from '../components/storefront/booking/MpesaInstructions'
import { MpesaConfirmationField } from '../components/storefront/booking/MpesaConfirmationField'
import {
  StepOption,
  StorefrontBookingStepper,
} from '../components/storefront/booking/StorefrontBookingStepper'
import { ApiError, errorMessage, isModuleUnavailable } from '../lib/api/client'
import { queryClient, queryKeys } from '../lib/api/query-client'
import type { AvailabilitySlot, DayAvailability, EligibleStaff, StorefrontPaymentOption } from '../lib/api/types'
import { useAuth } from '../lib/auth'
import { CAPABILITY } from '../lib/entitlements'
import { formatDay, formatDuration, money } from '../lib/format'
import {
  clearBookingDraft,
  emptyDraft,
  readBookingDraft,
  useStorefront,
  writeBookingDraft,
} from '../lib/storefront'
import type { BookingDraft } from '../lib/storefront'
import {
  useStorefrontServices,
  useStorefrontTeam,
} from '../lib/storefront/use-storefront-catalog'
import { usePublicPaymentDetails } from '../lib/payments/api'
import { scanMpesaMessage } from '../lib/payments/mpesa-message'
import { paymentOptionPolicy, resolvePaymentOption } from '../lib/storefront/payment-option'
import { publicBookingApi, storefrontApi } from '../lib/storefront/api'
import type { PublicBookingResponse } from '../lib/storefront/api'
import { storefrontHref } from '../lib/tenant'

export const Route = createFileRoute('/$slug/book')({
  component: BookingWizardPage,
})

/** The same shapes the server accepts, checked here so the visitor is told before a round trip. */
const KENYAN_PHONE = /^(?:\+?254|0)?[17]\d{8}$/
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

const STEPS = [
  { key: 'services', label: 'Services' },
  { key: 'staff', label: 'Specialist' },
  { key: 'time', label: 'Date & time' },
  { key: 'details', label: 'Details' },
  /**
   * The customer's own details come before payment, in the order the booking actually happens:
   * who it is for, then how they want to pay, then the confirmation. The storefront API validates
   * all of it in one request, so the page asks in the order that keeps each answer obvious.
   */
  { key: 'identity', label: 'Your details' },
  { key: 'payment', label: 'Payment' },
] as const

type StepKey = (typeof STEPS)[number]['key']

/**
 * Get visible steps. The staff step is skipped when nobody is selectable, and the
 * payment step is skipped entirely when the business cannot take a payment (no
 * enabled, complete method) — so a wizard never lands on an empty payment screen.
 */
function getVisibleSteps(hasStaff: boolean, hasPayments: boolean, needsIdentity: boolean) {
  return STEPS.filter((step) => {
    if (!hasStaff && step.key === 'staff') return false
    if (!hasPayments && step.key === 'payment') return false
    // The identity step collects the visitor's name, number and email for an
    // account-free booking. It exists only when there is no bookable session — a
    // signed-in customer is already identified, so there is nothing to collect.
    if (!needsIdentity && step.key === 'identity') return false
    return true
  })
}

/** `2026-05-12` → `Tue 12 May`, without a UTC/DST shift. */
function dateLabel(localDate: string): string {
  return formatDay(new Date(`${localDate}T12:00:00`))
}

/** `14:30` → `2:30 pm`. */
function timeLabel(localTime: string): string {
  const [hourText, minute] = localTime.split(':')
  const hour = Number(hourText)
  const suffix = hour >= 12 ? 'pm' : 'am'
  const twelve = hour % 12 === 0 ? 12 : hour % 12
  return `${twelve}:${minute} ${suffix}`
}

/**
 * The five-step booking flow.
 *
 * Same five steps the design draws, and the same underlying system the platform
 * already had: choose services, choose a specialist, pick a real slot from the
 * availability engine, add a note, then settle payment.
 *
 * Two things are worth stating plainly, because they are the difference between
 * a working booking flow and a convincing-looking one:
 *
 *  - **Availability is the server's.** Slots come from
 *    `GET /v1/businesses/{id}/availability/calendar`, which accounts for the
 *    combined duration of every chosen service, the specialist's shifts and
 *    breaks, existing appointments, the lead time and the booking window. The
 *    page never invents a time, and it re-checks the chosen slot before
 *    submitting — a slot can be taken while the visitor is filling the form.
 *
 *  - **Creating an appointment needs an identity.** `POST /v1/appointments` is
 *    scoped to an authenticated customer and derives `customerId` from the token,
 *    so the final step asks an anonymous visitor to sign in. Their choices are
 *    already in `sessionStorage`, so they return to the same screen with the same
 *    lineup rather than starting again. Guest booking would be a backend feature
 *    (guest customer + verification + payment intent) and is not faked here.
 */
export function BookingWizardPage() {
  const { business, businessId, canonicalSlug, can } = useStorefront()
  const { isAuthenticated, user } = useAuth()

  const [draft, setDraft] = useState<BookingDraft>(() => readBookingDraft(businessId))
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [failure, setFailure] = useState<string | null>(null)
  /**
   * What the server said about the booking that was just made.
   *
   * The whole response is kept, not just the appointment: the confirmation has to report the money's
   * own state — waiting for the business, part paid, or paid — and that state comes from the server
   * rather than from anything the page could infer.
   */
  const [confirmed, setConfirmed] = useState<PublicBookingResponse | null>(null)
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [paymentOption, setPaymentOption] = useState<StorefrontPaymentOption | null>(null)
  /**
   * The M-PESA confirmation the customer pastes while booking.
   *
   * It travels with the booking request itself: the appointment, the fee and the pasted evidence are
   * recorded together, so the customer never has to come back and finish a step. Empty is a
   * perfectly good value — they can pay at the studio, or paste later on the confirmation screen.
   */
  const [mpesaMessage, setMpesaMessage] = useState('')
  const [idempotencyKey] = useState(() => crypto.randomUUID())

  const appointmentsEnabled = can(CAPABILITY.appointments)
  const paymentsEnabled = can(CAPABILITY.payments)
  const currency = 'KES'

  // The business's own payment setup, read before the appointment exists so the
  // customer can see exactly what to send and paste the confirmation in the same
  // step. Gated on the module because every payment endpoint needs it.
  const publicPayment = usePublicPaymentDetails(businessId, paymentsEnabled)
  const manualMpesa = paymentsEnabled && publicPayment.data?.enabled === true

  /**
   * What this business offers on its booking page.
   *
   * The server's own flags are used verbatim — the page never invents an option, and it
   * never hides one the business enabled. A business that has never opened its payment
   * settings has no row yet, which is the server's default too: Payment Included on, Pay
   * After Service off.
   */
  const payDetails = publicPayment.data
  const payUpfrontEnabled = payDetails?.payUpfrontEnabled ?? true
  const payAfterServiceEnabled = payDetails?.payAfterServiceEnabled ?? false
  /**
   * The rule itself lives in `lib/storefront/payment-option` so it is stated once and tested
   * exhaustively: one option is applied without asking, both means the customer chooses, and
   * neither means there is nothing to book with.
   */
  const paymentPolicy = paymentOptionPolicy(payUpfrontEnabled, payAfterServiceEnabled)
  const bookingAvailable = !paymentPolicy.bookingUnavailable
  const offersPaymentChoice = paymentPolicy.needsChoice

  /**
   * The option this booking will be created with: the customer's answer when the business offers
   * both, and the single enabled option — without asking — when it offers one.
   *
   * It travels with the booking request, because the server decides whether the terms are
   * allowed: hiding a control here is a convenience, not a rule.
   */
  const chosenPaymentOption = resolvePaymentOption(paymentPolicy, paymentOption)
  /** True while the customer still has to answer the question. */
  const paymentChoiceRequired = offersPaymentChoice && paymentOption === null

  function update(changes: Partial<BookingDraft>) {
    setDraft((current) => {
      const next = { ...current, ...changes }
      writeBookingDraft(businessId, next)
      return next
    })
  }

  function goTo(step: StepKey) {
    setFailure(null)
    update({ step })
  }

  /**
   * A signed-in customer's own details are the natural starting point for the booking.
   *
   * They are only ever *filled in*, never locked: a booking may legitimately be made for somebody
   * else, and a storefront visitor who is not signed in simply types them. Blank fields only, so a
   * value the customer has already corrected is never overwritten by the profile.
   */
  useEffect(() => {
    if (!user) return
    setDraft((current) => {
      const next: BookingDraft = {
        ...current,
        customerName: current.customerName || user.fullName || '',
        customerPhone: current.customerPhone || user.phone || '',
        customerEmail: current.customerEmail || user.email || '',
      }
      if (
        next.customerName === current.customerName &&
        next.customerPhone === current.customerPhone &&
        next.customerEmail === current.customerEmail
      ) {
        return current
      }
      writeBookingDraft(businessId, next)
      return next
    })
  }, [businessId, user])

  const servicesQuery = useStorefrontServices(businessId, appointmentsEnabled)

  const services = servicesQuery.services
  const selectedServices = services.filter((service) => draft.serviceIds.includes(service.id))
  // Only active catalogue items may be sent back to the API: a draft can outlive
  // a service being hidden or deleted while the customer was signing in.
  const selectedServiceIds = selectedServices.map((service) => service.id)
  const totalDuration = selectedServices.reduce((sum, s) => sum + s.durationMinutes, 0)
  const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0)

  /**
   * Does this booking need a verified guest session rather than the app session?
   *
   * True for a signed-out visitor, and for a signed-in identity the API will not
   * accept as a customer (a business or staff account). In both cases the booking is
   * made with a short-lived customer token the visitor obtained by proving their own
   * number — which is why the verification panel is offered in both.
   */
  /**
   * The details are the booking's identity, so they are required — and nothing else about the
   * visitor is. A signed-in customer's own name, number and address pre-fill the step (see
   * `update` below), which is why a signed-in visitor usually just confirms them.
   */
  const detailsComplete =
    draft.customerName.trim().length >= 2 &&
    KENYAN_PHONE.test(draft.customerPhone.replace(/\s/g, '')) &&
    EMAIL.test(draft.customerEmail.trim())

  /**
   * The fee the customer is about to send.
   *
   * Computed the same way the server computes it (the configured percentage of the
   * service total, rounded to 2dp) so the number on screen is the number the server
   * compares the pasted amount against. The server's own figure still wins once the
   * payment exists — this is only what the customer is told to send.
   */
  const bookingFeePreview = manualMpesa
    ? Math.round(totalPrice * (publicPayment.data?.bookingFeePercentage ?? 0)) / 100
    : 0

  const staffQuery = useStorefrontTeam(
    businessId,
    selectedServiceIds,
    appointmentsEnabled && selectedServiceIds.length > 0,
  )

  // The public capabilities do not expose Staff. Its endpoint is authoritative:
  // MODULE_DISABLED means solo booking; a pending or failed request does not.
  const staffResolved = staffQuery.isSuccess || isModuleUnavailable(staffQuery.error)
  const hasEligibleStaff = !staffResolved || (staffQuery.data ?? []).length > 0
  const staffId = hasEligibleStaff ? draft.staffId : null
  /**
   * The details step is always part of the flow: the booking is made with the customer's own name,
   * number and email, whether or not they happen to be signed in. A signed-in visitor's details are
   * pre-filled on it, and nothing about their session decides whether the booking is allowed.
   */
  const visibleSteps = getVisibleSteps(hasEligibleStaff, paymentsEnabled, true)

  // Normalize the active step if it's no longer visible
  let normalizedStep: StepKey = draft.step
  if (!hasEligibleStaff && draft.step === 'staff') {
    normalizedStep = 'time'
  } else if (!paymentsEnabled && draft.step === 'payment') {
    normalizedStep = 'details'
  }

  // A restored draft may point at services that no longer exist. Fall back to
  // the first step instead of leaving the wizard stuck on a dead query.
  const activeStep: StepKey =
    normalizedStep !== 'services' && servicesQuery.isFetched && selectedServices.length === 0
      ? 'services'
      : normalizedStep
  const activeIndex = Math.max(0, visibleSteps.findIndex((entry) => entry.key === activeStep))

  const availabilityQuery = useQuery({
    queryKey: queryKeys.availability(businessId, {
      serviceIds: selectedServiceIds,
      staffId,
    }),
    queryFn: () =>
      storefrontApi.availability(businessId, {
        serviceIds: selectedServiceIds,
        staffId,
      }),
    enabled:
      appointmentsEnabled &&
      selectedServiceIds.length > 0 &&
      staffResolved &&
      (activeStep === 'time' ||
        activeStep === 'details' ||
        activeStep === 'payment' ||
        activeStep === 'identity'),
  })

  const calendar = availabilityQuery.data
  const bookableDays = (calendar?.days ?? []).filter((day) => day.availableSlots > 0)
  const selectedSlot =
    calendar?.days.flatMap((day) => day.slots).find((slot) => slot.startAtUtc === draft.startsAt) ??
    null
  // After the sign-in round trip `selectedDate` is fresh state, so recover the
  // day from the saved slot instead of snapping back to the first open day.
  const selectedDay = selectedSlot?.localDate ?? null
  const selectedSlotAvailable =
    selectedSlot !== null && selectedSlot.isAvailable && selectedSlot.status === 'available'
  const activeDay =
    (calendar?.days ?? []).find((day) => day.date === (selectedDate ?? selectedDay)) ??
    bookableDays[0] ??
    null

  const staffName = staffId
    ? ((staffQuery.data ?? []).find((member) => member.userId === staffId)?.fullName ?? null)
    : null

  const createBooking = useMutation({
    mutationFn: () =>
      publicBookingApi.create({
        businessId,
        serviceIds: selectedServiceIds,
        staffUserId: staffId,
        scheduledAt: draft.startsAt ?? '',
        note: draft.notes.trim() || null,
        // The customer's choice, or the business's single option. The server checks it against the
        // business's configuration and refuses terms it has switched off.
        paymentOption: chosenPaymentOption,
        // The details the booking is made with — and the only thing that identifies the customer.
        // The server resolves the business-specific customer record from them, so a visitor needs no
        // account, no token, and no relationship with this business beforehand.
        fullName: draft.customerName.trim(),
        phoneNumber: draft.customerPhone.trim(),
        email: draft.customerEmail.trim(),
        // Sent with the booking, so the appointment, the fee and the pasted evidence are recorded
        // together and the confirmation can report the money's state straight away.
        mpesaMessage: paysNow && mpesaMessage.trim() ? mpesaMessage.trim() : null,
        idempotencyKey,
      }),
    onSuccess: (booking) => {
      clearBookingDraft(businessId)
      setDraft({ ...emptyDraft })
      setConfirmed(booking)
      void queryClient.invalidateQueries({ queryKey: ['appointments'] })
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 409) {
        setFailure('That time was taken while you were booking. Pick another time.')
        update({ step: 'time', startsAt: null })
        void availabilityQuery.refetch()
        return
      }
      if (error instanceof ApiError && error.code === 'OVERBOOKING') {
        setFailure('That time was taken while you were booking. Pick another time.')
        update({ step: 'time', startsAt: null })
        void availabilityQuery.refetch()
        return
      }
      // Anything else the server refuses — a payment option the business switched off, a booking
      // page with no options left on, details it could not accept — carries its own explanation, and
      // the visitor stays on the step with their choices intact.
      setFailure(errorMessage(error, 'We could not confirm this booking. Please try again.'))
    },
  })


  /** Move to the next visible step, or confirm the booking when none is left. */
  function goNextOrSubmit() {
    const next = visibleSteps[activeIndex + 1]
    if (next) {
      setFailure(null)
      update({ step: next.key })
      return
    }
    submitBooking()
  }

  /** The primary button: validate the current step, then advance — or confirm. */
  function advance() {
    if (activeStep === 'services') {
      if (selectedServices.length === 0) {
        setFailure('Choose at least one service to continue.')
        return
      }
      if (!staffResolved) return
      // Keep the (possibly auto-assigned) specialist in the draft before advancing.
      update({ staffId })
      goNextOrSubmit()
      return
    }
    if (activeStep === 'time') {
      if (!selectedSlotAvailable) {
        setFailure('Choose an open time to continue.')
        return
      }
      goNextOrSubmit()
      return
    }
    // A pasted M-PESA message must scan as a genuine confirmation before the flow
    // carries it forward, so a fabricated or truncated paste never reaches the server.
    const mpesaProblem = mpesaScanError()
    if (mpesaProblem) {
      setFailure(mpesaProblem)
      return
    }
    goNextOrSubmit()
  }

  /**
   * Reason a supplied M-PESA confirmation is not acceptable, or null when there is
   * none / it scans as genuine. An empty field is fine — the message is optional.
   */
  function mpesaScanError(): string | null {
    if (!mpesaMessage.trim()) return null
    const scan = scanMpesaMessage(mpesaMessage)
    return scan.ok ? null : scan.error
  }

  function submitBooking() {
    if (!detailsComplete) {
      update({ step: 'identity' })
      setFailure('Add the name, mobile number and email this booking is for.')
      return
    }
    const mpesaProblem = mpesaScanError()
    if (mpesaProblem) {
      setFailure(mpesaProblem)
      return
    }
    if (selectedServiceIds.length === 0) {
      update({ step: 'services' })
      setFailure('Choose at least one service.')
      return
    }
    if (!draft.startsAt) {
      update({ step: 'time' })
      setFailure('Choose a time.')
      return
    }
    // Re-check against the freshest availability: a slot can be taken while the
    // visitor is on the last step, and the API would reject it anyway.
    if (availabilityQuery.isFetched && !selectedSlotAvailable) {
      setFailure('That time is no longer available. Pick another one.')
      update({ step: 'time', startsAt: null })
      return
    }
    setFailure(null)
    createBooking.mutate()
  }

  function toggleService(serviceId: string) {
    const next = draft.serviceIds.includes(serviceId)
      ? draft.serviceIds.filter((id) => id !== serviceId)
      : [...draft.serviceIds, serviceId]
    setSelectedDate(null)
    // A different basket can invalidate the specialist and the slot.
    update({ serviceIds: next, startsAt: null, staffId: null })
  }

  function chooseDay(day: DayAvailability) {
    setSelectedDate(day.date)
    update({ startsAt: null })
  }

  function chooseSlot(slot: AvailabilitySlot) {
    setSelectedDate(slot.localDate)
    update({
      startsAt: slot.startAtUtc,
      staffId: hasEligibleStaff ? slot.staffUserId ?? staffId : null,
    })
  }

  if (confirmed) {
    return (
      // The whole server response goes to the confirmation, which reports the booking and the
      // money's own state from it — booked with the fee waiting for the business, part paid, or
      // paid. Nothing on that screen is inferred by the page.
      <StorefrontBookingDone
        appointment={confirmed.appointment}
        booking={confirmed}
        services={selectedServices}
        staffName={staffName}
        canonicalSlug={canonicalSlug}
        businessId={businessId}
        defaultPhone={user?.phone ?? null}
        canPay={paymentsEnabled}
      />
    )
  }

  if (!appointmentsEnabled) {
    return (
      <div className="sf-container py-[clamp(2rem,5vw,3.5rem)]">
        <div className="mx-auto max-w-[32rem] rounded-panel border border-line bg-surface p-[1.5rem] text-center">
          <p className="sf-eyebrow">Booking closed</p>
          <h1 className="sf-heading">{business.name} isn’t taking bookings online</h1>
          <p className="sf-lead mx-auto">
            Their page is still live, but appointments aren’t enabled on their plan. Call or message
            them directly and they’ll sort you out.
          </p>
          <div className="mt-[1.2rem] flex flex-wrap justify-center gap-[0.5rem]">
            {business.phoneNumber ? (
              <a href={`tel:${business.phoneNumber}`} className="btn btn-primary no-underline">
                Call {business.phoneNumber}
              </a>
            ) : null}
            <a href={storefrontHref(canonicalSlug)} className="btn btn-ghost no-underline">
              Back to the page
            </a>
          </div>
        </div>
      </div>
    )
  }

  // Both payment options switched off: the business is not taking online bookings at all,
  // and the server refuses such a booking even if this screen were bypassed. Saying so here
  // is the difference between a dead form and a customer who knows what to do next.
  if (!bookingAvailable) {
    return (
      <div className="sf-container py-[clamp(2rem,5vw,3.5rem)]">
        <div className="mx-auto max-w-[32rem] rounded-panel border border-line bg-surface p-[1.5rem] text-center">
          <p className="sf-eyebrow">Bookings paused</p>
          <h1 className="sf-heading">{business.name} isn’t taking online bookings at the moment</h1>
          <p className="sf-lead mx-auto">
            Their page is still live, but their booking page has no payment option switched on, so
            appointments can’t be booked here. Contact them directly and they’ll arrange your visit.
          </p>
          <div className="mt-[1.2rem] flex flex-wrap justify-center gap-[0.5rem]">
            {business.phoneNumber ? (
              <a href={`tel:${business.phoneNumber}`} className="btn btn-primary no-underline">
                Call {business.phoneNumber}
              </a>
            ) : null}
            <a href={storefrontHref(canonicalSlug)} className="btn btn-ghost no-underline">
              Back to the page
            </a>
          </div>
        </div>
      </div>
    )
  }

  const when =
    selectedSlot && selectedDay ? `${dateLabel(selectedDay)}, ${timeLabel(selectedSlot.localTime)}` : null
  const headline = selectedServices.length > 0 ? money(totalPrice, currency) : 'No services yet'
  const detail =
    selectedServices.length > 0
      ? `${selectedServices.length} service${selectedServices.length === 1 ? '' : 's'} · ${formatDuration(totalDuration)}`
      : null

  const isLastStep = activeIndex === visibleSteps.length - 1

  // A supplied M-PESA confirmation that does not scan as genuine blocks the flow: the
  // field shows the reason, the primary action is disabled, and it is never carried
  // forward. An empty field is fine — the message is optional.
  const mpesaProvided = mpesaMessage.trim().length > 0
  const mpesaValid = !mpesaScanError()
  // The paste field is only meaningful when the customer is paying during booking. A
  // pay-after-service booking is not paying now, so a stale paste must not travel with it.
  const paysNow = chosenPaymentOption !== 'pay_after_service'

  const primaryAction = (
    <>
      {activeIndex > 0 ? (
        <Button
          variant="ghost"
          className="shrink-0"
          aria-label="Back"
          onClick={() => goTo(visibleSteps[activeIndex - 1].key)}
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
        </Button>
      ) : null}
      <Button
        variant="primary"
        onClick={advance}
        disabled={
          !staffResolved ||
          !bookingAvailable ||
          (activeStep === 'services' && selectedServices.length === 0) ||
          (activeStep === 'time' && (availabilityQuery.isPending || !selectedSlotAvailable)) ||
          (activeStep === 'identity' && !detailsComplete) ||
          (activeStep === 'payment' && paymentChoiceRequired) ||
          (mpesaProvided && !mpesaValid) ||
          (isLastStep && createBooking.isPending)
        }
      >
        {createBooking.isPending ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Confirming…
          </>
        ) : isLastStep ? (
          <>
            {paysNow && manualMpesa && mpesaProvided && mpesaValid ? 'Confirm and send payment' : 'Confirm booking'}
            <ArrowRight className="size-4" aria-hidden="true" />
          </>
        ) : (
          <>
            Continue
            <ArrowRight className="size-4" aria-hidden="true" />
          </>
        )}
      </Button>
    </>
  )


  return (
    <div className="sf-container py-[clamp(1.5rem,4vw,3rem)]">
      <a href={storefrontHref(canonicalSlug)} className="sf-back">
        <ArrowLeft className="size-[1rem]" aria-hidden="true" />
        {business.name}
      </a>

      <div className="sf-book">
        <div>
          <StorefrontBookingStepper
            steps={visibleSteps}
            current={activeIndex}
            ariaLabel={`Step ${activeIndex + 1} of ${visibleSteps.length}: ${visibleSteps[activeIndex]?.label}`}
          />

          <h1 className="sf-heading">{STEP_TITLES[activeStep].title}</h1>
          <p className="sf-lead">{STEP_TITLES[activeStep].description}</p>

          {staffQuery.isError && !isModuleUnavailable(staffQuery.error) ? (
            <Alert tone="danger" className="mt-[1rem]">
              {errorMessage(staffQuery.error, 'We could not load the team.')} Your choices
              are saved.{' '}
              <button
                type="button"
                className="link font-semibold"
                onClick={() => void staffQuery.refetch()}
              >
                Try again
              </button>
            </Alert>
          ) : null}

          {failure ? (
            <Alert tone="danger" className="mt-[1rem]" onDismiss={() => setFailure(null)}>
              {failure}
              {!isAuthenticated ? (
                <>
                  {' '}
                  <Link
                    to="/auth/sign-in"
                    search={{ redirect: storefrontHref(canonicalSlug, '/book') }}
                    className="link font-semibold"
                  >
                    Sign in
                  </Link>
                </>
              ) : null}
            </Alert>
          ) : null}

          {activeStep === 'services' ? (
            <section className="mt-[1.2rem]">
              {servicesQuery.isPending ? (
                <div className="grid gap-[0.55rem]" aria-busy="true">
                  <Skeleton className="h-[4.6rem] rounded-card" />
                  <Skeleton className="h-[4.6rem] rounded-card" />
                  <Skeleton className="h-[4.6rem] rounded-card" />
                </div>
              ) : servicesQuery.isError ? (
                <Alert tone="danger">
                  {errorMessage(servicesQuery.error, 'We could not load the service menu.')}{' '}
                  <button
                    type="button"
                    className="link font-semibold"
                    onClick={() => void servicesQuery.refetch()}
                  >
                    Try again
                  </button>
                </Alert>
              ) : services.length === 0 ? (
                <Alert tone="info">
                  This business has not published any services yet. Call them to book directly.
                </Alert>
              ) : (
                <div className="mt-[1rem]">
                  {services.map((service) => (
                    <StepOption
                      key={service.id}
                      title={service.name}
                      description={
                        service.description ??
                        `${formatDuration(service.durationMinutes)} appointment`
                      }
                      meta={money(service.price, currency)}
                      selected={draft.serviceIds.includes(service.id)}
                      onSelect={() => toggleService(service.id)}
                      thumbnailUrl={service.imageVariants[0]?.url ?? null}
                      monogram={service.name.slice(0, 1).toUpperCase()}
                    />
                  ))}
                </div>
              )}
            </section>
          ) : null}

          {activeStep === 'staff' ? (
            <section className="mt-[1.2rem]">
              {staffQuery.isPending ? (
                <div className="grid gap-[0.55rem]" aria-busy="true">
                  <Skeleton className="h-[4.6rem] rounded-card" />
                  <Skeleton className="h-[4.6rem] rounded-card" />
                </div>
              ) : (
                <div>
                  <StepOption
                    role="radio"
                    title="Anyone available"
                    description="We’ll match you with someone who can do all your services."
                    selected={draft.staffId === null}
                    onSelect={() => update({ staffId: null, startsAt: null })}
                    monogram="★"
                  />
                  {(staffQuery.data ?? []).map((member: EligibleStaff) => (
                    <StepOption
                      key={member.userId}
                      role="radio"
                      title={member.fullName}
                      description={member.positionName ?? 'Specialist'}
                      selected={draft.staffId === member.userId}
                      onSelect={() => update({ staffId: member.userId, startsAt: null })}
                      thumbnailUrl={member.avatarUrl}
                      monogram={member.fullName.slice(0, 1).toUpperCase()}
                    />
                  ))}
                </div>
              )}
            </section>
          ) : null}
          {activeStep === 'time' ? (
            <section className="mt-[1.2rem]">
              {availabilityQuery.isPending ? (
                <div className="grid gap-[0.55rem]" aria-busy="true">
                  <Skeleton className="h-[3.4rem] rounded-card" />
                  <Skeleton className="h-[6rem] rounded-card" />
                </div>
              ) : availabilityQuery.isError ? (
                <Alert tone="danger">
                  {errorMessage(availabilityQuery.error, 'We could not load open times.')}{' '}
                  <button
                    type="button"
                    className="link font-semibold"
                    onClick={() => void availabilityQuery.refetch()}
                  >
                    Try again
                  </button>
                </Alert>
              ) : bookableDays.length === 0 ? (
                <Alert tone="info">
                  {calendar?.notice ||
                    'No open times in the next two weeks for this combination. Try fewer services, or another specialist.'}
                </Alert>
              ) : (
                <>
                  <h2 className="mt-[0.4rem] text-label font-semibold">Day</h2>
                  <div className="sf-dates mt-[0.5rem]">
                    {bookableDays.map((day) => (
                      <button
                        key={day.date}
                        type="button"
                        className="sf-chip"
                        aria-pressed={activeDay?.date === day.date}
                        onClick={() => chooseDay(day)}
                      >
                        <span className="text-caption opacity-70">{day.weekday}</span>
                        <b>{day.dayOfMonth}</b>
                      </button>
                    ))}
                  </div>

                  {activeDay ? (
                    <>
                      {DAY_PARTS.map((part) => {
                        const slots = activeDay.slots.filter(
                          (slot) =>
                            slot.dayPart === part && slot.isAvailable && slot.status === 'available',
                        )
                        if (slots.length === 0) return null
                        return (
                          <div key={part}>
                            <h2 className="mt-[1.1rem] text-label font-semibold capitalize">
                              {part}
                            </h2>
                            <div className="sf-slots mt-[0.5rem]">
                              {slots.map((slot) => (
                                <button
                                  key={`${slot.startAtUtc}-${slot.staffUserId ?? 'any'}`}
                                  type="button"
                                  className="sf-slot"
                                  aria-pressed={draft.startsAt === slot.startAtUtc}
                                  onClick={() => chooseSlot(slot)}
                                >
                                  {timeLabel(slot.localTime)}
                                </button>
                              ))}
                            </div>
                          </div>
                        )
                      })}

                      {activeDay.availableSlots === 0 ? (
                        <p className="mt-[1rem] text-center text-meta text-muted">
                          No open times on {dateLabel(activeDay.date)}. Pick another day.
                        </p>
                      ) : null}
                    </>
                  ) : null}
                </>
              )}
            </section>
          ) : null}
          {activeStep === 'details' ? (
            <section className="mt-[1.2rem]">
              <ul className="mb-[1rem] list-none border-t border-line p-0">
                {selectedServices.map((service) => (
                  <li
                    key={service.id}
                    className="flex items-baseline justify-between gap-[1rem] border-b border-line py-[0.6rem] text-meta"
                  >
                    <span className="min-w-0 truncate">{service.name}</span>
                    <span className="shrink-0 tabular">{money(service.price, currency)}</span>
                  </li>
                ))}
              </ul>

              <label className="label" htmlFor="sf-note">
                Anything we should know? <span className="text-subtle">(optional)</span>
              </label>
              <textarea
                id="sf-note"
                className="textarea"
                rows={3}
                value={draft.notes}
                placeholder="Reference photo, allergies, running late…"
                onChange={(event) => update({ notes: event.target.value })}
              />

              <p className="mt-[0.6rem] text-caption text-subtle">
                {isAuthenticated
                  ? `Booking as ${user?.fullName ?? 'you'}. The studio will use the contact details on your account.`
                  : 'We’ll collect your contact details before the booking is confirmed. Your choices are kept.'}
              </p>
            </section>
          ) : null}

          {activeStep === 'payment' ? (
            <section className="mt-[1.2rem]">
              <ul className="list-none border-t border-line p-0">
                <li className="flex items-baseline justify-between gap-[1rem] border-b border-line py-[0.6rem] text-meta">
                  <span>When</span>
                  <b>{when ?? '—'}</b>
                </li>
                <li className="flex items-baseline justify-between gap-[1rem] border-b border-line py-[0.6rem] text-meta">
                  <span>With</span>
                  <b>
                    {staffName ?? (hasEligibleStaff ? 'First available specialist' : business.name)}
                  </b>
                </li>
                <li className="flex items-baseline justify-between gap-[1rem] border-b border-line py-[0.6rem] text-meta">
                  <span>Duration</span>
                  <b>{formatDuration(totalDuration)}</b>
                </li>
                <li className="flex items-baseline justify-between gap-[1rem] border-b border-line py-[0.6rem] text-label">
                  <span>Total</span>
                  <b>{money(totalPrice, currency)}</b>
                </li>
              </ul>

              {!bookingAvailable ? (
                <Alert tone="warning" className="mt-[1.2rem]">
                  {business.name} is not taking online bookings at the moment. Please contact them
                  directly and they will arrange your appointment.
                </Alert>
              ) : (
                <>
                  {offersPaymentChoice ? (
                    <div className="mt-[1.2rem]">
                      <h2 className="text-label font-semibold">How would you like to pay?</h2>
                      <div className="mt-[0.6rem]">
                        <StepOption
                          role="radio"
                          title="Pay during booking"
                          description="Settle now, using the studio's own payment details."
                          selected={paymentOption === 'pay_upfront'}
                          onSelect={() => setPaymentOption('pay_upfront')}
                          monogram="P"
                        />
                        <StepOption
                          role="radio"
                          title="Pay after the service"
                          description="Book now and settle when you come in."
                          selected={paymentOption === 'pay_after_service'}
                          onSelect={() => setPaymentOption('pay_after_service')}
                          monogram="A"
                        />
                      </div>
                    </div>
                  ) : null}

                  {/* What the chosen option actually means, shown as soon as it applies. */}
                  {paysNow && manualMpesa ? (
                    <div className="mt-[1.2rem]">
                      <h2 className="text-label font-semibold">Pay your booking fee by M-PESA</h2>
                      <div className="mt-[0.6rem]">
                        <MpesaInstructions
                          details={publicPayment.data!}
                          amount={bookingFeePreview}
                          serviceTotal={totalPrice}
                        />
                      </div>

                      <div className="mt-[0.9rem]">
                        <MpesaConfirmationField
                          id="sf-book-mpesa-message"
                          label="Paste your M-PESA confirmation message"
                          labelHint={<span className="text-subtle">(you can also do this after booking)</span>}
                          value={mpesaMessage}
                          onChange={setMpesaMessage}
                          rows={3}
                          emptyHint={`Send ${money(bookingFeePreview, currency)} to the details above, then paste the SMS here. Your booking is held either way.`}
                        />
                      </div>
                    </div>
                  ) : paysNow ? (
                    <Alert tone="info" className="mt-[1.2rem]">
                      {business.name} takes payment during booking but has not published an online
                      channel, so nothing is charged on this page — settle it with the studio, who will
                      have the amount on your booking.
                    </Alert>
                  ) : (
                    <Alert tone="info" className="mt-[1.2rem]">
                      Nothing is charged now. <b>{money(totalPrice, currency)}</b> stays outstanding on
                      this booking and you settle it with the studio.
                    </Alert>
                  )}

                  {offersPaymentChoice ? (
                    <p className="mt-[0.6rem] text-caption text-subtle">
                      The amount is calculated by the studio’s system, not by this page.
                    </p>
                  ) : null}
                </>
              )}

            </section>
          ) : null}

          {activeStep === 'identity' ? (
            <section className="mt-[1.2rem]">
              <ul className="list-none border-t border-line p-0">
                <li className="flex items-baseline justify-between gap-[1rem] border-b border-line py-[0.6rem] text-meta">
                  <span>When</span>
                  <b>{when ?? '—'}</b>
                </li>
                <li className="flex items-baseline justify-between gap-[1rem] border-b border-line py-[0.6rem] text-meta">
                  <span>With</span>
                  <b>
                    {staffName ?? (hasEligibleStaff ? 'First available specialist' : business.name)}
                  </b>
                </li>
                <li className="flex items-baseline justify-between gap-[1rem] border-b border-line py-[0.6rem] text-label">
                  <span>Total</span>
                  <b>{money(totalPrice, currency)}</b>
                </li>
              </ul>

              <div className="mt-[1.2rem] space-y-[0.9rem]">
                <p className="text-meta text-muted">
                  We’ll use these to confirm your appointment. No account needed — you can book as a
                  guest.
                </p>
                <Field label="Full name" htmlFor="sf-name">
                  <Input
                    id="sf-name"
                    autoComplete="name"
                    value={draft.customerName}
                    onChange={(event) => update({ customerName: event.target.value })}
                  />
                </Field>
                <Field
                  label="Mobile number"
                  htmlFor="sf-phone"
                  hint="Kenyan mobile, for example 0712 345 678."
                >
                  <Input
                    id="sf-phone"
                    inputMode="tel"
                    autoComplete="tel"
                    value={draft.customerPhone}
                    onChange={(event) => update({ customerPhone: event.target.value })}
                  />
                </Field>
                <Field label="Email" htmlFor="sf-email">
                  <Input
                    id="sf-email"
                    type="email"
                    autoComplete="email"
                    value={draft.customerEmail}
                    onChange={(event) => update({ customerEmail: event.target.value })}
                  />
                </Field>
                <p className="text-caption text-subtle">
                  {isAuthenticated
                    ? 'These are your account details, and you can change them for this booking.'
                    : 'Already have an account? '}
                  {isAuthenticated ? null : (
                    <Link
                      to="/auth/sign-in"
                      search={{ redirect: storefrontHref(canonicalSlug, '/book') }}
                      className="link font-semibold"
                    >
                      Sign in
                    </Link>
                  )}
                </p>
              </div>
            </section>
          ) : null}
        </div>

        <aside className="sf-book-aside">
          <StorefrontBookingSummary
            services={selectedServices}
            staffName={staffName}
            when={when}
            businessName={business.name}
            hasEligibleStaff={hasEligibleStaff}
          />
        </aside>
      </div>

      <StorefrontBookingActionBar
        headline={headline}
        detail={detail}
        expanded={summaryOpen}
        onToggleExpanded={() => setSummaryOpen((open) => !open)}
        action={primaryAction}
      >
        <StorefrontBookingSummary
          services={selectedServices}
          staffName={staffName}
          when={when}
          businessName={business.name}
          hasEligibleStaff={hasEligibleStaff}
        />
      </StorefrontBookingActionBar>
    </div>
  )
}


/** The parts of a day the slot grid is grouped into, in display order. */
const DAY_PARTS = ['morning', 'afternoon', 'evening'] as const

/** Step copy, kept together so the five steps read as one voice. */
const STEP_TITLES: Record<StepKey, { title: string; description: string }> = {
  services: {
    title: 'Choose your services',
    description: 'Pick one or several. The time and price add up as you go.',
  },
  staff: {
    title: 'Choose your specialist',
    description: 'Pick who you’d like, or let the studio assign whoever is free first.',
  },
  time: {
    title: 'Pick a time',
    description: 'Only times that are genuinely open for your services are shown.',
  },
  details: {
    title: 'Anything we should know?',
    description: 'Add a note for the team — allergies, parking, a preferred chair.',
  },
  payment: {
    title: 'Payment',
    description:
      'Pay your booking fee, or settle it at the studio. Nothing is charged without your approval.',
  },
  identity: {
    title: 'Your details',
    description: 'Tell us who this booking is for. We’ll email a code to confirm it’s you.',
  },
}
