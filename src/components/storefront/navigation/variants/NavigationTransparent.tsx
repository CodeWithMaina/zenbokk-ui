import { Menu, X } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import type { NavigationVariantConfig } from '../../../../lib/api/types'
import { storefrontHref } from '../../../../lib/tenant'
import { cn } from '../../../../lib/cn'
import { StorefrontThemeToggle } from '../../StorefrontThemeToggle'

/**
 * Transparent Navigation Variant
 *
 * Transparent background over hero images that transitions to solid on scroll.
 * Perfect for full-bleed hero sections with text overlay.
 */
export function NavigationTransparent({
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
  const [scrolled, setScrolled] = useState(false)
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

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleNavClick = (href: string) => {
    setMenuOpen(false)
    onNavigate?.(href)
  }

  const containerPadding = config.horizontalSpacing === 'compact' ? 'px-4' : config.horizontalSpacing === 'loose' ? 'px-8' : 'px-6'

  return (
    <header
      className={cn(
        'sf-header',
        'fixed inset-x-0 top-0 z-40 transition-all duration-300',
        config.sticky ? 'sticky' : '',
        scrolled
          ? 'bg-white/95 backdrop-blur-md shadow-sm'
          : 'bg-transparent',
      )}
    >
      <nav
        className={cn(
          'sf-header-inner flex items-center justify-between',
          containerPadding,
          'h-16 mx-auto max-w-7xl',
        )}
        aria-label="Primary navigation"
        style={{
          color: scrolled ? config.textColor : '#ffffff',
        }}
      >
        {/* Logo and brand */}
        <div className="flex items-center gap-3">
          {config.logoMediaId || business.logoUrl ? (
            <a href={homeHref} className="shrink-0">
              <img
                src={business.logoUrl}
                alt={business.name}
                className="h-8 w-auto object-contain filter drop-shadow-lg"
              />
            </a>
          ) : null}
          {config.showBusinessName && (
            <a
              href={homeHref}
              className={cn(
                'text-sm font-semibold transition-all',
                scrolled ? 'text-black' : 'text-white drop-shadow-lg',
              )}
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
              className={cn(
                'text-sm font-medium transition-all',
                scrolled ? 'hover:opacity-70' : 'text-white drop-shadow-lg hover:opacity-90',
              )}
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
              className={cn(
                'hidden sm:inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all',
                scrolled
                  ? 'hover:shadow-md'
                  : 'hover:shadow-lg filter drop-shadow',
              )}
              style={{
                backgroundColor: scrolled ? config.linkColor : 'rgba(255, 255, 255, 0.2)',
                color: scrolled ? '#ffffff' : '#ffffff',
                backdropFilter: scrolled ? 'none' : 'blur(10px)',
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
            className={cn(
              'lg:hidden p-2 rounded-lg transition-all',
              scrolled ? 'hover:bg-black/10' : 'hover:bg-white/20',
            )}
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
          className={cn(
            'lg:hidden absolute inset-x-0 top-full',
            scrolled ? 'bg-white/98' : 'bg-white/95',
            'backdrop-blur-md border-t border-black/10',
          )}
        >
          <nav className="flex flex-col gap-1 p-4">
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






