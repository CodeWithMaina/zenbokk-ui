import { useMutation, useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { Alert } from '../components/ui/alert'
import { Button } from '../components/ui/button'
import { Skeleton } from '../components/ui/skeleton'
import { StorefrontBookingDone } from '../components/storefront/booking/StorefrontBookingDone'
import { GuestVerifyPanel } from '../components/storefront/booking/GuestVerifyPanel'
import {
  StorefrontBookingActionBar,
  StorefrontBookingSummary,
} from '../components/storefront/booking/StorefrontBookingSummary'
import { MpesaInstructions } from '../components/storefront/booking/MpesaInstructions'
import {
  StepOption,
  StorefrontBookingStepper,
} from '../components/storefront/booking/StorefrontBookingStepper'
import { ApiError, errorMessage, isModuleUnavailable } from '../lib/api/client'
import { queryClient, queryKeys } from '../lib/api/query-client'
import type { Appointment, AvailabilitySlot, DayAvailability, EligibleStaff } from '../lib/api/types'
import { useAuth } from '../lib/auth'
import { CAPABILITY } from '../lib/entitlements'
import { formatDay, formatDuration, money } from '../lib/format'
import {
  bookingApi,
  clearBookingDraft,
  clearGuestSession,
  emptyDraft,
  guestTokenFor,
  readBookingDraft,
  readGuestSession,
  useStorefront,
  writeBookingDraft,
} from '../lib/storefront'
import type { BookingDraft } from '../lib/storefront'
import {
  useStorefrontServices,
  useStorefrontTeam,
} from '../lib/storefront/use-storefront-catalog'
import { usePublicPaymentDetails } from '../lib/payments/api'
import { storefrontApi } from '../lib/storefront/api'
import { storefrontHref } from '../lib/tenant'

export const Route = createFileRoute('/$slug/book')({
  component: BookingWizardPage,
})

const STEPS = [
  { key: 'services', label: 'Services' },
  { key: 'staff', label: 'Specialist' },
  { key: 'time', label: 'Date & time' },
  { key: 'details', label: 'Details' },
  { key: 'payment', label: 'Payment' },
] as const

type StepKey = (typeof STEPS)[number]['key']

/**
 * Get visible steps based on whether staff exists.
 * If there's no staff, skip the staff selection step entirely.
 */
function getVisibleSteps(hasStaff: boolean) {
  if (hasStaff) return STEPS
  return STEPS.filter((step) => step.key !== 'staff')
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
  const [confirmed, setConfirmed] = useState<Appointment | null>(null)
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [paymentChoice, setPaymentChoice] = useState<'mpesa' | 'studio' | null>(null)
  /**
   * The M-PESA confirmation the customer pastes while booking.
   *
   * It is carried to the confirmation screen, which creates the booking-fee payment
   * and submits it — the appointment has to exist before a payment can be attached to
   * it, so the paste is collected here and sent the moment the booking lands. Empty is
   * a perfectly good value: the customer can pay later and paste on the confirmation
   * screen instead.
   */
  const [mpesaMessage, setMpesaMessage] = useState('')

  // A guest who has already verified in this session (or in a previous step of
  // the same session) is not asked again. The token itself lives in
  // `sessionStorage`, not in the app's session store — a guest has no profile.
  const [guestVerified, setGuestVerified] = useState(() => Boolean(guestTokenFor(businessId)))
  const [guestName, setGuestName] = useState(() => readGuestSession(businessId)?.fullName ?? '')

  const appointmentsEnabled = can(CAPABILITY.appointments)
  const paymentsEnabled = can(CAPABILITY.payments)
  const currency = 'KES'

  // The business's own payment setup, read before the appointment exists so the
  // customer can see exactly what to send and paste the confirmation in the same
  // step. Gated on the module because every payment endpoint needs it.
  const publicPayment = usePublicPaymentDetails(businessId, paymentsEnabled)
  const manualMpesa = paymentsEnabled && publicPayment.data?.enabled === true

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

  const servicesQuery = useStorefrontServices(businessId, appointmentsEnabled)

  const services = servicesQuery.services
  const selectedServices = services.filter((service) => draft.serviceIds.includes(service.id))
  // Only active catalogue items may be sent back to the API: a draft can outlive
  // a service being hidden or deleted while the customer was signing in.
  const selectedServiceIds = selectedServices.map((service) => service.id)
  const totalDuration = selectedServices.reduce((sum, s) => sum + s.durationMinutes, 0)
  const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0)

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
  const visibleSteps = getVisibleSteps(hasEligibleStaff)

  // Normalize the active step if it's no longer visible
  let normalizedStep: StepKey = draft.step
  if (!hasEligibleStaff && draft.step === 'staff') {
    normalizedStep = 'time'
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
      (activeStep === 'time' || activeStep === 'details' || activeStep === 'payment'),
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
      bookingApi.create(
        {
          businessId,
          serviceIds: selectedServiceIds,
          staffUserId: staffId,
          scheduledAt: draft.startsAt ?? '',
          note: draft.notes.trim() || null,
        },
        // A verified guest books with their own short-lived token; a signed-in
        // customer books with their session. The API derives the customer from
        // whichever token arrives — it is never taken from the request body.
        isAuthenticated ? null : guestTokenFor(businessId),
      ),
    onSuccess: (appointment) => {
      clearBookingDraft(businessId)
      setDraft({ ...emptyDraft })
      setConfirmed(appointment)
      void queryClient.invalidateQueries({ queryKey: ['appointments'] })
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 401) {
        // A guest token can expire mid-flow; send them back to verification
        // rather than to a sign-in page they do not have an account for.
        if (!isAuthenticated) {
          clearGuestSession(businessId)
          setGuestVerified(false)
          setFailure('Your verification expired. Confirm your number again to finish.')
          return
        }
        setFailure('Sign in again to finish this booking. Your choices are saved.')
        return
      }
      if (error instanceof ApiError && (error.status === 409 || error.code === 'OVERBOOKING')) {
        setFailure('That time was taken while you were booking. Pick another time.')
        update({ step: 'time', startsAt: null })
        void availabilityQuery.refetch()
        return
      }
      setFailure(errorMessage(error, 'We could not confirm this booking. Please try again.'))
    },
  })


  function continueFromServices() {
    if (selectedServices.length === 0) {
      setFailure('Choose at least one service to continue.')
      return
    }
    if (!staffResolved) return
    setFailure(null)
    update({ step: hasEligibleStaff ? 'staff' : 'time', staffId })
  }

  function continueFromTime() {
    if (!selectedSlotAvailable) {
      setFailure('Choose an open time to continue.')
      return
    }
    goTo('details')
  }

  function continueFromDetails() {
    goTo('payment')
  }

  function submitBooking() {
    if (!isAuthenticated && !guestTokenFor(businessId)) {
      // The draft is already in sessionStorage, and the verification panel is on
      // this step — nothing is lost by asking the visitor to finish it first.
      setFailure('Verify your number to confirm this booking. Your choices are saved.')
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
      <StorefrontBookingDone
        appointment={confirmed}
        services={selectedServices}
        staffName={staffName}
        canonicalSlug={canonicalSlug}
        businessId={businessId}
        defaultPhone={user?.phone ?? null}
        canPay={paymentsEnabled}
        guestToken={guestTokenFor(businessId)}
        autoSubmitMessage={mpesaMessage.trim() || null}
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

  const when =
    selectedSlot && selectedDay ? `${dateLabel(selectedDay)}, ${timeLabel(selectedSlot.localTime)}` : null

  const headline = selectedServices.length > 0 ? money(totalPrice, currency) : 'No services yet'
  const detail =
    selectedServices.length > 0
      ? `${selectedServices.length} service${selectedServices.length === 1 ? '' : 's'} · ${formatDuration(totalDuration)}`
      : null

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
        onClick={
          activeStep === 'services'
            ? continueFromServices
            : activeStep === 'staff'
              ? () => goTo('time')
              : activeStep === 'time'
                ? continueFromTime
                : activeStep === 'details'
                  ? continueFromDetails
                  : submitBooking
        }
        disabled={
          !staffResolved ||
          (activeStep === 'services' && selectedServices.length === 0) ||
          (activeStep === 'time' && (availabilityQuery.isPending || !selectedSlotAvailable)) ||
          (activeStep === 'payment' && createBooking.isPending)
        }
      >
        {createBooking.isPending ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Confirming…
          </>
        ) : activeStep === 'payment' ? (
          <>
            {manualMpesa && mpesaMessage.trim() ? 'Confirm and send payment' : 'Confirm booking'}
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
                  : 'You’ll sign in on the next step so the studio knows who is coming. Your choices are kept.'}
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

              {manualMpesa ? (
                <div className="mt-[1.2rem]">
                  <h2 className="text-label font-semibold">Pay your booking fee by M-PESA</h2>
                  <div className="mt-[0.6rem] rounded-card border border-line bg-surface p-[1rem]">
                    <MpesaInstructions
                      details={publicPayment.data!}
                      amount={bookingFeePreview}
                      serviceTotal={totalPrice}
                    />
                  </div>

                  <div className="mt-[0.9rem]">
                    <label className="label" htmlFor="sf-book-mpesa-message">
                      Paste your M-PESA confirmation message{' '}
                      <span className="text-subtle">(you can also do this after booking)</span>
                    </label>
                    <textarea
                      id="sf-book-mpesa-message"
                      className="textarea"
                      rows={3}
                      value={mpesaMessage}
                      placeholder="QJK42NUM01 Confirmed. Ksh500.00 sent to …"
                      onChange={(event) => setMpesaMessage(event.target.value)}
                    />
                    <p className="mt-[0.4rem] text-caption text-subtle">
                      {mpesaMessage.trim()
                        ? 'We will send this for the studio to check as soon as your booking is in.'
                        : `Send ${money(bookingFeePreview, currency)} to the details above, then paste the SMS here. Your booking is held either way.`}
                    </p>
                  </div>
                </div>
              ) : paymentsEnabled ? (
                <div className="mt-[1.2rem]">
                  <h2 className="text-label font-semibold">How would you like to pay?</h2>
                  <div className="mt-[0.6rem]">
                    <StepOption
                      role="radio"
                      title="M-Pesa now"
                      description="We’ll send a payment request to your phone after the booking is confirmed."
                      selected={paymentChoice === 'mpesa'}
                      onSelect={() => setPaymentChoice('mpesa')}
                      monogram="M"
                    />
                    <StepOption
                      role="radio"
                      title="Pay at the studio"
                      description="The studio records the payment when you arrive."
                      selected={paymentChoice === 'studio'}
                      onSelect={() => setPaymentChoice('studio')}
                      monogram="K"
                    />
                  </div>
                  <p className="mt-[0.6rem] text-caption text-subtle">
                    Nothing is charged until you approve the request on your handset. The amount is
                    calculated by the studio’s system, not by this page.
                  </p>
                </div>
              ) : (
                <Alert tone="info" className="mt-[1.2rem]">
                  {business.name} does not collect payment through Punched. Settle it directly at
                  the studio — nothing is charged here.
                </Alert>
              )}

              {!isAuthenticated ? (
                guestVerified ? (
                  <Alert tone="success" className="mt-[1rem]">
                    Verified{guestName ? ` as ${guestName}` : ''}. Confirm below to book.
                  </Alert>
                ) : (
                  <div className="mt-[1.2rem]">
                    <GuestVerifyPanel
                      businessId={businessId}
                      onVerified={(session) => {
                        setGuestVerified(true)
                        setGuestName(session.fullName)
                        setFailure(null)
                      }}
                    />
                    <p className="mt-[0.7rem] text-caption text-subtle">
                      Already have an account?{' '}
                      <Link
                        to="/auth/sign-in"
                        search={{ redirect: storefrontHref(canonicalSlug, '/book') }}
                        className="link font-semibold"
                      >
                        Sign in
                      </Link>{' '}
                      instead. Your choices are saved either way.
                    </p>
                  </div>
                )
              ) : null}
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
    title: 'Confirm your booking',
    description: 'Check the details, then confirm. Nothing is charged without your approval.',
  },
}
