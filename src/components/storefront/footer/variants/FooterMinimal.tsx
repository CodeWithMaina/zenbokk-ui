import type { FooterVariantProps } from '../FooterVariantWrapper'

export function FooterMinimal({ config, business }: FooterVariantProps) {
  return (
    <footer
      className="w-full"
      style={{
        backgroundColor: config.backgroundColor || '#ffffff',
        color: config.textColor || '#000000',
      }}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Left: Brand */}
          <div className="flex items-center gap-4">
            {config.logoVisible && business.logoUrl && (
              <img
                src={business.logoUrl}
                alt={business.name}
                className="h-8 w-auto"
              />
            )}
            {config.businessNameVisible && (
              <h3 className="font-semibold text-sm">{business.name}</h3>
            )}
          </div>

          {/* Center: Essential Links */}
          {config.showNavigation && config.navigationLinks.length > 0 && (
            <ul className="flex gap-6">
              {config.navigationLinks.slice(0, 3).map((link) => (
                <li key={`nav-${link.href}`}>
                  <a
                    href={link.href}
                    className="text-xs font-medium hover:underline transition"
                    style={{ color: config.linkColor }}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          )}

          {/* Right: Copyright */}
          {config.showCopyright && config.copyrightText && (
            <p className="text-xs opacity-75">{config.copyrightText}</p>
          )}
        </div>
      </div>
    </footer>
  )
}
