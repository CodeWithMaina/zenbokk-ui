import { Mail, MapPin, Phone } from 'lucide-react'
import type { FooterVariantProps } from '../FooterVariantWrapper'

export function FooterEditorial({ config, business }: FooterVariantProps) {
  return (
    <footer
      className="w-full"
      style={{
        backgroundColor: config.backgroundColor || '#fafaf8',
        color: config.textColor || '#2a2a2a',
      }}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
        {/* Large Brand Statement */}
        <div className="mb-16 pb-12 border-b" style={{ borderColor: `${config.textColor}15` }}>
          {config.logoVisible && business.logoUrl && (
            <img
              src={business.logoUrl}
              alt={business.name}
              className="h-14 w-auto mb-6"
            />
          )}
          {config.businessNameVisible && (
            <h1 className="text-4xl md:text-5xl font-light mb-6 leading-tight">
              {business.name}
            </h1>
          )}
          {config.descriptionText && (
            <p className="text-lg opacity-75 max-w-2xl leading-relaxed font-light">
              {config.descriptionText}
            </p>
          )}
        </div>

        {/* Editorial Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-16">
          {/* Navigation Section */}
          {config.showNavigation && config.navigationLinks.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-widest mb-8 opacity-60">
                Pages
              </h2>
              <ul className="space-y-4">
                {config.navigationLinks.map((link) => (
                  <li key={`nav-${link.href}`}>
                    <a
                      href={link.href}
                      className="text-base font-light hover:opacity-60 transition"
                      style={{ color: config.linkColor }}
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Contact Section */}
          {config.showContact && (
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-widest mb-8 opacity-60">
                Inquiries
              </h2>
              <ul className="space-y-4">
                {config.phoneNumber && (
                  <li>
                    <a
                      href={`tel:${config.phoneNumber}`}
                      className="text-base font-light hover:opacity-60 transition flex items-center gap-3"
                      style={{ color: config.linkColor }}
                    >
                      <Phone className="h-5 w-5" />
                      {config.phoneNumber}
                    </a>
                  </li>
                )}
                {config.email && (
                  <li>
                    <a
                      href={`mailto:${config.email}`}
                      className="text-base font-light hover:opacity-60 transition flex items-center gap-3"
                      style={{ color: config.linkColor }}
                    >
                      <Mail className="h-5 w-5" />
                      {config.email}
                    </a>
                  </li>
                )}
                {config.address && (
                  <li className="text-base font-light opacity-75 flex items-start gap-3">
                    <MapPin className="h-5 w-5 mt-0.5 flex-shrink-0" />
                    <span>{config.address}</span>
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* Social Section */}
          {config.showSocial && config.socialLinks.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-widest mb-8 opacity-60">
                Connect
              </h2>
              <ul className="space-y-4">
                {config.socialLinks.map((social) => (
                  <li key={`social-${social.platform}`}>
                    <a
                      href={social.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-base font-light hover:opacity-60 transition"
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

        {/* Editorial Footer */}
        {config.showCopyright && config.copyrightText && (
          <div
            className="pt-12 border-t text-center text-sm font-light opacity-60"
            style={{ borderColor: `${config.textColor}15` }}
          >
            <p>{config.copyrightText}</p>
          </div>
        )}
      </div>
    </footer>
  )
}
