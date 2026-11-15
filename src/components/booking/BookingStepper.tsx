import { Check } from 'lucide-react'
import { BOOKING_STEP_KEYS, BOOKING_STEP_LABELS } from '../../lib/booking'

/**
 * Five numbered circles joined by a line.
 *
 * A completed step swaps its number for a tick and turns its circle — and the
 * line leading out of it — green. Upcoming steps are not clickable; a completed
 * one is, so the owner can jump back without losing anything. Colour only: no
 * sliding, filling, boxes, scrollbars or focus rectangles around a step.
 */
export function BookingStepper({
  step,
  onSelect,
}: {
  step: number
  onSelect: (step: number) => void
}) {
  return (
    <ol className="bkw-steps" aria-label="Booking steps">
      {BOOKING_STEP_KEYS.map((key, index) => {
        const state = index < step ? 'done' : index === step ? 'current' : 'upcoming'
        return (
          <li
            key={key}
            className={`bkw-step ${state}`}
            aria-current={index === step ? 'step' : undefined}
          >
            <span className="bkw-step-line" aria-hidden="true" />
            <button
              type="button"
              className="bkw-step-button"
              disabled={index >= step}
              onClick={() => onSelect(index)}
              aria-label={index < step ? `Back to ${BOOKING_STEP_LABELS[key]}` : BOOKING_STEP_LABELS[key]}
            >
              <span className="bkw-step-circle" aria-hidden="true">
                {index < step ? <Check className="size-[0.85rem]" /> : index + 1}
              </span>
              <span className="bkw-step-label">{BOOKING_STEP_LABELS[key]}</span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}
