import type { ReactNode } from 'react'
import type {
  ImageVariant,
  PublicBusinessProfile,
  StorefrontConfig,
} from '../../lib/api/types'
import type { CapabilityKey } from '../../lib/entitlements'
import { pickVariant } from '../../lib/media'
import { StorefrontThemeStyle } from './StorefrontThemeStyle'
import { NavigationVariantWrapper } from './navigation/NavigationVariantWrapper'
import { HeroVariantWrapper } from './hero/HeroVariantWrapper'
import { FooterVariantWrapper } from './footer/FooterVariantWrapper'
import {
  createDefaultNavigationConfig,
  createDefaultHeroConfig,
  createDefaultFooterConfig,
} from '../../lib/storefront/variant-config-defaults'

/**
 * Simplified Storefront Renderer for Three-Component Landing Pages
 * 
 * Renders exclusively:
 * 1. Navigation (variant-based)
 * 2. Hero (variant-based)
 * 3. Footer (variant-based)
 * 
 * No multi-section landing page builder. The public storefront is now
 * a premium, minimal three-component experience.
 */

export type StorefrontRendererProps = {
  config: StorefrontConfig
  business: PublicBusinessProfile
  can?: (capability: CapabilityKey) => boolean
  heroVariants?: ImageVariant[]
  resolveHref?: (kind: string) => string
  onSelectSection?: (id: string) => void
  selectedSectionId?: string | null
  includeFooter?: boolean
  footer?: ReactNode
  pathname?: string
  canonicalSlug?: string
  teamCount?: number
  bookingCount?: number
  onNavigate?: (href: string) => void
}

/**
 * Main storefront renderer component.
 * Used by both the public storefront and the builder preview.
 */
export function StorefrontRenderer({
  config,
  business,
  heroVariants = [],
  includeFooter = true,
  pathname = '/',
  canonicalSlug = business.slug || '',
  teamCount = 0,
  bookingCount = 0,
  onNavigate,
}: StorefrontRendererProps) {
  const heroImageUrl = pickVariant(heroVariants)?.url
  
  // Build configs from provided config or create defaults
  const navigationConfig = config.header ? {
    variant: config.header.variant || 'classic',
    logoMediaId: config.header.logoMediaId,
    logoSize: config.header.logoSize || 'md',
    showBusinessName: config.header.showBusinessName ?? true,
    businessNameLabel: null,
    navigationLinks: [],
    ctaEnabled: config.header.ctaEnabled ?? true,
    ctaLabel: config.header.ctaLabel || 'Book now',
    ctaDestination: config.header.ctaType || 'booking',
    backgroundColor: config.header.background || 'transparent',
    textColor: config.header.textColor || 'var(--premium-text)',
    linkColor: config.header.textColor || 'var(--premium-text)',
    borderStyle: 'none',
    borderColor: 'transparent',
    boxShadow: 'none',
    transparency: 0,
    headerHeight: config.header.spacing || '4.5rem',
    horizontalSpacing: '1rem',
    verticalSpacing: '0.5rem',
    sticky: config.header.sticky ?? true,
    scrollBehavior: 'fade-out',
    mobileStyle: config.header.mobileStyle || 'hamburger',
  } : createDefaultNavigationConfig(business)

  const heroConfig = config.hero ? {
    variant: config.hero.variant || 'classic',
    enabled: config.hero.enabled ?? true,
    eyebrow: config.hero.eyebrow,
    heading: config.hero.heading || business.name,
    description: config.hero.description,
    primaryCtaLabel: config.hero.primaryCtaLabel || 'Book now',
    primaryCtaDestination: config.hero.primaryCtaType || 'booking',
    secondaryCtaLabel: config.hero.secondaryCtaLabel,
    secondaryCtaDestination: config.hero.secondaryCtaType,
    decorativeText: null,
    backgroundStyle: (config.hero.backgroundMediaId ? 'image' : 'solid') as any,
    backgroundMediaId: config.hero.backgroundMediaId,
    backgroundColor: '#ffffff',
    gradientFrom: '#ffffff',
    gradientTo: '#f5f5f5',
    videoUrl: config.hero.videoUrl,
    imagePosition: config.hero.imagePosition || 'center',
    imageFocalPoint: '50% 50%',
    imageScale: 1,
    overlayColor: 'rgba(0, 0, 0, 0)',
    overlayOpacity: config.hero.overlayOpacity ?? 0.3,
    height: config.hero.height || 'screen',
    contentAlignment: 'center',
    textAlign: config.hero.textAlign || 'center',
    contentMaxWidth: config.hero.contentWidth || '48rem',
    horizontalPosition: 'center',
    verticalPosition: 'center',
    sectionPadding: '2rem',
    headingFont: 'var(--premium-font-heading)',
    headingSize: '3.5rem',
    headingWeight: 700,
    headingColor: 'var(--premium-text)',
    bodyFont: 'var(--premium-font-body)',
    bodySize: '1.125rem',
    bodyColor: 'var(--premium-muted-text)',
    lineHeight: '1.6',
    letterSpacing: '0',
    buttonStyle: 'rounded',
    buttonColor: 'var(--premium-primary)',
    buttonTextColor: '#ffffff',
    buttonBorderRadius: '0.375rem',
    buttonSize: 'md',
    buttonAlignment: 'center',
    primaryCtaVisible: true,
    secondaryCtaVisible: false,
  } : createDefaultHeroConfig(business)

  const footerConfig = config.footer ? {
    variant: config.footer.variant || 'classic',
    logoMediaId: config.footer.logoMediaId,
    logoVisible: config.footer.showLogo ?? true,
    businessNameVisible: true,
    descriptionText: config.footer.description,
    showContact: config.footer.showContact ?? true,
    phoneNumber: business.phoneNumber || null,
    email: business.email || null,
    address: business.location || null,
    showNavigation: config.footer.showNav ?? true,
    navigationLinks: config.footer.legalLinks || [],
    showSocial: config.footer.showSocial ?? false,
    socialLinks: config.footer.socials || [],
    showCopyright: true,
    copyrightText: config.footer.copyright || `© ${new Date().getFullYear()} ${business.name}. All rights reserved.`,
    backgroundColor: config.footer.backgroundColor || 'var(--premium-surface)',
    textColor: config.footer.textColor || 'var(--premium-text)',
    linkColor: 'var(--premium-primary)',
    spacing: 'normal',
    contentAlignment: 'left',
  } : createDefaultFooterConfig(business)

  return (
    <StorefrontThemeStyle theme={config.theme}>
      <div className="sf-page-root">
        {/* Navigation Component */}
        <NavigationVariantWrapper
          config={navigationConfig}
          business={business}
          canonicalSlug={canonicalSlug}
          pathname={pathname}
          teamCount={teamCount}
          bookingCount={bookingCount}
          onNavigate={onNavigate}
        />

        {/* Hero Component */}
        {config.hero?.enabled !== false && (
          <HeroVariantWrapper
            config={heroConfig}
            business={business}
            heroImageUrl={heroImageUrl}
            heroImageVariants={heroVariants}
            onNavigate={onNavigate}
          />
        )}

        {/* Footer Component */}
        {includeFooter && (
          <FooterVariantWrapper
            config={footerConfig}
            business={business}
          />
        )}
      </div>
    </StorefrontThemeStyle>
  )
}

