import { cn } from '../../lib/cn'
import { money } from '../../lib/format'
import { priceStep } from '../../lib/services'

export type ServicePriceRangeProps = {
  /** Selected minimum; the catalogue's minimum when the filter is unset. */
  min: number
  /** Selected maximum; the catalogue's maximum when the filter is unset. */
  max: number
  /** Real bounds from the business's catalogue (`GET /v1/services/me/facets`). */
  boundMin: number
  boundMax: number
  onChange: (next: { min: number; max: number }) => void
  className?: string
}

/**
 * Two-handle price slider.
 *
 * The bounds are the catalogue's actual cheapest and dearest service, so the control
 * can never ask for a price the business does not have (and there is no invented
 * ceiling). Both handles are native `<input type="range">`, which is what makes the
 * slider draggable by touch *and* operable with arrow/Home/End keys; the two inputs
 * are stacked transparently and only their thumbs take pointer events.
 *
 * Each handle is clamped against the other, so min can never pass max (or vice
 * versa). A catalogue with a single price — or none at all — degrades to a plain
 * statement instead of a slider that cannot move.
 */
export function ServicePriceRange({
  min,
  max,
  boundMin,
  boundMax,
  onChange,
  className,
}: ServicePriceRangeProps) {
  const span = boundMax - boundMin
  const step = priceStep(boundMin, boundMax)

  if (boundMax <= 0 && boundMin <= 0) {
    return (
      <p className={cn('text-meta text-muted', className)}>
        No prices to filter yet — add a price to a service and the range appears here.
      </p>
    )
  }

  if (span <= 0) {
    return (
      <p className={cn('text-meta text-muted', className)}>
        Every service is priced at <span className="font-semibold text-fg">{money(boundMax)}</span>, so
        there is no range to narrow.
      </p>
    )
  }

  const lower = Math.min(Math.max(min, boundMin), boundMax)
  const upper = Math.max(Math.min(max, boundMax), lower)
  const left = ((lower - boundMin) / span) * 100
  const right = 100 - ((upper - boundMin) / span) * 100

  return (
    <div className={cn('flex flex-col gap-[0.5rem]', className)}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-meta text-muted">
          Lowest <span className="tabular font-semibold text-fg">{money(lower)}</span>
        </span>
        <span className="text-meta text-muted">
          Highest <span className="tabular font-semibold text-fg">{money(upper)}</span>
        </span>
      </div>

      <div className="price-range">
        <span className="price-range-track" aria-hidden="true" />
        <span
          className="price-range-fill"
          style={{ left: `${left}%`, right: `${right}%` }}
          aria-hidden="true"
        />
        <input
          type="range"
          className="price-range-input"
          min={boundMin}
          max={boundMax}
          step={step}
          value={lower}
          aria-label="Minimum price"
          aria-valuetext={money(lower)}
          // The upper handle owns the top value; keeping the lower one beneath it
          // stops the two thumbs from covering each other at the top of the range.
          style={{ zIndex: lower > boundMin + span / 2 ? 3 : 2 }}
          onChange={(event) => {
            const next = Math.min(Number(event.target.value), upper)
            onChange({ min: next, max: upper })
          }}
        />
        <input
          type="range"
          className="price-range-input"
          min={boundMin}
          max={boundMax}
          step={step}
          value={upper}
          aria-label="Maximum price"
          aria-valuetext={money(upper)}
          onChange={(event) => {
            const next = Math.max(Number(event.target.value), lower)
            onChange({ min: lower, max: next })
          }}
        />
      </div>

      <p className="text-caption text-subtle">
        Catalogue range {money(boundMin)} – {money(boundMax)}
      </p>
    </div>
  )
}
