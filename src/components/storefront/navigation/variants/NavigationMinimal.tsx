import { Menu, X } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import type { NavigationVariantConfig } from '../../../../lib/api/types'
import { storefrontHref } from '../../../../lib/tenant'
import { cn } from '../../../../lib/cn'
import { StorefrontThemeToggle } from '../../StorefrontThemeToggle'

/**
 * Minimal Navigation Variant
 *
 * Ultra-clean and unobtrusive design with minimal spacing and hierarchy.
 * Prioritizes whitespace and simplicity.
 */
export function NavigationMinimal({
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

  const containerPadding = config.horizontalSpacing === 'compact' ? 'px-4' : config.horizontalSpacing === 'loose' ? 'px-8' : 'px-6'
  const headerHeight = config.headerHeight === 'compact' ? 'h-14' : config.headerHeight === 'spacious' ? 'h-20' : 'h-16'

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
          'sf-header-inner flex items-center justify-between',
          containerPadding,
          headerHeight,
          'mx-auto max-w-7xl',
        )}
        aria-label="Primary navigation"
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
              className="text-xs font-light tracking-wide hover:opacity-60 transition-opacity"
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
              className="text-xs font-light tracking-wide transition-opacity hover:opacity-60"
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
        <div className="flex items-center gap-2">
          <StorefrontThemeToggle />

          {config.ctaEnabled && config.ctaLabel && (
            <a
              href={config.ctaDestination || bookHref}
              className="hidden sm:inline-block text-xs font-light tracking-wide underline underline-offset-2 transition-opacity hover:opacity-60"
              style={{
                color: config.linkColor,
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
            className="lg:hidden p-1 transition-opacity hover:opacity-60"
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
          className="lg:hidden absolute inset-x-0 top-full bg-white/95 backdrop-blur-sm"
        >
          <nav className="flex flex-col gap-1 p-4">
            {navigationLinks.map((link: any) => (
              <a
                key={link.href}
                href={link.href}
                className="px-3 py-2 text-xs font-light tracking-wide rounded transition-opacity hover:bg-black/5"
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
                className="mt-2 px-3 py-2 text-xs font-light tracking-wide underline underline-offset-2"
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





