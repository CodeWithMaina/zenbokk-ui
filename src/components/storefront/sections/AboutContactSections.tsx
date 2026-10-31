import { Mail, MapPin, Phone } from 'lucide-react'
import { useStorefront } from '../../../lib/storefront'
import { storefrontHref } from '../../../lib/tenant'
import { StorefrontSection } from '../StorefrontSection'

export type AboutSectionProps = {
  title: string | null
  description: string | null
}

/**
 * About the business, built only from what the public profile actually carries:
 * its description, category and location. Nothing is invented to fill the space.
 */
export function AboutSection({ title, description }: AboutSectionProps) {
  const { business } = useStorefront()

  return (
    <StorefrontSection
      id="about"
      eyebrow="Who we are"
      title={title}
      description={description}
      defaultTitle={`About ${business.name}`}
    >
      <div className="grid gap-[1.2rem] md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <p className="max-w-[46rem] text-body leading-relaxed text-muted">
          {business.description ||
            `${business.name} is a ${business.category.toLowerCase()} in ${business.location}, listed on Punched.`}
        </p>

        <dl className="grid gap-x-[1.2rem] gap-y-[0.6rem] text-meta sm:grid-cols-2 md:grid-cols-1">
          <div>
            <dt className="eyebrow">Category</dt>
            <dd className="mt-[0.15rem]">{business.category || '—'}</dd>
          </div>
          <div>
            <dt className="eyebrow">Location</dt>
            <dd className="mt-[0.15rem]">{business.location || '—'}</dd>
          </div>
        </dl>
      </div>
    </StorefrontSection>
  )
}

export type ContactSectionProps = {
  title: string | null
  description: string | null
}

/** How to reach the business, plus the online booking route when it is open. */
export function ContactSection({ title, description }: ContactSectionProps) {
  const { business, canonicalSlug, can } = useStorefront()

  const rows: { icon: typeof MapPin; label: string; value: string; href?: string }[] = []
  if (business.location) {
    rows.push({ icon: MapPin, label: 'Address', value: business.location })
  }
  if (business.phoneNumber) {
    rows.push({
      icon: Phone,
      label: 'Phone',
      value: business.phoneNumber,
      href: `tel:${business.phoneNumber}`,
    })
  }
  if (business.email) {
    rows.push({ icon: Mail, label: 'Email', value: business.email, href: `mailto:${business.email}` })
  }

  return (
    <StorefrontSection
      id="contact"
      eyebrow="Visit us"
      title={title}
      description={description}
      defaultTitle="Contact"
      defaultDescription="Call ahead, or book a time and we’ll look after the rest."
    >
      {rows.length === 0 ? (
        <p className="text-meta text-muted">
          {business.name} hasn’t published contact details on Punched yet.
        </p>
      ) : (
        <ul className="grid list-none grid-cols-1 gap-[0.9rem] p-0 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((row) => (
            <li key={row.label} className="flex items-start gap-[0.55rem]">
              <row.icon className="mt-[0.15rem] size-[1rem] shrink-0 text-accent" aria-hidden="true" />
              <div className="min-w-0">
                <p className="eyebrow">{row.label}</p>
                {row.href ? (
                  <a href={row.href} className="link break-words">
                    {row.value}
                  </a>
                ) : (
                  <p className="break-words">{row.value}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {can('appointments') ? (
        <a
          href={storefrontHref(canonicalSlug, '/book')}
          className="btn btn-primary mt-[1.2rem] no-underline"
        >
          Book online, any time
        </a>
      ) : null}
    </StorefrontSection>
  )
}
