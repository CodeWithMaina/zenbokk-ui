import { Menu, X } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import type { NavigationVariantConfig } from '../../../../lib/api/types'
import { storefrontHref } from '../../../../lib/tenant'
import { cn } from '../../../../lib/cn'
import { StorefrontThemeToggle } from '../../StorefrontThemeToggle'

/**
 * Editorial Navigation Variant
 *
 * Typography-led design inspired by magazine and editorial aesthetics.
 * Emphasis on elegant typography and sophisticated spacing.
 */
export function NavigationEditorial({
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

  const containerPadding = config.horizontalSpacing === 'compact' ? 'px-6' : config.horizontalSpacing === 'loose' ? 'px-12' : 'px-8'
  const headerHeight = config.headerHeight === 'compact' ? 'h-20' : config.headerHeight === 'spacious' ? 'h-28' : 'h-24'

  return (
    <header
      className={cn(
        'sf-header',
        'fixed inset-x-0 top-0 z-40 border-b',
        config.sticky ? 'sticky' : '',
        headerHeight,
      )}
      style={{
        backgroundColor: config.backgroundColor,
        color: config.textColor,
        borderColor: config.borderColor || 'rgba(0,0,0,0.1)',
      }}
    >
      <nav
        className={cn(
          'sf-header-inner flex flex-col items-start justify-between',
          containerPadding,
          'py-4 mx-auto max-w-6xl',
        )}
        aria-label="Primary navigation"
      >
        {/* Top row: Logo and brand */}
        <div className="w-full flex items-start justify-between">
          <div className="flex items-start gap-4">
            {config.logoMediaId || business.logoUrl ? (
              <a href={homeHref} className="shrink-0 pt-1">
                <img
                  src={business.logoUrl}
                  alt={business.name}
                  className="h-8 w-auto object-contain"
                />
              </a>
            ) : null}
            <div className="flex flex-col">
              {config.showBusinessName && (
                <a
                  href={homeHref}
                  className="text-lg font-light tracking-wide hover:opacity-70 transition-opacity leading-none"
                >
                  {config.businessNameLabel || business.name}
                </a>
              )}
              <div className="text-xs text-black/50 font-light tracking-widest uppercase mt-1">
                Since {new Date().getFullYear()}
              </div>
            </div>
          </div>

          {/* Mobile toggle */}
          <div className="lg:hidden flex items-center gap-2">
            <StorefrontThemeToggle />
            <button
              className="p-2 rounded-lg transition-opacity hover:opacity-60"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle menu"
              aria-expanded={menuOpen}
              aria-controls={menuId}
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Desktop navigation row */}
        <div className="hidden lg:flex w-full items-center justify-between pt-2">
          <div className="flex items-center gap-8">
            {navigationLinks.map((link, idx) => (
              <div key={link.href} className="flex items-center gap-4">
                {idx > 0 && <span className="text-black/20 text-xs">—</span>}
                <a
                  href={link.href}
                  className="text-sm font-light tracking-wide transition-opacity hover:opacity-60"
                  onClick={(e) => {
                    e.preventDefault()
                    handleNavClick(link.href)
                  }}
                >
                  {link.label}
                </a>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <StorefrontThemeToggle />

            {config.ctaEnabled && config.ctaLabel && (
              <a
                href={config.ctaDestination || bookHref}
                className="text-sm font-light tracking-wide underline underline-offset-4 transition-opacity hover:opacity-60"
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
          </div>
        </div>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div
          id={menuId}
          className="lg:hidden absolute inset-x-0 top-full bg-white/95 backdrop-blur-sm border-b border-black/10"
          style={{
            backgroundColor: config.backgroundColor,
          }}
        >
          <nav className="flex flex-col gap-2 p-6">
            {navigationLinks.map((link: any) => (
              <a
                key={link.href}
                href={link.href}
                className="px-3 py-2 text-sm font-light tracking-wide rounded-lg transition-opacity hover:opacity-60"
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
                className="mt-3 px-3 py-2 text-sm font-light tracking-wide underline underline-offset-4"
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






