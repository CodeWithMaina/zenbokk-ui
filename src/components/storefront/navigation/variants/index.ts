/**
 * Storefront Navigation Variants
 *
 * Registry of all available navigation variant components.
 * Each variant provides a distinct visual design while supporting
 * the same configuration properties and behavior.
 */

export { NavigationClassic } from './NavigationClassic'
export { NavigationMinimal } from './NavigationMinimal'
export { NavigationPremium } from './NavigationPremium'
export { NavigationFloating } from './NavigationFloating'
export { NavigationTransparent } from './NavigationTransparent'
export { NavigationCentered } from './NavigationCentered'
export { NavigationEditorial } from './NavigationEditorial'
export { NavigationCompact } from './NavigationCompact'

/**
 * Navigation variant registry mapping variant names to component constructors.
 * Used by the storefront builder to dynamically render the selected variant.
 */
import type { NavigationVariantConfig } from '../../../../lib/api/types'
import { NavigationClassic } from './NavigationClassic'
import { NavigationMinimal } from './NavigationMinimal'
import { NavigationPremium } from './NavigationPremium'
import { NavigationFloating } from './NavigationFloating'
import { NavigationTransparent } from './NavigationTransparent'
import { NavigationCentered } from './NavigationCentered'
import { NavigationEditorial } from './NavigationEditorial'
import { NavigationCompact } from './NavigationCompact'

type NavigationVariantComponentProps = {
  config: NavigationVariantConfig
  business: any
  canonicalSlug: string
  pathname: string
  teamCount?: number
  bookingCount?: number
  onNavigate?: (href: string) => void
}

type NavigationVariantComponent = (
  props: NavigationVariantComponentProps,
) => React.ReactElement

export const navigationVariantRegistry: Record<
  string,
  NavigationVariantComponent
> = {
  classic: NavigationClassic,
  minimal: NavigationMinimal,
  premium: NavigationPremium,
  floating: NavigationFloating,
  transparent: NavigationTransparent,
  centered: NavigationCentered,
  editorial: NavigationEditorial,
  compact: NavigationCompact,
}

/**
 * Get the navigation variant component for the given variant name.
 * Falls back to Classic if the variant is not found.
 */
export function getNavigationVariant(
  variantName?: string | null,
): NavigationVariantComponent {
  if (!variantName) return NavigationClassic

  const variant = navigationVariantRegistry[variantName.toLowerCase()]
  return variant || NavigationClassic
}

/**
 * List all available navigation variant names.
 */
export function getAvailableNavigationVariants(): string[] {
  return Object.keys(navigationVariantRegistry)
}




