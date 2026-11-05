/**
 * Storefront component configuration factory functions.
 * 
 * Creates default configurations for Navigation, Hero, and Footer variants
 * based on business data and existing settings.
 */

import type {
  NavigationVariantConfig,
  HeroVariantConfig,
  FooterVariantConfig,
  StorefrontNavLink,
  StorefrontSocialLink,
} from '../../lib/api/types'

export function createDefaultNavigationConfig(business: any): NavigationVariantConfig {
  return {
    variant: 'classic',
    logoMediaId: business.logoMediaId || null,
    logoSize: 'md',
    showBusinessName: true,
    businessNameLabel: null,
    navigationLinks: [
      { label: 'Home', href: '/' },
      { label: 'Services', href: '/services' },
      { label: 'Contact', href: '/contact' },
    ] as StorefrontNavLink[],
    ctaEnabled: true,
    ctaLabel: 'Book now',
    ctaDestination: 'booking',
    backgroundColor: 'transparent',
    textColor: 'var(--premium-text)',
    linkColor: 'var(--premium-text)',
    borderStyle: 'none',
    borderColor: 'transparent',
    boxShadow: 'none',
    transparency: 0,
    headerHeight: '4.5rem',
    horizontalSpacing: '1rem',
    verticalSpacing: '0.5rem',
    sticky: true,
    scrollBehavior: 'fade-out',
    mobileStyle: 'hamburger',
  }
}

export function createDefaultHeroConfig(business: any): HeroVariantConfig {
  return {
    variant: 'classic',
    eyebrow: business.category || null,
    heading: business.name,
    description: business.description || 'Welcome to our business',
    primaryCtaLabel: 'Book now',
    primaryCtaDestination: 'booking',
    secondaryCtaLabel: null,
    secondaryCtaDestination: null,
    decorativeText: null,
    backgroundStyle: 'solid',
    backgroundMediaId: null,
    backgroundColor: '#ffffff',
    gradientFrom: '#ffffff',
    gradientTo: '#f5f5f5',
    videoUrl: null,
    imagePosition: 'center',
    imageFocalPoint: '50% 50%',
    imageScale: 1,
    overlayColor: 'rgba(0, 0, 0, 0)',
    overlayOpacity: 0.3,
    height: 'screen',
    contentAlignment: 'center',
    textAlign: 'center',
    contentMaxWidth: '48rem',
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
  }
}

export function createDefaultFooterConfig(business: any): FooterVariantConfig {
  return {
    variant: 'classic',
    logoMediaId: business.logoMediaId || null,
    logoVisible: true,
    businessNameVisible: true,
    descriptionText: business.description || null,
    showContact: true,
    phoneNumber: business.phoneNumber || null,
    email: business.email || null,
    address: business.location || null,
    showNavigation: true,
    navigationLinks: [
      { label: 'Home', href: '/' },
      { label: 'Privacy', href: '/privacy' },
      { label: 'Terms', href: '/terms' },
    ] as StorefrontNavLink[],
    showSocial: false,
    socialLinks: [] as StorefrontSocialLink[],
    showCopyright: true,
    copyrightText: `© ${new Date().getFullYear()} ${business.name}. All rights reserved.`,
    backgroundColor: 'var(--premium-surface)',
    textColor: 'var(--premium-text)',
    linkColor: 'var(--premium-primary)',
    spacing: 'normal',
    contentAlignment: 'left',
  }
}
