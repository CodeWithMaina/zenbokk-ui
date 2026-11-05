import { Mail, MapPin, Phone } from 'lucide-react'
import type { FooterVariantProps } from '../FooterVariantWrapper'

export function FooterModern({ config, business }: FooterVariantProps) {
  return (
    <footer
      className="w-full"
      style={{
        backgroundColor: config.backgroundColor || '#f9f9f9',
        color: config.textColor || '#1a1a1a',
      }}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Modern Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 py-12">
          {/* Brand Column */}
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
              <p className="text-sm opacity-70 leading-relaxed">
                {config.descriptionText}
              </p>
            )}
          </div>

          {/* Navigation */}
          {config.showNavigation && config.navigationLinks.length > 0 && (
            <div>
              <h4 className="font-semibold text-sm mb-4">Pages</h4>
              <ul className="space-y-2">
                {config.navigationLinks.map((link) => (
                  <li key={`nav-${link.href}`}>
                    <a
                      href={link.href}
                      className="text-sm opacity-70 hover:opacity-100 transition"
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
              <h4 className="font-semibold text-sm mb-4">Get in Touch</h4>
              <ul className="space-y-3">
                {config.phoneNumber && (
                  <li>
                    <a
                      href={`tel:${config.phoneNumber}`}
                      className="text-sm opacity-70 hover:opacity-100 transition flex items-center gap-2"
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
                      className="text-sm opacity-70 hover:opacity-100 transition flex items-center gap-2"
                      style={{ color: config.linkColor }}
                    >
                      <Mail className="h-4 w-4" />
                      {config.email}
                    </a>
                  </li>
                )}
                {config.address && (
                  <li className="text-sm opacity-70 flex items-start gap-2">
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
              <h4 className="font-semibold text-sm mb-4">Follow Us</h4>
              <ul className="space-y-2">
                {config.socialLinks.map((social) => (
                  <li key={`social-${social.platform}`}>
                    <a
                      href={social.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-sm opacity-70 hover:opacity-100 transition"
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

        {/* Bottom Divider and Copyright */}
        {config.showCopyright && config.copyrightText && (
          <div
            className="py-6 border-t text-center text-xs opacity-60"
            style={{ borderColor: `${config.textColor}20` }}
          >
            <p>{config.copyrightText}</p>
          </div>
        )}
      </div>
    </footer>
  )
}
