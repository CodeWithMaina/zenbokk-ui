import { useStorefront } from '../../lib/storefront'
import { useStorefrontOpeningHours } from '../../lib/storefront/use-storefront-public'
import { Skeleton } from '../ui/skeleton'

/**
 * The business's opening hours, read from the server.
 *
 * These are the *business's* hours (the union of its staff schedules, or its own
 * booking window when it has recorded no roster) — they are deliberately
 * distinct from live appointment availability, which the booking wizard fetches
 * separately. Nothing here is hardcoded, and a closed day says "Closed" rather
 * than inventing a time.
 */
export function StorefrontOpeningHours({ variant = 'panel' }: { variant?: 'panel' | 'footer' }) {
  const { businessId } = useStorefront()
  const hours = useStorefrontOpeningHours(businessId)

  if (hours.isPending) {
    return (
      <div className="grid gap-[0.4rem]" aria-busy="true" aria-live="polite">
        <span className="sr-only">Loading opening hours…</span>
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-[1.1rem] w-full max-w-[16rem]" />
        ))}
      </div>
    )
  }

  // A footer must not shout: a failed hours fetch degrades to a quiet line.
  if (hours.isError || !hours.data) {
    return variant === 'footer' ? null : (
      <p className="text-meta text-muted">
        Opening hours are unavailable right now. Please call the business to check.
      </p>
    )
  }

  const data = hours.data
  // Display Monday-first, which is how a Kenyan business reads its week.
  const orderedDays = [...data.days].sort((a, b) => {
    const rank = (day: number) => (day === 0 ? 7 : day)
    return rank(a.dayOfWeek) - rank(b.dayOfWeek)
  })

  const specialHours = data.specialHours.slice(0, 6)

  return (
    <div className="grid gap-[0.7rem]">
      <dl className="grid gap-[0.35rem] text-meta">
        {orderedDays.map((day) => (
          <div key={day.day} className="flex flex-wrap items-baseline justify-between gap-x-[1rem]">
            <dt className="capitalize">{day.day}</dt>
            <dd className={day.isClosed ? 'text-subtle' : 'text-ink'}>
              {day.isClosed
                ? 'Closed'
                : day.periods
                    .map((period) =>
                      period.breakStartsAt && period.breakEndsAt
                        ? `${period.opensAt}–${period.closesAt} (break ${period.breakStartsAt}–${period.breakEndsAt})`
                        : `${period.opensAt}–${period.closesAt}`,
                    )
                    .join(', ')}
            </dd>
          </div>
        ))}
      </dl>

      {!data.hasStaffSchedule ? (
        <p className="text-caption text-subtle">
          Hours are the business’s own booking window. Live appointment availability is shown when you
          book.
        </p>
      ) : null}

      {specialHours.length > 0 ? (
        <div className="grid gap-[0.3rem]">
          <p className="eyebrow">Upcoming changes</p>
          <ul className="grid gap-[0.2rem] text-caption text-muted">
            {specialHours.map((special) => (
              <li key={special.date} className="flex flex-wrap items-baseline justify-between gap-x-[1rem]">
                <span>{formatSpecialDate(special.date)}</span>
                <span>
                  {special.isClosed
                    ? (special.label ?? 'Closed')
                    : special.periods
                        .map((period) => `${period.opensAt}–${period.closesAt}`)
                        .join(', ')}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

/** `2026-12-25` → `Fri 25 Dec`, without a UTC/DST shift. */
function formatSpecialDate(isoDate: string): string {
  const date = new Date(`${isoDate}T12:00:00`)
  if (Number.isNaN(date.getTime())) return isoDate
  return date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
}
