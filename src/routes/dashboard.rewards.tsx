import { createFileRoute } from '@tanstack/react-router'
import { ModulePlaceholder } from '../components/shell/ModulePlaceholder'

/** Rewards — placeholder (`rewards` module, `rewards.view`). */
export const Route = createFileRoute('/dashboard/rewards')({
  component: RewardsPlaceholder,
})

function RewardsPlaceholder() {
  return <ModulePlaceholder navKey="rewards" />
}
