import { useMutation, useQuery } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  Clock,
  Loader2,
  Scissors,
  UserRound,
} from 'lucide-react'
import { useState } from 'react'
import { Alert } from '../components/ui/alert'
import { BookingConfirmation } from '../components/ui/booking-confirmation'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { Field, Textarea } from '../components/ui/field'
import { OptionRow } from '../components/ui/option-row'
import { Progress } from '../components/ui/progress'
import { QuickChoices } from '../components/ui/quick-choices'
import { Skeleton } from '../components/ui/skeleton'
import { ApiError, errorMessage } from '../lib/api/client'
import { queryKeys, queryClient } from '../lib/api/query-client'
import type { Appointment, AvailabilitySlot, DayAvailability } from '../lib/api/types'
import { useAuth } from '../lib/auth'
import { CAPABILITY } from '../lib/entitlements'
import { formatDay, formatDuration, formatNumber, money } from '../lib/format'
import {
  bookingApi,
  clearBookingDraft,
  emptyDraft,
  readBookingDraft,
  storefrontApi,
  useStorefront,
  writeBookingDraft,
} from '../lib/storefront'
import type { BookingDraft } from '../lib/storefront'
import { isTenantHost, storefrontHref } from '../lib/tenant'

export const Route = createFileRoute('/$slug/book')({
  component: BookingWizardPage,
})

const STEPS = [
  { key: 'services', label: 'Services' },
  { key: 'staff', label: 'Staff' },
  { key: 'time', label: 'Date & time' },
  { key: 'details', label: 'Details' },
  { key: 'review', label: 'Review' },
] as const

type StepKey = (typeof STEPS)[number]['key']

function stepIndex(step: StepKey): number {
  return STEPS.findIndex((entry) => entry.key === step)
}

export function BookingWizardPage() {
  const { business, businessId, canonicalSlug, can } = useStorefront()
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()

  const [draft, setDraft] = useState<BookingDraft>(() => readBookingDraft(businessId))
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [failure, setFailure] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState<Appointment | null>(null)

  const appointmentsEnabled = can(CAPABILITY.appointments)
  const currency = 'KES'

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

  const servicesQuery = useQuery({
    queryKey: queryKeys.storefrontServices(businessId),
    queryFn: () => storefrontApi.services(businessId),
    enabled: appointmentsEnabled,
  })

  const services = (servicesQuery.data ?? []).filter((service) => service.isActive)
  const selectedServices = services.filter((service) => draft.serviceIds.includes(service.id))
  // Only active catalogue items may be sent back to the API: a draft can outlive
  // a service being hidden or deleted while the customer was signing in.
  const selectedServiceIds = selectedServices.map((service) => service.id)
  const totalDuration = selectedServices.reduce(
    (sum, service) => sum + service.durationMinutes,
    0,
  )
  const totalPrice = selectedServices.reduce((sum, service) => sum + service.price, 0)

  // A restored draft may point at services that no longer exist. Fall back to
  // the first step instead of leaving the wizard stuck on a dead query.
  const activeStep =
    draft.step !== 'services' && servicesQuery.isFetched && selectedServices.length === 0
      ? 'services'
      : draft.step
  const activeIndex = Math.max(0, stepIndex(activeStep))

  const staffQuery = useQuery({
    queryKey: queryKeys.storefrontStaff(businessId, selectedServiceIds),
    queryFn: () => storefrontApi.eligibleStaff(businessId, selectedServiceIds),
    enabled: appointmentsEnabled && selectedServiceIds.length > 0,
  })

  const availabilityQuery = useQuery({
    queryKey: queryKeys.availability(businessId, {
      serviceIds: selectedServiceIds,
      staffId: draft.staffId,
    }),
    queryFn: () =>
      storefrontApi.availability(businessId, {
        serviceIds: selectedServiceIds,
        staffId: draft.staffId,
      }),
    enabled:
      appointmentsEnabled &&
      selectedServiceIds.length > 0 &&
      (activeStep === 'time' || activeStep === 'details' || activeStep === 'review'),
  })

  const calendar = availabilityQuery.data
  const bookableDays = (calendar?.days ?? []).filter((day) => day.availableSlots > 0)
  const selectedSlot =
    calendar?.days
      .flatMap((day) => day.slots)
      .find((slot) => slot.startAtUtc === draft.startsAt) ?? null
  // After the sign-in round trip `selectedDate` is fresh state, so recover the
  // day from the saved slot instead of snapping back to the first open day.
  const selectedDay = selectedSlot?.localDate ?? null
  const selectedSlotAvailable =
    selectedSlot !== null && selectedSlot.isAvailable && selectedSlot.status === 'available'
  const activeDay =
    (calendar?.days ?? []).find(
      (day) => day.date === (selectedDate ?? selectedDay),
    ) ??
    bookableDays[0] ??
    null

  const createBooking = useMutation({
    mutationFn: () =>
      bookingApi.create({
        businessId,
        serviceIds: selectedServiceIds,
        staffUserId: draft.staffId,
        scheduledAt: draft.startsAt ?? '',
        note: draft.notes.trim() || null,
      }),
    onSuccess: (appointment) => {
      clearBookingDraft(businessId)
      setDraft({ ...emptyDraft })
      setConfirmed(appointment)
      void queryClient.invalidateQueries({ queryKey: ['appointments'] })
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 401) {
        setFailure('Sign in again to finish this booking. Your choices are saved.')
        return
      }
      if (
        error instanceof ApiError &&
        (error.status === 409 || error.code === 'OVERBOOKING')
      ) {
        setFailure('That time was taken while you were booking. Pick another time.')
        update({ step: 'time', startsAt: null })
        void availabilityQuery.refetch()
        return
      }
      setFailure(errorMessage(error, 'We could not confirm this booking. Please try again.'))
    },
  })

  if (!appointmentsEnabled) {
    return (
      <div className="mx-auto w-full max-w-(--container-page) px-gutter py-[clamp(2rem,5vw,3.5rem)]">
        <Card className="mx-auto max-w-[32rem] p-[1.5rem] text-center">
          <p className="eyebrow">Bookings are closed</p>
          <h1 className="display mt-[0.4rem] text-title">Online booking isn’t available</h1>
          <p className="mt-[0.5rem] text-meta text-muted">
            {business.name} doesn’t take appointments through its page right now.
            {business.phoneNumber ? ` Call ${business.phoneNumber} to arrange a visit.` : ''}
          </p>
          <a href={storefrontHref(canonicalSlug)} className="btn btn-ghost mt-[1.1rem] no-underline">
            Back to the storefront
          </a>
        </Card>
      </div>
    )
  }

  const signInHref =
    typeof window !== 'undefined'
      ? window.location.pathname + window.location.search
      : `/${canonicalSlug}/book`

  function continueFromServices() {
    if (selectedServiceIds.length === 0) {
      setFailure('Choose at least one service to continue.')
      return
    }
    goTo('staff')
  }

  function continueFromStaff() {
    goTo('time')
  }

  function continueFromTime() {
    if (!selectedSlot || !selectedSlotAvailable) {
      setFailure('That time is no longer available. Pick another one.')
      update({ startsAt: null })
      return
    }
    goTo('details')
  }

  function continueFromDetails() {
    if (!isAuthenticated) {
      setFailure('Sign in to finish your booking — your choices stay right here.')
      return
    }
    goTo('review')
  }

  function submitBooking() {
    if (!draft.startsAt || !selectedSlotAvailable) {
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
    update({ serviceIds: next, startsAt: null, staffId: null })
  }

  function chooseDay(day: DayAvailability) {
    setSelectedDate(day.date)
    update({ startsAt: null })
  }

  function chooseSlot(slot: AvailabilitySlot) {
    setSelectedDate(slot.localDate)
    update({ startsAt: slot.startAtUtc, staffId: slot.staffUserId ?? draft.staffId })
  }

  function dateLabel(localDate: string): string {
    // Noon avoids a DST/UTC shift when the calendar hands back a bare date.
    return formatDay(new Date(`${localDate}T12:00:00`))
  }

  return (
    <div className="mx-auto w-full max-w-(--container-page) px-gutter py-[clamp(1.5rem,4vw,3rem)]">
      <header className="max-w-[40rem]">
        <a
          href={storefrontHref(canonicalSlug)}
          className="inline-flex items-center gap-[0.3rem] text-meta text-muted transition-colors hover:text-fg"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          {business.name}
        </a>
        <p className="eyebrow mt-[0.6rem]">Book an appointment</p>
        <h1 className="display mt-[0.3rem] text-title">
          Choose what you need, then a time that suits you.
        </h1>
      </header>

      <Card className="mt-[1.25rem] p-[clamp(1rem,3vw,1.6rem)]">
        <ol className="flex list-none flex-wrap items-center gap-x-[0.6rem] gap-y-[0.35rem] p-0 text-meta">
          {STEPS.map((step, index) => {
            const done = index < activeIndex
            const current = index === activeIndex
            return (
              <li key={step.key} className="flex items-center gap-[0.6rem]">
                <span
                  className={
                    current
                      ? 'font-semibold text-fg'
                      : done
                        ? 'flex items-center gap-[0.25rem] text-success-ink'
                        : 'text-muted'
                  }
                >
                  {done ? <Check className="size-[0.8rem]" aria-hidden="true" /> : null}
                  {step.label}
                </span>
                {index < STEPS.length - 1 ? (
                  <span aria-hidden="true" className="h-px w-[1rem] bg-line" />
                ) : null}
              </li>
            )
          })}
        </ol>

        <Progress
          className="mt-[0.8rem]"
          value={activeIndex + 1}
          max={STEPS.length}
          ariaLabel={`Step ${activeIndex + 1} of ${STEPS.length}: ${STEPS[activeIndex].label}`}
        />

        {failure ? (
          <Alert tone="danger" className="mt-[1rem]" onDismiss={() => setFailure(null)}>
            {failure}
          </Alert>
        ) : null}

        {activeStep === 'services' ? (
          <section className="mt-[1.2rem]">
            <h2 className="text-heading font-bold tracking-snug">Pick your services</h2>
            <p className="mt-[0.15rem] text-meta text-muted">
              Choose one or more. We’ll add up the time and price for you.
            </p>

            {servicesQuery.isPending ? (
              <div className="mt-[1rem] space-y-[0.6rem]" aria-busy="true">
                <Skeleton className="h-[3.6rem] rounded-md" />
                <Skeleton className="h-[3.6rem] rounded-md" />
                <Skeleton className="h-[3.6rem] rounded-md" />
              </div>
            ) : servicesQuery.isError ? (
              <Alert tone="danger" className="mt-[1rem]">
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
              <Alert tone="info" className="mt-[1rem]">
                This business has not published any services yet. Call them to book
                directly.
              </Alert>
            ) : (
              <div className="mt-[1rem] flex flex-col gap-[0.55rem]">
                {services.map((service) => (
                  <OptionRow
                    key={service.id}
                    title={service.name}
                    description={
                      service.description ||
                      `${formatDuration(service.durationMinutes)} appointment`
                    }
                    meta={`${formatDuration(service.durationMinutes)} · ${money(service.price, currency)}`}
                    selected={draft.serviceIds.includes(service.id)}
                    onSelectedChange={() => toggleService(service.id)}
                  />
                ))}
              </div>
            )}

            <div className="mt-[1.1rem] flex flex-wrap items-center justify-between gap-[0.6rem] border-t border-line pt-[0.9rem]">
              <p className="text-meta text-muted">
                {selectedServices.length > 0 ? (
                  <>
                    {formatNumber(selectedServices.length)}{' '}
                    {selectedServices.length === 1 ? 'service' : 'services'} ·{' '}
                    {formatDuration(totalDuration)} ·{' '}
                    <b className="text-fg">{money(totalPrice, currency)}</b>
                  </>
                ) : (
                  'Nothing selected yet.'
                )}
              </p>
              <Button
                variant="primary"
                onClick={continueFromServices}
                disabled={services.length === 0}
              >
                Choose staff
                <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
            </div>
          </section>
        ) : null}

        {activeStep === 'staff' ? (
          <section className="mt-[1.2rem]">
            <h2 className="text-heading font-bold tracking-snug">Who would you like?</h2>
            <p className="mt-[0.15rem] text-meta text-muted">
              Pick a team member, or let the front desk choose the first available.
            </p>

            <div className="mt-[1rem] flex flex-col gap-[0.55rem]">
              <OptionRow
                role="radio"
                title="Any available"
                description="We’ll match you with someone who can do all your services."
                selected={draft.staffId === null}
                onSelectedChange={() => update({ staffId: null, startsAt: null })}
              />

              {staffQuery.isPending ? (
                <Skeleton className="h-[3.6rem] rounded-md" />
              ) : staffQuery.isError ? (
                <Alert tone="warning">
                  {errorMessage(staffQuery.error, 'We could not load the team list.')}
                </Alert>
              ) : (
                (staffQuery.data ?? []).map((member) => (
                  <OptionRow
                    key={member.userId}
                    role="radio"
                    title={member.fullName}
                    description={member.phoneNumber ?? 'Available for your services'}
                    selected={draft.staffId === member.userId}
                    onSelectedChange={() =>
                      update({ staffId: member.userId, startsAt: null })
                    }
                  />
                ))
              )}
            </div>

            <div className="mt-[1.1rem] flex flex-wrap items-center justify-between gap-[0.6rem] border-t border-line pt-[0.9rem]">
              <Button variant="ghost" onClick={() => goTo('services')}>
                <ArrowLeft className="size-4" aria-hidden="true" />
                Services
              </Button>
              <Button variant="primary" onClick={continueFromStaff}>
                Pick a time
                <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
            </div>
          </section>
        ) : null}

        {activeStep === 'time' ? (
          <section className="mt-[1.2rem]">
            <h2 className="text-heading font-bold tracking-snug">Pick a date and time</h2>
            <p className="mt-[0.15rem] text-meta text-muted">
              Times are shown in the business’s local time
              {calendar?.timeZoneId ? ` (${calendar.timeZoneId})` : ''}.
            </p>

            {availabilityQuery.isPending ? (
              <div className="mt-[1rem] space-y-[0.7rem]" aria-busy="true">
                <Skeleton className="h-[2rem] w-[70%] rounded-pill" />
                <Skeleton className="h-[8rem] rounded-md" />
              </div>
            ) : availabilityQuery.isError ? (
              <Alert tone="danger" className="mt-[1rem]">
                {errorMessage(availabilityQuery.error, 'We could not load the calendar.')}{' '}
                <button
                  type="button"
                  className="link font-semibold"
                  onClick={() => void availabilityQuery.refetch()}
                >
                  Try again
                </button>
              </Alert>
            ) : (
              <>
                {calendar?.notice ? (
                  <Alert tone="info" className="mt-[1rem]">
                    {calendar.notice}
                  </Alert>
                ) : null}

                {bookableDays.length === 0 ? (
                  <Alert tone="warning" className="mt-[1rem]">
                    No open times in the next two weeks. Try a different team member
                    or call {business.phoneNumber ?? business.name} to arrange a visit.
                  </Alert>
                ) : (
                  <>
                    <QuickChoices
                      label="Choose a day"
                      className="mt-[1rem]"
                      options={bookableDays.map((day) => ({
                        value: day.date,
                        label: dateLabel(day.date),
                      }))}
                      value={activeDay?.date ?? null}
                      onChange={(value) => {
                        const day = bookableDays.find((entry) => entry.date === value)
                        if (day) chooseDay(day)
                      }}
                    />

                    <div className="mt-[1rem] flex flex-col gap-[0.55rem]">
                      {(activeDay?.slots ?? [])
                        .filter((slot) => slot.isAvailable && slot.status === 'available')
                        .map((slot) => (
                          <OptionRow
                            key={`${slot.startAtUtc}-${slot.staffUserId ?? 'any'}`}
                            role="radio"
                            title={slot.localTime}
                            description={
                              slot.staffName
                                ? `With ${slot.staffName}`
                                : 'First available team member'
                            }
                            meta={slot.dayPart}
                            selected={draft.startsAt === slot.startAtUtc}
                            onSelectedChange={() => chooseSlot(slot)}
                          />
                        ))}

                      {activeDay && activeDay.availableSlots === 0 ? (
                        <p className="py-4 text-center text-meta text-muted">
                          No open times on {dateLabel(activeDay.date)}. Pick another day.
                        </p>
                      ) : null}
                    </div>
                  </>
                )}
              </>
            )}

            <div className="mt-[1.1rem] flex flex-wrap items-center justify-between gap-[0.6rem] border-t border-line pt-[0.9rem]">
              <Button variant="ghost" onClick={() => goTo('staff')}>
                <ArrowLeft className="size-4" aria-hidden="true" />
                Staff
              </Button>
              <Button
                variant="primary"
                onClick={continueFromTime}
                disabled={availabilityQuery.isPending || !selectedSlotAvailable}
              >
                Add details
                <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
            </div>
          </section>
        ) : null}

        {activeStep === 'details' ? (
          <section className="mt-[1.2rem]">
            <h2 className="text-heading font-bold tracking-snug">Anything we should know?</h2>
            <p className="mt-[0.15rem] text-meta text-muted">
              Add a note for the team — allergies, parking, a preferred chair.
            </p>

            <div className="mt-[1rem] rounded-md border border-line bg-surface-2 p-[0.8rem]">
              <ul className="flex flex-col gap-[0.3rem] text-meta">
                {selectedServices.map((service) => (
                  <li key={service.id} className="flex items-baseline justify-between gap-4">
                    <span className="min-w-0 truncate">{service.name}</span>
                    <span className="shrink-0 tabular">
                      {money(service.price, currency)}
                    </span>
                  </li>
                ))}
              </ul>
              {selectedSlot ? (
                <p className="mt-[0.55rem] border-t border-line pt-[0.5rem] text-meta text-muted">
                  {dateLabel(selectedSlot.localDate)} at {selectedSlot.localTime} ·{' '}
                  {formatDuration(totalDuration)} with{' '}
                  {selectedSlot.staffName || 'the first available team member'}
                </p>
              ) : null}
            </div>

            <div className="mt-[1rem]">
              <Field label="Note for the team" htmlFor="booking-notes" optional>
                <Textarea
                  id="booking-notes"
                  rows={4}
                  maxLength={500}
                  value={draft.notes}
                  placeholder="Anything that helps us prepare…"
                  onChange={(event) => update({ notes: event.target.value })}
                />
              </Field>
            </div>

            {!availabilityQuery.isPending && draft.startsAt && !selectedSlotAvailable ? (
              <Alert tone="warning" className="mt-[1rem]">
                That time is no longer available.{' '}
                <button
                  type="button"
                  className="link font-semibold"
                  onClick={() => goTo('time')}
                >
                  Pick another time
                </button>
              </Alert>
            ) : null}

            {!isAuthenticated ? (
              <Alert tone="info" className="mt-[1rem]">
                You’ll need an account to hold this slot. Sign in or create one — your
                choices are saved on this device.
              </Alert>
            ) : null}

            <div className="mt-[1.1rem] flex flex-wrap items-center justify-between gap-[0.6rem] border-t border-line pt-[0.9rem]">
              <Button variant="ghost" onClick={() => goTo('time')}>
                <ArrowLeft className="size-4" aria-hidden="true" />
                Time
              </Button>
              {isAuthenticated ? (
                <Button variant="primary" onClick={continueFromDetails}>
                  Review booking
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Button>
              ) : (
                <div className="flex flex-wrap items-center gap-[0.5rem]">
                  <Link
                    to="/auth/sign-up"
                    search={{ redirect: signInHref }}
                    className="btn btn-ghost no-underline"
                  >
                    Create account
                  </Link>
                  <Link
                    to="/auth/sign-in"
                    search={{ redirect: signInHref }}
                    className="btn btn-primary no-underline"
                  >
                    Sign in
                  </Link>
                </div>
              )}
            </div>
          </section>
        ) : null}

        {activeStep === 'review' ? (
          <section className="mt-[1.2rem]">
            <h2 className="text-heading font-bold tracking-snug">Look right?</h2>
            <p className="mt-[0.15rem] text-meta text-muted">
              We’ll hold this slot as soon as you confirm.
            </p>

            <div className="mt-[1rem] grid gap-[0.6rem] sm:grid-cols-2">
              <div className="rounded-md border border-line p-[0.8rem]">
                <p className="flex items-center gap-[0.35rem] text-caption tracking-caps text-muted uppercase">
                  <CalendarDays className="size-3.5" aria-hidden="true" />
                  When
                </p>
                <p className="mt-[0.2rem] font-semibold">
                  {selectedSlot ? dateLabel(selectedSlot.localDate) : 'Date pending'}
                </p>
                <p className="text-meta text-muted tabular">
                  {selectedSlot?.localTime ?? '—'}
                  {totalDuration > 0 ? ` · ${formatDuration(totalDuration)}` : ''}
                </p>
              </div>

              <div className="rounded-md border border-line p-[0.8rem]">
                <p className="flex items-center gap-[0.35rem] text-caption tracking-caps text-muted uppercase">
                  <UserRound className="size-3.5" aria-hidden="true" />
                  Who
                </p>
                <p className="mt-[0.2rem] font-semibold">
                  {selectedSlot?.staffName || 'First available'}
                </p>
                {draft.notes.trim() ? (
                  <p className="mt-[0.15rem] line-clamp-2 text-meta text-muted">
                    “{draft.notes.trim()}”
                  </p>
                ) : null}
              </div>
            </div>

            <div className="mt-[0.6rem] rounded-md border border-line p-[0.8rem]">
              <p className="flex items-center gap-[0.35rem] text-caption tracking-caps text-muted uppercase">
                <Scissors className="size-3.5" aria-hidden="true" />
                Services
              </p>
              <ul className="mt-[0.35rem] flex flex-col gap-[0.3rem] text-meta">
                {selectedServices.map((service) => (
                  <li key={service.id} className="flex items-baseline justify-between gap-4">
                    <span className="min-w-0">
                      <span className="font-medium">{service.name}</span>
                      <span className="text-muted">
                        {' '}
                        · {formatDuration(service.durationMinutes)}
                      </span>
                    </span>
                    <span className="shrink-0 tabular">
                      {money(service.price, currency)}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-[0.6rem] flex items-baseline justify-between gap-4 border-t border-line pt-[0.55rem] text-meta">
                <span className="flex items-center gap-[0.3rem] text-muted">
                  <Clock className="size-3.5" aria-hidden="true" />
                  {formatDuration(totalDuration)}
                </span>
                <b className="tabular">{money(totalPrice, currency)}</b>
              </div>
            </div>

            <div className="mt-[1.1rem] flex flex-wrap items-center justify-between gap-[0.6rem] border-t border-line pt-[0.9rem]">
              <Button variant="ghost" onClick={() => goTo('details')}>
                <ArrowLeft className="size-4" aria-hidden="true" />
                Details
              </Button>
              <Button
                variant="primary"
                onClick={submitBooking}
                disabled={
                  createBooking.isPending ||
                  availabilityQuery.isPending ||
                  !selectedSlotAvailable
                }
              >
                {createBooking.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    Confirming…
                  </>
                ) : (
                  <>
                    Confirm booking
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </>
                )}
              </Button>
            </div>
          </section>
        ) : null}
      </Card>

      <BookingConfirmation
        open={confirmed !== null}
        onClose={() => setConfirmed(null)}
        date={
          confirmed
            ? formatDay(new Date(confirmed.scheduledAt))
            : selectedSlot
              ? dateLabel(selectedSlot.localDate)
              : '—'
        }
        time={
          confirmed
            ? new Date(confirmed.scheduledAt).toLocaleTimeString(undefined, {
                hour: '2-digit',
                minute: '2-digit',
              })
            : (selectedSlot?.localTime ?? '—')
        }
        services={(confirmed?.services ?? selectedServices).map((service) => ({
          id: 'serviceCatalogItemId' in service ? service.serviceCatalogItemId : service.id,
          name: service.name,
          duration: service.durationMinutes,
          price: service.price,
        }))}
        total={
          confirmed
            ? confirmed.services.reduce((sum, service) => sum + service.price, 0)
            : totalPrice
        }
        currency={currency}
        title="You’re booked!"
        description={`${business.name} has your appointment. We’ll send a reminder before your visit.`}
        confirmLabel="Back to storefront"
        onConfirm={() => {
          if (isTenantHost()) void navigate({ to: '/' })
          else void navigate({ to: '/$slug', params: { slug: canonicalSlug } })
        }}
      />
    </div>
  )
}
