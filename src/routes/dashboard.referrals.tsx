import { createFileRoute } from '@tanstack/react-router'
import { ModulePlaceholder } from '../components/shell/ModulePlaceholder'

/** Referrals — placeholder (`referral` module, `referral.view`). */
export const Route = createFileRoute('/dashboard/referrals')({
  component: ReferralsPlaceholder,
})

function ReferralsPlaceholder() {
  return <ModulePlaceholder navKey="referrals" />
}
