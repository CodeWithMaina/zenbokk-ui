import type { FooterVariantConfig } from '../../../lib/api/types'
import { FooterClassic } from './variants/FooterClassic'
import { FooterMinimal } from './variants/FooterMinimal'
import { FooterPremium } from './variants/FooterPremium'
import { FooterCentered } from './variants/FooterCentered'
import { FooterModern } from './variants/FooterModern'
import { FooterEditorial } from './variants/FooterEditorial'
import { FooterDark } from './variants/FooterDark'

export type FooterVariantProps = {
  config: FooterVariantConfig
  business: any
}

export type FooterVariant = {
  id: string
  name: string
  component: (props: FooterVariantProps) => React.ReactElement
}

/**
 * Footer variant registry.
 * Maps variant IDs to their implementations.
 * Provides fallback to Classic for unknown variants.
 */
export const FOOTER_VARIANTS: Record<string, FooterVariant> = {
  classic: {
    id: 'classic',
    name: 'Classic Footer',
    component: FooterClassic,
  },
  minimal: {
    id: 'minimal',
    name: 'Minimal Footer',
    component: FooterMinimal,
  },
  premium: {
    id: 'premium',
    name: 'Premium Footer',
    component: FooterPremium,
  },
  centered: {
    id: 'centered',
    name: 'Centered Footer',
    component: FooterCentered,
  },
  modern: {
    id: 'modern',
    name: 'Modern Footer',
    component: FooterModern,
  },
  editorial: {
    id: 'editorial',
    name: 'Editorial Footer',
    component: FooterEditorial,
  },
  dark: {
    id: 'dark',
    name: 'Dark Footer',
    component: FooterDark,
  },
}

/**
 * Get a footer variant by ID.
 * Falls back to Classic if variant not found.
 */
export function getFooterVariant(variantId?: string): FooterVariant {
  if (!variantId || !FOOTER_VARIANTS[variantId]) {
    return FOOTER_VARIANTS.classic
  }
  return FOOTER_VARIANTS[variantId]
}

/**
 * Footer Variant Wrapper
 * Renders the appropriate footer variant based on configuration.
 */
export function FooterVariantWrapper(props: FooterVariantProps) {
  const variant = getFooterVariant(props.config.variant)
  const Component = variant.component
  return <Component {...props} />
}
