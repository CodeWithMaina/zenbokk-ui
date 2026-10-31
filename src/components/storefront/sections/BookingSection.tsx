import { CalendarPlus } from 'lucide-react'
import { useStorefront } from '../../../lib/storefront'
import { storefrontHref } from '../../../lib/tenant'
import { StorefrontSection } from '../StorefrontSection'

export type BookingSectionProps = {
  title: string | null
  description: string | null
}

/**
 * The online-booking band.
 *
 * Only reachable when the business has the appointments capability (the renderer
 * gates it), so the wizard it links to is guaranteed to exist.
 */
export function BookingSection({ title, description }: BookingSectionProps) {
  const { business, canonicalSlug, landingPage } = useStorefront()

  return (
    <StorefrontSection
      id="booking"
      eyebrow="Reserve your time"
      title={title}
      description={description}
      defaultTitle="Book an appointment"
      defaultDescription="Pick a service, choose a time and we’ll confirm it straight away."
    >
      <div className="flex flex-wrap items-center gap-[0.8rem]">
        <a
          href={storefrontHref(canonicalSlug, '/book')}
          className="btn btn-primary btn-xl no-underline"
        >
          <CalendarPlus className="size-[1rem]" aria-hidden="true" />
          {landingPage.primaryCta.label || `Book with ${business.name}`}
        </a>
        {business.phoneNumber ? (
          <a href={`tel:${business.phoneNumber}`} className="btn btn-ghost btn-xl no-underline">
            Or call {business.phoneNumber}
          </a>
        ) : null}
      </div>
    </StorefrontSection>
  )
}
