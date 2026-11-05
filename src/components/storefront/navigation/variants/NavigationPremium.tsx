import { Menu, X } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import type { NavigationVariantConfig } from '../../../../lib/api/types'
import { storefrontHref } from '../../../../lib/tenant'
import { cn } from '../../../../lib/cn'
import { StorefrontThemeToggle } from '../../StorefrontThemeToggle'

/**
 * Premium Navigation Variant
 *
 * Sophisticated design with refined buttons, borders, and premium spacing.
 * Features elevated styling with shadow and border accents.
 */
export function NavigationPremium({
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

  const containerPadding = config.horizontalSpacing === 'compact' ? 'px-6' : config.horizontalSpacing === 'loose' ? 'px-10' : 'px-8'
  const headerHeight = config.headerHeight === 'compact' ? 'h-16' : config.headerHeight === 'spacious' ? 'h-24' : 'h-20'

  return (
    <header
      className={cn(
        'sf-header',
        'fixed inset-x-0 top-0 z-40 backdrop-blur-md',
        config.sticky ? 'sticky' : '',
        headerHeight,
      )}
      style={{
        backgroundColor: config.backgroundColor,
        color: config.textColor,
        boxShadow: config.boxShadow || '0 2px 8px rgba(0,0,0,0.1)',
      }}
    >
      <nav
        className={cn(
          'sf-header-inner flex items-center justify-between',
          containerPadding,
          headerHeight,
          'mx-auto max-w-7xl',
        )}
        aria-label="Primary navigation"
      >
        {/* Logo and brand */}
        <div className="flex items-center gap-4">
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
              className="text-sm font-semibold tracking-tight hover:opacity-70 transition-opacity"
            >
              {config.businessNameLabel || business.name}
            </a>
          )}
        </div>

        {/* Desktop navigation */}
        <div className="hidden lg:flex items-center gap-8">
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
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg border-2 transition-all hover:shadow-lg hover:scale-105"
              style={{
                backgroundColor: config.backgroundColor,
                color: config.textColor,
                borderColor: config.borderColor || config.linkColor,
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
            className="lg:hidden p-2 rounded-lg transition-all hover:bg-black/10"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            aria-controls={menuId}
          >
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div
          id={menuId}
          className="lg:hidden absolute inset-x-0 top-full border-t border-black/10 bg-white/98 backdrop-blur-sm"
          style={{
            backgroundColor: config.backgroundColor,
          }}
        >
          <nav className="flex flex-col gap-1 p-6">
            {navigationLinks.map((link: any) => (
              <a
                key={link.href}
                href={link.href}
                className="px-4 py-3 text-sm font-medium rounded-lg transition-all hover:bg-black/5"
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
                className="mt-3 px-4 py-3 text-sm font-semibold rounded-lg border-2 text-center"
                style={{
                  borderColor: config.borderColor || config.linkColor,
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






