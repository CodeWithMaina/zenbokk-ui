import { useStorefront } from './use-storefront'
import { useBookingTray } from './use-booking-tray'

/**
 * The lineup, as a card or a detail page needs it.
 *
 * Returns the current membership plus the toggle, so a service tile and the
 * booking wizard read the same store and can never disagree about whether a
 * service is already chosen.
 */
export function useLineupToggle() {
  const { businessId } = useStorefront()
  const { draft, toggleService } = useBookingTray(businessId)

  return {
    selectedIds: draft.serviceIds,
    isSelected: (serviceId: string) => draft.serviceIds.includes(serviceId),
    toggle: toggleService,
  }
}
