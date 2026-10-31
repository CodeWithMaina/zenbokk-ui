import { Sparkles } from 'lucide-react'
import { useStorefront } from '../../../lib/storefront'
import { Card } from '../../ui/card'
import { EmptyState } from '../../ui/empty-state'
import { StorefrontSection } from '../StorefrontSection'

export type LoyaltySectionProps = {
  title: string | null
  description: string | null
}

/**
 * The active loyalty programme.
 *
 * The summary comes from the storefront bootstrap (`business.loyaltyProgram`),
 * which is already null when loyalty is disabled or no programme is active — so
 * the honest empty state is the only thing left to render in that case.
 */
export function LoyaltySection({ title, description }: LoyaltySectionProps) {
  const { business } = useStorefront()
  const program = business.loyaltyProgram

  return (
    <StorefrontSection
      id="loyalty"
      eyebrow="Come back, get rewarded"
      title={title}
      description={description}
      defaultTitle="Loyalty"
      defaultDescription="Collect stamps on every visit and turn them into a reward."
    >
      {program ? (
        <Card className="grid gap-[1.2rem] p-[clamp(1rem,3vw,1.6rem)] sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div>
            <p className="eyebrow">{program.name}</p>
            <p className="display mt-[0.35rem] text-title">
              {program.stampsRequired} stamps
            </p>
            <p className="mt-[0.4rem] text-meta text-muted">
              {program.rewardDescription}
            </p>
          </div>

          <div className="rounded-card bg-accent-soft p-[1rem] text-accent-ink">
            <p className="flex items-center gap-[0.4rem] text-label font-semibold">
              <Sparkles className="size-[1rem]" aria-hidden="true" />
              {program.defaultEnrollmentStamps > 0
                ? `Join with ${program.defaultEnrollmentStamps} stamp${program.defaultEnrollmentStamps === 1 ? '' : 's'}`
                : 'Start collecting today'}
            </p>
            <p className="mt-[0.4rem] text-meta">
              Create an account on this page and your card is waiting the next time you visit.
            </p>
          </div>
        </Card>
      ) : (
        <EmptyState
          icon={<Sparkles className="size-5" />}
          title="No active loyalty programme"
          description={`${business.name} is not running a stamp programme right now.`}
        />
      )}
    </StorefrontSection>
  )
}
