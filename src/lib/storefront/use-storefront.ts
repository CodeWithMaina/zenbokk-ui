import { useContext } from 'react'
import { StorefrontContext } from './storefront-context'
import type { StorefrontContextValue } from './storefront-context'

/**
 * The business being browsed. Must sit under a `$slug` storefront route.
 *
 * Never re-read the slug from the URL in a component: this context carries the
 * canonical slug and the entitled capabilities alongside the profile.
 */
export function useStorefront(): StorefrontContextValue {
  const context = useContext(StorefrontContext)
  if (!context) {
    throw new Error('useStorefront must be used inside a storefront route')
  }
  return context
}
