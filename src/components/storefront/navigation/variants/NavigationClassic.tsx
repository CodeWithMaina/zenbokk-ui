import { useEffect, useId, useState } from 'react'
import { CalendarPlus, ShoppingBag, X } from 'lucide-react'
import type { NavigationVariantConfig } from '../../../../lib/api/types'
import { storefrontHref } from '../../../../lib/tenant'
import { cn } from '../../../../lib/cn'
import { StorefrontThemeToggle } from '../../StorefrontThemeToggle'

/**
 * Classic Navigation Variant
 * 
 * Reproduces the existing StorefrontNav exactly, maintaining all visual
 * appearance, spacing, typography, and interactive behavior.
 */
export function NavigationClassic({
  config,
  business,
  canonicalSlug,
  pathname,
  bookingCount = 0,
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
  const isHome = pathname === homeHref || pathname === `${homeHref}/`

  // Build navigation links from config
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
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleNavClick = (href: string) => {
    setMenuOpen(false)
    onNavigate?.(href)
  }

  return (
    <header
      className={cn(
        'sf-header',
        'fixed inset-x-0 top-0 z-40 backdrop-blur-sm',
        scrolled && !isHome ? 'bg-[var(--premium-surface)]/90 border-b border-[var(--premium-line)]' : '',
        isHome && !scrolled ? 'bg-transparent' : 'bg-[var(--premium-surface)]/80',
        'transition-all duration-200',
      )}
      style={{
        backgroundColor: config.backgroundColor,
        color: config.textColor,
      }}
    >
      <nav
        className="sf-header-inner h-[4.5rem] flex items-center justify-between px-[1rem] lg:px-[2rem] mx-auto max-w-[--premium-content-width]"
        aria-label="Primary navigation"
      >
        {/* Logo and brand */}
        <div className="flex items-center gap-[1rem]">
          {config.logoMediaId || business.logoUrl ? (
            <a href={homeHref} className="shrink-0">
              <img
                src={business.logoUrl}
                alt={business.name}
                className="h-[2.5rem] w-auto object-contain"
              />
            </a>
          ) : null}
          {config.showBusinessName && (
            <a href={homeHref} className="text-[0.875rem] font-semibold tracking-tight hover:opacity-75 transition-opacity">
              {config.businessNameLabel || business.name}
            </a>
          )}
        </div>

        {/* Desktop navigation */}
        <div className="hidden lg:flex items-center gap-[2rem]">
          {navigationLinks.map((link: any) => (
            <a
              key={link.href}
              href={link.href}
              className="text-[0.875rem] font-medium transition-opacity hover:opacity-70"
              onClick={(e) => {
                e.preventDefault()
                handleNavClick(link.href)
              }}
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Actions and mobile menu */}
        <div className="flex items-center gap-[0.5rem]">
          <StorefrontThemeToggle />

          {config.ctaEnabled && config.ctaLabel && (
            <a
              href={config.ctaDestination || bookHref}
              className="hidden sm:inline-flex items-center gap-[0.5rem] rounded px-[1rem] py-[0.5rem] text-[0.875rem] font-medium transition-all"
              style={{
                backgroundColor: config.linkColor || 'var(--premium-primary)',
                color: '#ffffff',
              }}
              onClick={(e) => {
                e.preventDefault()
                handleNavClick(config.ctaDestination || bookHref)
              }}
            >
              <CalendarPlus className="w-4 h-4" />
              {config.ctaLabel}
            </a>
          )}

          {/* Booking tray badge */}
          {bookingCount > 0 && (
            <a href={bookHref} className="relative p-2 transition-opacity hover:opacity-70">
              <ShoppingBag className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {bookingCount}
              </span>
            </a>
          )}

          {/* Mobile menu toggle */}
          <button
            className="lg:hidden p-2 transition-opacity hover:opacity-70"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            aria-controls={menuId}
          >
            {menuOpen ? <X className="w-5 h-5" /> : <ShoppingBag className="w-5 h-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div
          id={menuId}
          className="lg:hidden absolute inset-x-0 top-full bg-[var(--premium-surface)] border-b border-[var(--premium-line)]"
        >
          <nav className="flex flex-col gap-[0.25rem] p-[1rem]">
            {navigationLinks.map((link: any) => (
              <a
                key={link.href}
                href={link.href}
                className="px-[0.5rem] py-[0.5rem] text-sm font-medium rounded transition-opacity hover:bg-[var(--premium-surface-hover)]"
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
                className="mt-[0.5rem] px-[0.5rem] py-[0.75rem] rounded text-sm font-medium text-center transition-all"
                style={{
                  backgroundColor: config.linkColor || 'var(--premium-primary)',
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
          </nav>
        </div>
      )}
    </header>
  )
}




