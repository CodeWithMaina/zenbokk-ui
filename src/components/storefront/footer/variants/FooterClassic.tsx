import { Mail, MapPin, Phone } from 'lucide-react'
import type { FooterVariantProps } from '../FooterVariantWrapper'

export function FooterClassic({ config, business }: FooterVariantProps) {
  return (
    <footer
      className="w-full"
      style={{
        backgroundColor: config.backgroundColor || '#ffffff',
        color: config.textColor || '#000000',
      }}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand Section */}
          <div className="flex flex-col gap-4">
            {config.logoVisible && business.logoUrl && (
              <img
                src={business.logoUrl}
                alt={business.name}
                className="h-10 w-auto"
              />
            )}
            {config.businessNameVisible && (
              <h3 className="font-bold text-lg">{business.name}</h3>
            )}
            {config.descriptionText && (
              <p className="text-sm opacity-75">{config.descriptionText}</p>
            )}
          </div>

          {/* Navigation Links */}
          {config.showNavigation && config.navigationLinks.length > 0 && (
            <div>
              <h4 className="font-semibold text-sm uppercase tracking-wide mb-4">Explore</h4>
              <ul className="space-y-2">
                {config.navigationLinks.map((link) => (
                  <li key={`nav-${link.href}`}>
                    <a
                      href={link.href}
                      className="text-sm hover:underline transition"
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
              <h4 className="font-semibold text-sm uppercase tracking-wide mb-4">Contact</h4>
              <ul className="space-y-3">
                {config.address && (
                  <li className="flex gap-3 text-sm">
                    <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <span>{config.address}</span>
                  </li>
                )}
                {config.phoneNumber && (
                  <li className="flex gap-3">
                    <Phone className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <a
                      href={`tel:${config.phoneNumber}`}
                      className="text-sm hover:underline transition"
                      style={{ color: config.linkColor }}
                    >
                      {config.phoneNumber}
                    </a>
                  </li>
                )}
                {config.email && (
                  <li className="flex gap-3">
                    <Mail className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <a
                      href={`mailto:${config.email}`}
                      className="text-sm hover:underline transition"
                      style={{ color: config.linkColor }}
                    >
                      {config.email}
                    </a>
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* Social Links */}
          {config.showSocial && config.socialLinks.length > 0 && (
            <div>
              <h4 className="font-semibold text-sm uppercase tracking-wide mb-4">Follow</h4>
              <ul className="space-y-2">
                {config.socialLinks.map((social) => (
                  <li key={`social-${social.platform}`}>
                    <a
                      href={social.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-sm hover:underline transition"
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

        {/* Copyright */}
        {config.showCopyright && config.copyrightText && (
          <div
            className="pt-8 border-t text-center text-sm opacity-75"
            style={{ borderColor: `${config.textColor}20` }}
          >
            <p>{config.copyrightText}</p>
          </div>
        )}
      </div>
    </footer>
  )
}
