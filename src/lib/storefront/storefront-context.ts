import { createContext } from 'react'
import type {
  CustomerCapabilities,
  PublicBusinessProfile,
  PublicLandingPage,
  PublicStorefront,
} from '../api/types'
import type { CapabilityKey } from '../entitlements'

export type StorefrontContextValue = {
  /** Address the visitor is on (what the URL says). */
  slug: string
  /** Address the business currently answers to (differs after a rename). */
  canonicalSlug: string
  businessId: string
  business: PublicBusinessProfile
  landingPage: PublicLandingPage
  /**
   * The rich Storefront Builder configuration when the business has published
   * one; null for businesses still on the legacy simple landing page. The public
   * components read their design from here and fall back to the flat landing-page
   * fields when it is absent.
   */
  storefront: PublicStorefront | null
  capabilities: CustomerCapabilities
  /** Capability gate for storefront sections (services, appointments, gallery…). */
  can: (key: CapabilityKey) => boolean
}

export const StorefrontContext = createContext<StorefrontContextValue | null>(null)
