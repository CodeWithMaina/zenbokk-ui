import { Mail, MapPin, Phone } from 'lucide-react'
import { storefrontHref } from '../../../lib/tenant'
import { useStorefront } from '../../../lib/storefront'
import { sectionContent } from '../../../lib/storefront/sections'
import { StorefrontEnquiryForm } from '../StorefrontEnquiryForm'
import { StorefrontOpeningHours } from '../StorefrontOpeningHours'
import { StorefrontPage } from '../StorefrontPage'

/**
 * How to reach the business: the details it has published, the online booking
 * route when it is open, and the enquiry form.
 *
 * The rows are built from what the public profile actually carries, so a
 * business that has published only a phone number gets one row — not placeholder
 * text standing in for an address it never gave.
 *
 * The closing band is off: the enquiry form is this page's call to action, and a
 * second "book now" underneath it would compete with it.
 */
export function ContactPage() {
  const { business, canonicalSlug, landingPage, can } = useStorefront()
  const { title, description } = sectionContent(landingPage, 'contact')

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
    rows.push({
      icon: Mail,
      label: 'Email',
      value: business.email,
      href: `mailto:${business.email}`,
    })
  }

  return (
    <StorefrontPage
      eyebrow="Visit us"
      title={title || 'Contact'}
      description={
        description ??
        'Send a request and the studio will get back to you, or book a time and we’ll look after the rest.'
      }
      cta={false}
    >
      <div className="sf-detail">
        <div>
          {rows.length === 0 ? (
            <p className="text-meta text-muted">
              {business.name} hasn’t published contact details on Punched yet. Use the form and the
              studio will still receive it.
            </p>
          ) : (
            <ul className="grid list-none gap-[0.9rem] p-0">
              {rows.map((row) => (
                <li key={row.label} className="flex items-start gap-[0.55rem]">
                  <row.icon
                    className="mt-[0.15rem] size-[1rem] shrink-0 text-accent"
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <p className="sf-eyebrow mb-[0.15rem]">{row.label}</p>
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

          <div className="mt-[1.6rem] grid gap-[0.5rem]">
            <p className="sf-eyebrow">Opening hours</p>
            <StorefrontOpeningHours />
            <p className="text-caption text-subtle">
              These are the business’s opening hours. The exact times you can book are shown when
              you choose a service.
            </p>
          </div>
        </div>

        <StorefrontEnquiryForm />
      </div>
    </StorefrontPage>
  )
}
