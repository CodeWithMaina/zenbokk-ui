import type { HeroVariantConfig } from '../../../lib/api/types'
import { HeroClassic } from './variants/HeroClassic'
import { HeroFullBackground } from './variants/HeroFullBackground'
import { HeroPremiumSplit } from './variants/HeroPremiumSplit'
import { HeroCenteredMinimal } from './variants/HeroCenteredMinimal'
import { HeroEditorial } from './variants/HeroEditorial'
import { HeroLuxury } from './variants/HeroLuxury'
import { HeroModernGradient } from './variants/HeroModernGradient'
import { HeroImmersiveFullScreen } from './variants/HeroImmersiveFullScreen'
import { HeroImageFocused } from './variants/HeroImageFocused'
import { HeroBoldTypography } from './variants/HeroBoldTypography'

export type HeroVariantProps = {
  config: HeroVariantConfig
  business: any
  heroImageUrl?: string
  heroImageVariants?: any[]
  onNavigate?: (href: string) => void
}

export type HeroVariant = {
  id: string
  name: string
  component: (props: HeroVariantProps) => React.ReactElement
}

/**
 * Hero variant registry.
 * Maps variant IDs to their implementations.
 * Provides fallback to Classic for unknown variants.
 */
export const HERO_VARIANTS: Record<string, HeroVariant> = {
  classic: {
    id: 'classic',
    name: 'Classic Hero',
    component: HeroClassic,
  },
  fullBackground: {
    id: 'fullBackground',
    name: 'Full Background Hero',
    component: HeroFullBackground,
  },
  premiumSplit: {
    id: 'premiumSplit',
    name: 'Premium Split Hero',
    component: HeroPremiumSplit,
  },
  centeredMinimal: {
    id: 'centeredMinimal',
    name: 'Centered Minimal Hero',
    component: HeroCenteredMinimal,
  },
  editorial: {
    id: 'editorial',
    name: 'Editorial Hero',
    component: HeroEditorial,
  },
  luxury: {
    id: 'luxury',
    name: 'Luxury Hero',
    component: HeroLuxury,
  },
  modernGradient: {
    id: 'modernGradient',
    name: 'Modern Gradient Hero',
    component: HeroModernGradient,
  },
  immersiveFullScreen: {
    id: 'immersiveFullScreen',
    name: 'Immersive Fullscreen Hero',
    component: HeroImmersiveFullScreen,
  },
  imageFocused: {
    id: 'imageFocused',
    name: 'Image Focused Hero',
    component: HeroImageFocused,
  },
  boldTypography: {
    id: 'boldTypography',
    name: 'Bold Typography Hero',
    component: HeroBoldTypography,
  },
}

/**
 * Get a hero variant by ID.
 * Falls back to Classic if variant not found.
 */
export function getHeroVariant(variantId?: string): HeroVariant {
  if (!variantId || !HERO_VARIANTS[variantId]) {
    return HERO_VARIANTS.classic
  }
  return HERO_VARIANTS[variantId]
}

/**
 * Hero Variant Wrapper
 * Renders the appropriate hero variant based on configuration.
 */
export function HeroVariantWrapper(props: HeroVariantProps) {
  const variant = getHeroVariant(props.config.variant)
  const Component = variant.component
  return <Component {...props} />
}
