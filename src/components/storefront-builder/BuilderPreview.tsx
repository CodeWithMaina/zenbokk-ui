import { useMemo } from 'react'
import type { CapabilityKey } from '../../lib/entitlements'
import { MODULE } from '../../lib/entitlements'
import type { PublicBusinessProfile, StorefrontConfig } from '../../lib/api/types'
import type { DashboardBusiness } from '../../lib/api/types'
import { StorefrontRenderer } from '../storefront/StorefrontBlocksNew'

/** Maps a customer capability onto the module that backs it (mirrors the API). */
const CAPABILITY_MODULE: Record<string, string> = {
  services: MODULE.serviceCatalog,
  appointments: MODULE.appointments,
  loyalty: MODULE.loyalty,
  rewards: MODULE.rewards,
  referrals: MODULE.referral,
  payments: MODULE.payments,
  notifications: MODULE.notifications,
  gallery: MODULE.gallery,
  galleryReviews: MODULE.reviews,
}

/**
 * A capability gate for the editor preview. The preview must hide exactly what
 * the public storefront hides, so it is derived from the business's effective
 * module entitlements — the same answer `[RequireModule]` gives the API.
 */
export function useEditorCapabilities(
  hasModule: (key: string) => boolean,
  business: DashboardBusiness,
) {
  return useMemo(
    () => ({
      can: (capability: CapabilityKey) => {
        const moduleKey = CAPABILITY_MODULE[capability]
        if (!moduleKey) return true
        // Loyalty additionally needs a live programme, exactly as the API does.
        if (capability === 'loyalty' || capability === 'rewards') {
          return hasModule(moduleKey) && business.hasLoyaltyProgram
        }
        if (capability === 'referrals') return hasModule(moduleKey) && business.hasReferralProgram
        return hasModule(moduleKey)
      },
    }),
    [hasModule, business.hasLoyaltyProgram, business.hasReferralProgram],
  )
}

/** Adapts the owner-shell business row to the public profile the renderer expects. */
export function toPreviewProfile(
  business: DashboardBusiness,
  can: (capability: CapabilityKey) => boolean,
): PublicBusinessProfile {
  return {
    id: business.id,
    slug: business.slug,
    name: business.name,
    category: business.category ?? '',
    location: business.location ?? '',
    description: business.description,
    logoUrl: business.logoUrl,
    logoMediaId: null,
    logoVariants: [],
    coverMediaId: null,
    galleryMediaIds: [],
    phoneNumber: business.phoneNumber,
    email: business.email,
    hasAppointments: can('appointments'),
    hasLoyalty: business.hasLoyaltyProgram,
    hasReferralProgram: business.hasReferralProgram,
    capabilities: {},
    loyaltyProgram: business.hasLoyaltyProgram
      ? { name: 'Loyalty programme', stampsRequired: 10, rewardDescription: 'A reward on us.', defaultEnrollmentStamps: 0 }
      : null,
  }
}

export function BuilderPreview({
  config,
  business,
  can,
  device,
  selectedSectionId,
  onSelectSection,
}: {
  config: StorefrontConfig
  business: PublicBusinessProfile
  can: (capability: CapabilityKey) => boolean
  device: 'desktop' | 'tablet' | 'mobile'
  selectedSectionId: string | null
  onSelectSection: (id: string) => void
}) {
  return (
    <div className={`sfb-frame is-${device}`} data-preview-device={device}>
      <div className="sfb-frame-inner">
        <StorefrontRenderer
          config={config}
          business={business}
          can={can}
          onSelectSection={onSelectSection}
          selectedSectionId={selectedSectionId}
        />
      </div>
    </div>
  )
}
