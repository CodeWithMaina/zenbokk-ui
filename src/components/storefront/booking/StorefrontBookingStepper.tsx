import { cn } from '../../../lib/cn'

export type BookingStep = { key: string; label: string }

export type StorefrontBookingStepperProps = {
  steps: readonly BookingStep[]
  /** Index of the step the visitor is on. */
  current: number
  /** 1-based position, for the screen-reader label. */
  ariaLabel: string
}

/**
 * The booking progress line.
 *
 * Completed steps draw a tick (the SVG is dash-animated, so the check appears to
 * be written rather than popped in) and the connector fills left-to-right. On a
 * phone the words are dropped — five labels do not fit — and the position is
 * announced in a line of text instead, so nothing is lost to the screen reader.
 */
export function StorefrontBookingStepper({
  steps,
  current,
  ariaLabel,
}: StorefrontBookingStepperProps) {
  return (
    <>
      <ol className="sf-stepper" aria-label={ariaLabel}>
        {steps.map((step, index) => {
          const done = index < current
          const isCurrent = index === current
          return (
            <li key={step.key} className="contents">
              <span
                className={cn(
                  'sf-stepper-node',
                  done && 'is-done',
                  isCurrent && 'is-current',
                )}
                aria-current={isCurrent ? 'step' : undefined}
              >
                <span className="sf-stepper-dot">
                  {done ? (
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M5 12.5l4.5 4.5L19 7.5" />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </span>
                <span className="sf-stepper-label">{step.label}</span>
              </span>
              {index < steps.length - 1 ? (
                <span
                  aria-hidden="true"
                  className={cn('sf-stepper-line', done && 'is-done')}
                />
              ) : null}
            </li>
          )
        })}
      </ol>
      <p className="sf-stepper-mobile">
        Step {current + 1} of {steps.length} · {steps[current]?.label}
      </p>
    </>
  )
}

/** The tick a selected option shows. */
export function StepTick() {
  return (
    <span className="sf-tick" aria-hidden="true">
      <svg viewBox="0 0 24 24">
        <path d="M5 12.5l4.5 4.5L19 7.5" />
      </svg>
    </span>
  )
}

export type StepOptionProps = {
  title: string
  description?: string | null
  /** Right-hand figure, e.g. a price. */
  meta?: string | null
  selected: boolean
  disabled?: boolean
  onSelect: () => void
  /** Rendered instead of the title's initial. */
  thumbnailUrl?: string | null
  /** Single-letter fallback for the thumbnail. */
  monogram?: string
  /** `checkbox` for multi-select steps, `radio` for single-select ones. */
  role?: 'checkbox' | 'radio'
}

/**
 * One choice in the booking flow.
 *
 * A real `<button>` with `aria-pressed`, so it is keyboard-operable and its state
 * is announced — a row of divs with click handlers would look identical and be
 * unusable without a mouse. `role` is only a hint for assistive technology;
 * multi-select and single-select steps differ in how the caller updates the
 * draft, not in how the control behaves.
 */
export function StepOption({
  title,
  description,
  meta,
  selected,
  disabled = false,
  onSelect,
  thumbnailUrl,
  monogram,
  role = 'checkbox',
}: StepOptionProps) {
  return (
    <button
      type="button"
      className="sf-option"
      aria-pressed={selected}
      aria-disabled={disabled || undefined}
      disabled={disabled}
      role={role === 'radio' ? 'radio' : undefined}
      onClick={onSelect}
    >
      {thumbnailUrl ? (
        <img src={thumbnailUrl} alt="" className="sf-option-thumb" loading="lazy" />
      ) : monogram ? (
        <span className="sf-option-mono" aria-hidden="true">
          {monogram}
        </span>
      ) : null}

      <span className="sf-option-body">
        <b>{title}</b>
        {description ? <span>{description}</span> : null}
      </span>

      {meta ? <span className="sf-option-price">{meta}</span> : null}
      <StepTick />
    </button>
  )
}
