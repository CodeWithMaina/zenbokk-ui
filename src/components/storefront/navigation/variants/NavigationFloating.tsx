import { Menu, X } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import type { NavigationVariantConfig } from '../../../../lib/api/types'
import { storefrontHref } from '../../../../lib/tenant'
import { cn } from '../../../../lib/cn'
import { StorefrontThemeToggle } from '../../StorefrontThemeToggle'

/**
 * Floating Navigation Variant
 *
 * Modern floating container design with rounded corners, shadow, and margin.
 * Creates a card-like appearance detached from the viewport edge.
 */
export function NavigationFloating({
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

  return (
    <header
      className={cn(
        'sf-header',
        'fixed top-4 inset-x-4 z-40',
        config.sticky ? 'sticky' : '',
      )}
    >
      <nav
        className={cn(
          'sf-header-inner flex items-center justify-between',
          'px-6 py-4 rounded-2xl backdrop-blur-xl',
          'mx-auto max-w-5xl',
        )}
        aria-label="Primary navigation"
        style={{
          backgroundColor: config.backgroundColor,
          color: config.textColor,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
        }}
      >
        {/* Logo and brand */}
        <div className="flex items-center gap-3">
          {config.logoMediaId || business.logoUrl ? (
            <a href={homeHref} className="shrink-0">
              <img
                src={business.logoUrl}
                alt={business.name}
                className="h-8 w-auto object-contain"
              />
            </a>
          ) : null}
          {config.showBusinessName && (
            <a
              href={homeHref}
              className="text-sm font-semibold hover:opacity-70 transition-opacity"
            >
              {config.businessNameLabel || business.name}
            </a>
          )}
        </div>

        {/* Desktop navigation */}
        <div className="hidden lg:flex items-center gap-6">
          {navigationLinks.map((link: any) => (
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

        {/* Actions */}
        <div className="flex items-center gap-3">
          <StorefrontThemeToggle />

          {config.ctaEnabled && config.ctaLabel && (
            <a
              href={config.ctaDestination || bookHref}
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition-all hover:shadow-lg"
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
          className="lg:hidden absolute inset-x-4 top-full mt-2 rounded-2xl backdrop-blur-xl"
          style={{
            backgroundColor: config.backgroundColor,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
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






