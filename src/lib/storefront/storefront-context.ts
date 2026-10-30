import { createContext } from 'react'
import type { CustomerCapabilities, PublicBusinessProfile, PublicLandingPage } from '../api/types'
import type { CapabilityKey } from '../entitlements'

export type StorefrontContextValue = {
  /** Address the visitor is on (what the URL says). */
  slug: string
  /** Address the business currently answers to (differs after a rename). */
  canonicalSlug: string
  businessId: string
  business: PublicBusinessProfile
  landingPage: PublicLandingPage
  capabilities: CustomerCapabilities
  /** Capability gate for storefront sections (services, appointments, gallery…). */
  can: (key: CapabilityKey) => boolean
}

export const StorefrontContext = createContext<StorefrontContextValue | null>(null)
