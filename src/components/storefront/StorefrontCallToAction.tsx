import { ArrowRight, CalendarPlus } from 'lucide-react'
import { storefrontHref } from '../../lib/tenant'
import { useStorefront } from '../../lib/storefront'

/**
 * The closing band every storefront page ends with.
 *
 * It renders nothing when the business cannot take bookings online — a page that
 * ends with a dead button is worse than one that ends quietly.
 */
export function StorefrontCallToAction() {
  const { business, canonicalSlug, can } = useStorefront()

  if (!can('appointments')) return null

  return (
    <section className="sf-premium sf-cta mt-[clamp(2rem,5vw,3.5rem)]">
      <div>
        <h2>Ready when you are.</h2>
        <p className="sf-lead">Choose your services and your person in under a minute.</p>
      </div>
      <a href={storefrontHref(canonicalSlug, '/book')} className="sf-hero-btn">
        <CalendarPlus className="size-[1.05rem]" aria-hidden="true" />
        Book with {business.name}
        <ArrowRight className="size-[1.05rem]" aria-hidden="true" />
      </a>
    </section>
  )
}
