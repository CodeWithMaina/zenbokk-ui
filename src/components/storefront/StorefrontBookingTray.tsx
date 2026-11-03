import { ArrowRight, Clock } from 'lucide-react'
import { formatDuration, money } from '../../lib/format'
import { useStorefront } from '../../lib/storefront'
import { useStorefrontServices } from '../../lib/storefront/use-storefront-catalog'
import { useBookingTray } from '../../lib/storefront/use-booking-tray'
import { storefrontHref } from '../../lib/tenant'

/**
 * The lineup tray.
 *
 * A visitor browsing the menu accumulates services; this bar keeps that
 * selection visible and offers one way forward, without ever navigating away
 * from what they were reading. It reads the same shared draft the wizard writes,
 * so adding a service on a detail page updates it immediately.
 *
 * Prices and durations come from the catalogue, not from the draft: the draft
 * stores ids, and a service whose price changed while the visitor was browsing
 * must show its current price. A draft can also outlive a service being
 * unpublished, so ids that no longer resolve are simply not counted.
 */
export function StorefrontBookingTray() {
  const { businessId, canonicalSlug, can } = useStorefront()
  const { draft } = useBookingTray(businessId)
  const { services } = useStorefrontServices(businessId, can('services'))

  const selected = services.filter((service) => draft.serviceIds.includes(service.id))
  const total = selected.reduce((sum, service) => sum + service.price, 0)
  const duration = selected.reduce((sum, service) => sum + service.durationMinutes, 0)

  if (!can('appointments') || selected.length === 0) return null

  return (
    <div className="sf-tray" role="status" aria-live="polite">
      <div className="sf-tray-meta">
        <b>
          {selected.length} service{selected.length === 1 ? '' : 's'} · {money(total)}
        </b>
        <span className="flex items-center gap-[0.3rem]">
          <Clock className="size-[0.8rem]" aria-hidden="true" />
          {formatDuration(duration)} in total
        </span>
      </div>
      <a href={storefrontHref(canonicalSlug, '/book')} className="sf-tray-btn">
        Continue
        <ArrowRight className="size-[0.85rem]" aria-hidden="true" />
      </a>
    </div>
  )
}

/**
 * Adds a service to the lineup without leaving the page.
 *
 * See `useLineupToggle` in `src/lib/storefront/use-lineup.ts` — it lives with the
 * other storefront hooks so this file exports components only.
 */
