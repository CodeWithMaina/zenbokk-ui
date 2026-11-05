import type { NavigationVariantConfig } from '../../../lib/api/types'
import { getNavigationVariant } from './variants'

export type NavigationVariantProps = {
  config: NavigationVariantConfig
  business: any
  canonicalSlug: string
  pathname: string
  teamCount?: number
  bookingCount?: number
  onNavigate?: (href: string) => void
}

/**
 * Navigation Variant Wrapper
 * Renders the appropriate navigation variant based on configuration.
 * Falls back to Classic if variant not found.
 */
export function NavigationVariantWrapper(props: NavigationVariantProps) {
  const Component = getNavigationVariant(props.config.variant)
  return <Component {...props} />
}

