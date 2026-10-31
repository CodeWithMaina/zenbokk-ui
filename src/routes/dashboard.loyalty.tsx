import { createFileRoute } from '@tanstack/react-router'
import { ModulePlaceholder } from '../components/shell/ModulePlaceholder'

/**
 * Loyalty — placeholder.
 *
 * Parent entry of the loyalty group in the sidebar; its nested items (programs,
 * rewards, stamping, card design) carry their own module gates.
 */
export const Route = createFileRoute('/dashboard/loyalty')({
  component: LoyaltyPlaceholder,
})

function LoyaltyPlaceholder() {
  return <ModulePlaceholder navKey="loyalty" />
}
