import { Menu, X } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import type { NavigationVariantConfig } from '../../../../lib/api/types'
import { storefrontHref } from '../../../../lib/tenant'
import { cn } from '../../../../lib/cn'
import { StorefrontThemeToggle } from '../../StorefrontThemeToggle'

/**
 * Modern Compact Navigation Variant
 *
 * Minimal height with clean, responsive design.
 * Maximizes content space with highly efficient navigation layout.
 */
export function NavigationCompact({
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
        'fixed inset-x-0 top-0 z-40 h-12',
        config.sticky ? 'sticky' : '',
      )}
      style={{
        backgroundColor: config.backgroundColor,
        color: config.textColor,
      }}
    >
      <nav
        className={cn(
          'sf-header-inner flex items-center justify-between',
          'px-4 h-12 mx-auto max-w-7xl',
        )}
        aria-label="Primary navigation"
      >
        {/* Logo and brand */}
        <div className="flex items-center gap-2 min-w-0">
          {config.logoMediaId || business.logoUrl ? (
            <a href={homeHref} className="shrink-0">
              <img
                src={business.logoUrl}
                alt={business.name}
                className="h-6 w-auto object-contain"
              />
            </a>
          ) : null}
          {config.showBusinessName && (
            <a
              href={homeHref}
              className="text-xs font-semibold hover:opacity-70 transition-opacity truncate"
            >
              {config.businessNameLabel || business.name}
            </a>
          )}
        </div>

        {/* Desktop navigation */}
        <div className="hidden md:flex items-center gap-4">
          {navigationLinks.slice(0, 3).map((link: any) => (
            <a
              key={link.href}
              href={link.href}
              className="text-xs font-medium transition-opacity hover:opacity-70 whitespace-nowrap"
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
        <div className="flex items-center gap-1">
          <StorefrontThemeToggle />

          {config.ctaEnabled && config.ctaLabel && (
            <a
              href={config.ctaDestination || bookHref}
              className="hidden sm:inline-flex items-center px-2 py-1 text-xs font-semibold rounded transition-all hover:shadow-md whitespace-nowrap"
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
            className="md:hidden p-1.5 rounded transition-opacity hover:opacity-70"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            aria-controls={menuId}
          >
            {menuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div
          id={menuId}
          className="md:hidden absolute inset-x-0 top-full bg-white/95 backdrop-blur-sm border-b border-black/10 max-h-[60vh] overflow-y-auto"
          style={{
            backgroundColor: config.backgroundColor,
          }}
        >
          <nav className="flex flex-col gap-0.5 p-3">
            {navigationLinks.map((link: any) => (
              <a
                key={link.href}
                href={link.href}
                className="px-3 py-2 text-xs font-medium rounded transition-opacity hover:opacity-70"
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
                className="mt-1 px-3 py-2 text-xs font-semibold rounded text-center text-white"
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






