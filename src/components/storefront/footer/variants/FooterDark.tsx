import { Mail, MapPin, Phone } from 'lucide-react'
import type { FooterVariantProps } from '../FooterVariantWrapper'

export function FooterDark({ config, business }: FooterVariantProps) {
  return (
    <footer
      className="w-full"
      style={{
        backgroundColor: config.backgroundColor || '#0f0f0f',
        color: config.textColor || '#f0f0f0',
      }}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
        {/* Premium Dark Grid */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-12 mb-12">
          {/* Brand Section */}
          <div className="col-span-2 flex flex-col gap-6">
            {config.logoVisible && business.logoUrl && (
              <img
                src={business.logoUrl}
                alt={business.name}
                className="h-12 w-auto"
              />
            )}
            {config.businessNameVisible && (
              <h2 className="text-3xl font-bold tracking-tight">{business.name}</h2>
            )}
            {config.descriptionText && (
              <p className="text-sm leading-relaxed opacity-70 max-w-sm">
                {config.descriptionText}
              </p>
            )}
          </div>

          {/* Navigation */}
          {config.showNavigation && config.navigationLinks.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-widest mb-6 opacity-50">
                Links
              </h3>
              <ul className="space-y-3">
                {config.navigationLinks.map((link) => (
                  <li key={`nav-${link.href}`}>
                    <a
                      href={link.href}
                      className="text-sm opacity-70 hover:opacity-100 transition font-medium"
                      style={{ color: config.linkColor }}
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Contact */}
          {config.showContact && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-widest mb-6 opacity-50">
                Contact
              </h3>
              <ul className="space-y-4">
                {config.phoneNumber && (
                  <li>
                    <a
                      href={`tel:${config.phoneNumber}`}
                      className="text-sm opacity-70 hover:opacity-100 transition flex items-center gap-3"
                      style={{ color: config.linkColor }}
                    >
                      <Phone className="h-4 w-4" />
                      <span>{config.phoneNumber}</span>
                    </a>
                  </li>
                )}
                {config.email && (
                  <li>
                    <a
                      href={`mailto:${config.email}`}
                      className="text-sm opacity-70 hover:opacity-100 transition flex items-center gap-3"
                      style={{ color: config.linkColor }}
                    >
                      <Mail className="h-4 w-4" />
                      <span>{config.email}</span>
                    </a>
                  </li>
                )}
                {config.address && (
                  <li className="text-sm opacity-70 flex items-start gap-3">
                    <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>{config.address}</span>
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* Social */}
          {config.showSocial && config.socialLinks.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-widest mb-6 opacity-50">
                Follow
              </h3>
              <ul className="space-y-3">
                {config.socialLinks.map((social) => (
                  <li key={`social-${social.platform}`}>
                    <a
                      href={social.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-sm opacity-70 hover:opacity-100 transition font-medium"
                      style={{ color: config.linkColor }}
                    >
                      {social.platform}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Dark Footer Divider */}
        <div
          className="mb-6"
          style={{ borderTop: `1px solid ${config.textColor}20` }}
        />

        {/* Copyright */}
        {config.showCopyright && config.copyrightText && (
          <p className="text-xs font-light opacity-50 text-center">
            {config.copyrightText}
          </p>
        )}
      </div>
    </footer>
  )
}
