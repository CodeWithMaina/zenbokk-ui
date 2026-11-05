import { Mail, MapPin, Phone } from 'lucide-react'
import type { FooterVariantProps } from '../FooterVariantWrapper'

export function FooterCentered({ config, business }: FooterVariantProps) {
  return (
    <footer
      className="w-full"
      style={{
        backgroundColor: config.backgroundColor || '#ffffff',
        color: config.textColor || '#000000',
      }}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        {/* Centered Brand */}
        <div className="flex flex-col items-center gap-6 mb-12 text-center">
          {config.logoVisible && business.logoUrl && (
            <img
              src={business.logoUrl}
              alt={business.name}
              className="h-12 w-auto"
            />
          )}
          {config.businessNameVisible && (
            <h2 className="text-2xl font-bold">{business.name}</h2>
          )}
          {config.descriptionText && (
            <p className="text-sm opacity-75 max-w-md">{config.descriptionText}</p>
          )}
        </div>

        {/* Centered Contact Info */}
        {config.showContact && (
          <div className="flex flex-col sm:flex-row justify-center gap-8 mb-12">
            {config.address && (
              <div className="flex flex-col items-center gap-2">
                <MapPin className="h-5 w-5 opacity-60" />
                <p className="text-sm">{config.address}</p>
              </div>
            )}
            {config.phoneNumber && (
              <div className="flex flex-col items-center gap-2">
                <Phone className="h-5 w-5 opacity-60" />
                <a
                  href={`tel:${config.phoneNumber}`}
                  className="text-sm hover:underline transition"
                  style={{ color: config.linkColor }}
                >
                  {config.phoneNumber}
                </a>
              </div>
            )}
            {config.email && (
              <div className="flex flex-col items-center gap-2">
                <Mail className="h-5 w-5 opacity-60" />
                <a
                  href={`mailto:${config.email}`}
                  className="text-sm hover:underline transition"
                  style={{ color: config.linkColor }}
                >
                  {config.email}
                </a>
              </div>
            )}
          </div>
        )}

        {/* Centered Navigation */}
        {config.showNavigation && config.navigationLinks.length > 0 && (
          <div className="mb-12">
            <ul className="flex flex-wrap justify-center gap-6">
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

        {/* Centered Social Links */}
        {config.showSocial && config.socialLinks.length > 0 && (
          <div className="mb-8">
            <ul className="flex flex-wrap justify-center gap-6">
              {config.socialLinks.map((social) => (
                <li key={`social-${social.platform}`}>
                  <a
                    href={social.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-sm font-medium hover:underline transition"
                    style={{ color: config.linkColor }}
                  >
                    {social.platform}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Divider and Copyright */}
        {config.showCopyright && config.copyrightText && (
          <div
            className="pt-8 border-t text-center text-xs opacity-75"
            style={{ borderColor: `${config.textColor}20` }}
          >
            <p>{config.copyrightText}</p>
          </div>
        )}
      </div>
    </footer>
  )
}
