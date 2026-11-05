import { Mail, MapPin, Phone } from 'lucide-react'
import type { FooterVariantProps } from '../FooterVariantWrapper'

export function FooterPremium({ config, business }: FooterVariantProps) {
  return (
    <footer
      className="w-full"
      style={{
        backgroundColor: config.backgroundColor || '#1a1a1a',
        color: config.textColor || '#ffffff',
      }}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        {/* Premium Grid with generous spacing */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-12 mb-16">
          {/* Brand: Premium positioning */}
          <div className="col-span-2 flex flex-col gap-6">
            {config.logoVisible && business.logoUrl && (
              <img
                src={business.logoUrl}
                alt={business.name}
                className="h-12 w-auto"
              />
            )}
            {config.businessNameVisible && (
              <h2 className="text-2xl font-light tracking-wide">{business.name}</h2>
            )}
            {config.descriptionText && (
              <p className="text-sm leading-relaxed opacity-80 max-w-xs">
                {config.descriptionText}
              </p>
            )}
          </div>

          {/* Navigation Links */}
          {config.showNavigation && config.navigationLinks.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-widest mb-6 opacity-60">
                Explore
              </h3>
              <ul className="space-y-3">
                {config.navigationLinks.map((link) => (
                  <li key={`nav-${link.href}`}>
                    <a
                      href={link.href}
                      className="text-sm font-light hover:opacity-100 transition opacity-75"
                      style={{ color: config.linkColor }}
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Contact Information */}
          {config.showContact && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-widest mb-6 opacity-60">
                Connect
              </h3>
              <ul className="space-y-4">
                {config.phoneNumber && (
                  <li>
                    <a
                      href={`tel:${config.phoneNumber}`}
                      className="text-sm font-light hover:opacity-100 transition opacity-75 flex items-center gap-2"
                      style={{ color: config.linkColor }}
                    >
                      <Phone className="h-4 w-4" />
                      {config.phoneNumber}
                    </a>
                  </li>
                )}
                {config.email && (
                  <li>
                    <a
                      href={`mailto:${config.email}`}
                      className="text-sm font-light hover:opacity-100 transition opacity-75 flex items-center gap-2"
                      style={{ color: config.linkColor }}
                    >
                      <Mail className="h-4 w-4" />
                      {config.email}
                    </a>
                  </li>
                )}
                {config.address && (
                  <li className="text-sm font-light opacity-75 flex items-start gap-2">
                    <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>{config.address}</span>
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* Social Links */}
          {config.showSocial && config.socialLinks.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-widest mb-6 opacity-60">
                Social
              </h3>
              <ul className="space-y-3">
                {config.socialLinks.map((social) => (
                  <li key={`social-${social.platform}`}>
                    <a
                      href={social.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-sm font-light hover:opacity-100 transition opacity-75"
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

        {/* Premium Divider */}
        <div
          className="mb-8"
          style={{ borderTop: `1px solid ${config.textColor}20` }}
        />

        {/* Copyright with refined typography */}
        {config.showCopyright && config.copyrightText && (
          <p className="text-xs font-light opacity-60 text-center">
            {config.copyrightText}
          </p>
        )}
      </div>
    </footer>
  )
}
