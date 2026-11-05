import { Menu, X } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import type { NavigationVariantConfig } from '../../../../lib/api/types'
import { storefrontHref } from '../../../../lib/tenant'
import { cn } from '../../../../lib/cn'
import { StorefrontThemeToggle } from '../../StorefrontThemeToggle'

/**
 * Centered Navigation Variant
 *
 * Logo/name centered with balanced navigation on both sides.
 * Creates a symmetrical, elegant layout.
 */
export function NavigationCentered({
  config,
  business,
  canonicalSlug,
  onNavigate,
}: {
  config: NavigationVariantConfig
  business: any
  canonicalSlug: string
  pathname: string
  teamCount?: number
  bookingCount?: number
  onNavigate?: (href: string) => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuId = useId()

  const homeHref = storefrontHref(canonicalSlug)
  const bookHref = storefrontHref(canonicalSlug, '/book')

  const navigationLinks = config.navigationLinks || []
  const halfLength = Math.ceil(navigationLinks.length / 2)
  const leftLinks = navigationLinks.slice(0, halfLength)
  const rightLinks = navigationLinks.slice(halfLength)

  useEffect(() => {
    if (!menuOpen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [menuOpen])

  const handleNavClick = (href: string) => {
    setMenuOpen(false)
    onNavigate?.(href)
  }

  const containerPadding = config.horizontalSpacing === 'compact' ? 'px-4' : config.horizontalSpacing === 'loose' ? 'px-8' : 'px-6'
  const headerHeight = config.headerHeight === 'compact' ? 'h-16' : config.headerHeight === 'spacious' ? 'h-24' : 'h-20'

  return (
    <header
      className={cn(
        'sf-header',
        'fixed inset-x-0 top-0 z-40',
        config.sticky ? 'sticky' : '',
        headerHeight,
      )}
      style={{
        backgroundColor: config.backgroundColor,
        color: config.textColor,
      }}
    >
      <nav
        className={cn(
          'sf-header-inner flex items-center justify-center',
          containerPadding,
          headerHeight,
          'mx-auto max-w-7xl relative',
        )}
        aria-label="Primary navigation"
      >
        {/* Left navigation */}
        <div className="hidden lg:flex items-center gap-8 flex-1 justify-end pr-8">
          {leftLinks.map((link: any) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium transition-opacity hover:opacity-70"
              onClick={(e) => {
                e.preventDefault()
                handleNavClick(link.href)
              }}
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Center: Logo and brand */}
        <div className="flex flex-col items-center gap-2 flex-shrink-0">
          {config.logoMediaId || business.logoUrl ? (
            <a href={homeHref} className="shrink-0">
              <img
                src={business.logoUrl}
                alt={business.name}
                className="h-10 w-auto object-contain"
              />
            </a>
          ) : null}
          {config.showBusinessName && (
            <a
              href={homeHref}
              className="text-xs font-semibold tracking-widest uppercase hover:opacity-70 transition-opacity text-center"
            >
              {config.businessNameLabel || business.name}
            </a>
          )}
        </div>

        {/* Right navigation */}
        <div className="hidden lg:flex items-center gap-8 flex-1 justify-start pl-8">
          {rightLinks.map((link: any) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium transition-opacity hover:opacity-70"
              onClick={(e) => {
                e.preventDefault()
                handleNavClick(link.href)
              }}
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Mobile: Actions container on top right */}
        <div className="absolute right-4 flex items-center gap-2">
          <StorefrontThemeToggle />

          {config.ctaEnabled && config.ctaLabel && (
            <a
              href={config.ctaDestination || bookHref}
              className="hidden sm:inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded transition-all hover:shadow-md"
              style={{
                backgroundColor: config.linkColor,
                color: '#ffffff',
              }}
              onClick={(e) => {
                e.preventDefault()
                handleNavClick(config.ctaDestination || bookHref)
              }}
            >
              {config.ctaLabel}
            </a>
          )}

          {/* Mobile menu toggle */}
          <button
            className="lg:hidden p-2 rounded-lg transition-opacity hover:opacity-70"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            aria-controls={menuId}
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div
          id={menuId}
          className="lg:hidden absolute inset-x-0 top-full bg-white/95 backdrop-blur-sm border-t border-black/10"
          style={{
            backgroundColor: config.backgroundColor,
          }}
        >
          <nav className="flex flex-col gap-1 p-4">
            {navigationLinks.map((link: any) => (
              <a
                key={link.href}
                href={link.href}
                className="px-4 py-3 text-sm font-medium rounded-lg transition-opacity hover:opacity-70"
                onClick={(e) => {
                  e.preventDefault()
                  handleNavClick(link.href)
                }}
              >
                {link.label}
              </a>
            ))}
            {config.ctaEnabled && config.ctaLabel && (
              <a
                href={config.ctaDestination || bookHref}
                className="mt-2 px-4 py-3 text-sm font-semibold rounded-lg text-center text-white"
                style={{
                  backgroundColor: config.linkColor,
                }}
                onClick={(e) => {
                  e.preventDefault()
                  handleNavClick(config.ctaDestination || bookHref)
                }}
              >
                {config.ctaLabel}
              </a>
            )}
          </nav>
        </div>
      )}
    </header>
  )
}





