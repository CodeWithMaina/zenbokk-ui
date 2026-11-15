import { useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import type { BookingCatalogueService, BookingServiceLine } from '../../lib/booking'
import { BOOKING_STEP_LABELS, BOOKING_STEP_KEYS, bookingStepIssue } from '../../lib/booking'
import { Button } from '../ui/button'
import { Portal } from '../ui/portal'
import { useOverlay } from '../ui/use-overlay'
import { BookingConfirmed } from './BookingConfirmed'
import { BookingReceipt } from './BookingReceipt'
import { BookingStepper } from './BookingStepper'
import { CustomerStep } from './steps/CustomerStep'
import { PaymentStep } from './steps/PaymentStep'
import { ReviewStep } from './steps/ReviewStep'
import { ScheduleStep } from './steps/ScheduleStep'
import { ServicesStep } from './steps/ServicesStep'
import { useBookingWizard } from './use-booking-wizard'
import type { BookingPrefill } from './use-booking-wizard'

export type BookingWizardProps = {
  open: boolean
  onClose: () => void
  businessId: string
  /** The business's own name, printed on the receipt. */
  businessName: string
  businessLogoUrl?: string | null
  /** The bookable catalogue, as the opening screen already resolved it. */
  services: readonly BookingWizardService[]
  /** Payments module entitlement. When false, step 4 records nothing. */
  paymentsEnabled: boolean
  prefill?: BookingPrefill
  /** Called once the server has created the appointment. */
  onBooked?: (appointmentId: string) => void
  onViewAppointment?: (appointmentId: string) => void
}

/** Only what the services step needs, so any catalogue projection fits. */
export type BookingWizardService = BookingCatalogueService

/**
 * The owner's booking flow.
 *
 * One wizard for every screen size: the same draft, the same steps and the same
 * writes, with only the layout changing under 64rem (the receipt collapses into
 * a bar above the footer) and the shell under 48rem (the dialog becomes the
 * screen, on the dynamic viewport, with the footer pinned inside the safe area).
 */
export function BookingWizard({
  open,
  onClose,
  businessId,
  businessName,
  businessLogoUrl,
  services,
  paymentsEnabled,
  prefill,
  onBooked,
  onViewAppointment,
}: BookingWizardProps) {
  const catalogue = useMemo<BookingServiceLine[]>(
    () =>
      services
        .filter((service) => service.isActive !== false)
        .map((service) => ({
          id: service.id,
          name: service.name,
          price: service.price,
          durationMinutes: service.durationMinutes,
          categoryName: service.categoryName ?? null,
        })),
    [services],
  )

  const wizard = useBookingWizard({
    open,
    businessId,
    services: catalogue,
    prefill,
    paymentsEnabled,
  })

  const panelRef = useOverlay<HTMLDivElement>(open, onClose)
  const [announced, setAnnounced] = useState(false)

  // The caller hears about a created booking exactly once.
  useEffect(() => {
    if (!wizard.outcome) {
      setAnnounced(false)
      return
    }
    if (announced) return
    setAnnounced(true)
    onBooked?.(wizard.outcome.appointment.id)
  }, [announced, onBooked, wizard.outcome])

  if (!open) return null

  const step = wizard.draft.step
  const stepKey = BOOKING_STEP_KEYS[step]
  const issue = bookingStepIssue(step, wizard.draft)
  const busy = wizard.attempting
  const confirmed = wizard.outcome !== null

  const receipt = (
    <BookingReceipt
      draft={wizard.draft}
      extras={{
        businessName,
        businessLogoUrl,
        confirmed: false,
        paymentNote: null,
      }}
    />
  )

  return (
    <Portal>
      <button
        type="button"
        className="bkw-scrim"
        aria-label="Close"
        tabIndex={-1}
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bkw-title"
        className="bkw-modal"
      >
        {confirmed ? (
          <BookingConfirmed
            wizard={wizard}
            businessName={businessName}
            businessLogoUrl={businessLogoUrl}
            onClose={onClose}
            onViewAppointment={onViewAppointment}
          />
        ) : (
          <>
            <div className="bkw-head">
              <div className="flex items-start justify-between gap-[1rem]">
                <div className="min-w-0">
                  <p className="eyebrow">New booking</p>
                  <h2
                    id="bkw-title"
                    className="font-display mt-[0.2rem] text-sheet text-fg"
                  >
                    {BOOKING_STEP_LABELS[stepKey]}
                  </h2>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  data-autofocus
                  aria-label="Close"
                  onClick={onClose}
                >
                  <X className="size-[1.1rem]" aria-hidden="true" />
                </Button>
              </div>
              <BookingStepper step={step} onSelect={wizard.goTo} />
              <p className="mt-[0.6rem] text-meta text-muted min-[48rem]:hidden">
                Step {step + 1} of 5 · {BOOKING_STEP_LABELS[stepKey]}
              </p>
            </div>

            <div className="bkw-body">
              <div className="bkw-main">
                <div className="bkw-measure">
                  {step === 0 ? <CustomerStep wizard={wizard} /> : null}
                  {step === 1 ? <ServicesStep wizard={wizard} /> : null}
                  {step === 2 ? <ScheduleStep wizard={wizard} /> : null}
                  {step === 3 ? <PaymentStep wizard={wizard} /> : null}
                  {step === 4 ? <ReviewStep wizard={wizard} /> : null}

                  {wizard.failure ? (
                    <div className="bkw-note warn mt-[1rem]" role="alert">
                      {wizard.failure}
                    </div>
                  ) : null}
                </div>
              </div>
              <aside className="bkw-side" aria-label="Booking receipt">
                <p className="eyebrow mb-[0.8rem] text-premium-gold">Live receipt</p>
                {receipt}
                <p className="mt-[0.6rem] text-center text-meta text-premium-muted">
                  Updates as you complete each step.
                </p>
              </aside>
            </div>

            <details className="bkw-mobile-summary">
              <summary>
                <span>
                  Receipt · {wizard.draft.services.length} service
                  {wizard.draft.services.length === 1 ? '' : 's'} ·{' '}
                  {wizard.totals.durationMinutes} min
                </span>
                <b className="font-display tabular text-premium-gold">
                  {new Intl.NumberFormat('en-KE', {
                    style: 'currency',
                    currency: 'KES',
                    maximumFractionDigits: 0,
                  }).format(wizard.totals.price)}
                </b>
              </summary>
              <div>{receipt}</div>
            </details>

            <div className="bkw-foot">
              <Button variant="ghost" disabled={step === 0 || busy} onClick={wizard.back}>
                Back
              </Button>
              <div className="flex min-w-0 items-center gap-[0.8rem]">
                {issue ? (
                  <span className="hidden text-meta text-muted min-[48rem]:block">{issue}</span>
                ) : null}
                <Button
                  variant={step === 4 ? 'accent' : 'primary'}
                  disabled={Boolean(issue) || busy}
                  onClick={() => {
                    if (step === 4) void wizard.submit()
                    else wizard.next()
                  }}
                >
                  {busy ? 'Creating…' : step === 4 ? 'Confirm appointment' : 'Continue'}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </Portal>
  )
}
