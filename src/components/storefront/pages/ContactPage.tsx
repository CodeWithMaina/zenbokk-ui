import { ArrowRight, Mail, MapPin, Phone } from 'lucide-react'
import { storefrontHref } from '../../../lib/tenant'
import { useStorefront } from '../../../lib/storefront'
import { sectionContent } from '../../../lib/storefront/sections'
import { StorefrontEnquiryForm } from '../StorefrontEnquiryForm'
import { StorefrontPage } from '../StorefrontPage'

/**
 * How to reach the business: the details it has published, the online booking
 * route when it is open, and the enquiry form.
 *
 * Every card is built from what the public profile actually carries, so a
 * business that has published only a phone number gets one card — not placeholder
 * text standing in for an address it never gave. Each card is a single, real
 * action: a `tel:` link rings the number, a `mailto:` link opens a draft, and an
 * address opens the visitor's maps app ready for directions. Nothing is invented.
 *
 * The enquiry form is this page's call to action; a second "book now" band
 * underneath it would compete with it, so the closing band stays off.
 */

type Channel = {
  key: string
  icon: typeof MapPin
  label: string
  value: string
  href: string
  /** Address cards open an external maps URL. */
  external?: boolean
  action: string
}

/** Open the business's address in the visitor's maps app, ready for directions. */
function directionsHref(location: string): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(location)}`
}

export function ContactPage() {
  const { business, canonicalSlug, landingPage, can } = useStorefront()
  const { title, description } = sectionContent(landingPage, 'contact')

  const channels: Channel[] = []
  if (business.location) {
    channels.push({
      key: 'address',
      icon: MapPin,
      label: 'Visit',
      value: business.location,
      href: directionsHref(business.location),
      external: true,
      action: 'Get directions',
    })
  }
  if (business.phoneNumber) {
    channels.push({
      key: 'phone',
      icon: Phone,
      label: 'Call',
      value: business.phoneNumber,
      href: `tel:${business.phoneNumber}`,
      action: 'Call now',
    })
  }
  if (business.email) {
    channels.push({
      key: 'email',
      icon: Mail,
      label: 'Email',
      value: business.email,
      href: `mailto:${business.email}`,
      action: 'Send email',
    })
  }

  return (
    <StorefrontPage
      eyebrow="Get in touch"
      title={title || 'Contact'}
      description={
        description ??
        `Reach ${business.name} directly, or send a request and the studio will get back to you.`
      }
      cta={false}
    >
      <div className="sf-detail">
        <div className="sf-contact-info">
          {channels.length === 0 ? (
            <p className="text-meta text-muted">
              {business.name} hasn’t published contact details on Punched yet. Use the form and the
              studio will still receive it.
            </p>
          ) : (
            <ul className="sf-channel-list">
              {channels.map((channel) => (
                <li key={channel.key}>
                  <a
                    href={channel.href}
                    className="sf-contact-card"
                    {...(channel.external
                      ? { target: '_blank', rel: 'noreferrer noopener' }
                      : {})}
                  >
                    <span className="sf-contact-card-icon" aria-hidden="true">
                      <channel.icon className="size-[1.05rem]" />
                    </span>
                    <span className="sf-contact-card-body">
                      <span className="sf-contact-card-label">{channel.label}</span>
                      <span className="sf-contact-card-value">{channel.value}</span>
                    </span>
                    <span className="sf-contact-card-action">
                      {channel.action}
                      <ArrowRight className="size-[0.85rem]" aria-hidden="true" />
                    </span>
                  </a>
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
        </div>

        <StorefrontEnquiryForm />
      </div>
    </StorefrontPage>
  )
}
