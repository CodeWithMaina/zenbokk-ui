import { useCallback } from 'react'
import { useRouter } from '@tanstack/react-router'
import { emptyDraft, writeBookingDraft } from './booking-draft'
import { useStorefront } from './use-storefront'
import { storefrontHref } from '../tenant'

/**
 * Start a booking, optionally with a service or a specialist already chosen.
 *
 * The storefront has two address shapes and every page exists twice — once for
 * `zenbokk.com/nuru-studio/services` and once for
 * `nuru-studio.zenbokk.com/services`. Anything that navigates has to behave
 * identically in both, so the seeding lives here rather than in a route file
 * where only one of the two twins would get it.
 *
 * Writing the draft before navigating is what makes "book this service" open the
 * wizard on the service the visitor just chose instead of an empty step one.
 */
export function useStartBooking() {
  const { businessId, canonicalSlug } = useStorefront()
  const router = useRouter()

  return useCallback(
    (selection: { serviceIds?: string[]; staffId?: string | null } = {}) => {
      writeBookingDraft(businessId, {
        ...emptyDraft,
        serviceIds: selection.serviceIds ?? [],
        staffId: selection.staffId ?? null,
        step: 'services',
      })
      void router.history.push(storefrontHref(canonicalSlug, '/book'))
    },
    [businessId, canonicalSlug, router],
  )
}
