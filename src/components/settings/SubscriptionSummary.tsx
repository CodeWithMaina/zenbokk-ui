import type { ReactNode } from 'react'
import { Sparkles } from 'lucide-react'
import type { BusinessModuleDetail, CallerPlanInfo } from '../../lib/api/types'
import { formatDate } from '../../lib/format'
import { StatusPill } from '../ui/badge'
import type { Tone } from '../ui/badge'
import { Button } from '../ui/button'
import { SectionCard } from '../ui/card'
import { ChipGroup } from '../ui/chip'
import { Skeleton } from '../ui/skeleton'

export type SubscriptionSummaryProps = {
  plan: CallerPlanInfo | null
  /** Every module in the catalog, split into what is and is not accessible. */
  modules: readonly BusinessModuleDetail[]
  loading?: boolean
  /** Navigates to the platform upgrade path (support). */
  onUpgrade: () => void
}

const STATUS_TONE: Record<string, Tone> = {
  active: 'success',
  trial: 'info',
  past_due: 'warning',
  expired: 'danger',
  canceled: 'danger',
  suspended: 'danger',
}

function statusTone(status: string): Tone {
  return STATUS_TONE[status] ?? 'neutral'
}

/**
 * "Plan" card: the business's real subscription plus the modules it includes.
 * Everything comes from `GET /v1/businesses/me/modules` — the plan name, its
 * status, the renewal date and the effective module set — so a plan change or
 * an admin override reaches this card without a frontend change.
 */
export function SubscriptionSummary({
  plan,
  modules,
  loading = false,
  onUpgrade,
}: SubscriptionSummaryProps) {
  const included = modules.filter((module) => module.hasAccess)
  const excluded = modules.filter((module) => !module.hasAccess)

  let planDetail: ReactNode = 'No plan is attached to this workspace yet.'
  if (plan) {
    planDetail = plan.endsAt ? `Renews ${formatDate(plan.endsAt)}` : 'No fixed renewal date'
  }

  return (
    <SectionCard title="Plan" description="What your business is subscribed to.">
      {loading ? (
        <div className="flex flex-col gap-2" aria-busy="true" aria-label="Loading plan">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
      ) : (
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-semibold break-words">{plan ? plan.name : 'No plan'}</p>
            <p className="mt-[0.1rem] text-meta text-muted">{planDetail}</p>
          </div>
          {plan ? (
            <StatusPill tone={statusTone(plan.status)}>
              {plan.status.replace('_', ' ')}
            </StatusPill>
          ) : (
            <StatusPill tone="neutral">None</StatusPill>
          )}
        </div>
      )}

      <div className="mt-[1rem]">
        <p className="text-caption text-muted">Included modules</p>
        {included.length > 0 ? (
          <ChipGroup className="mt-[0.5rem]" label="Included modules">
            {included.map((module) => (
              <span key={module.key} className="chip">
                {module.name}
              </span>
            ))}
          </ChipGroup>
        ) : (
          <p className="mt-[0.3rem] text-meta text-muted">
            No modules are active yet. Choose a plan to unlock the console.
          </p>
        )}
      </div>

      {excluded.length > 0 ? (
        <div className="mt-[1rem]">
          <p className="text-caption text-muted">Not included</p>
          <ChipGroup className="mt-[0.5rem]" label="Modules not included">
            {excluded.map((module) => (
              <span key={module.key} className="chip opacity-70">
                {module.name}
              </span>
            ))}
          </ChipGroup>
        </div>
      ) : null}

      <Button className="mt-[1.1rem] w-full" onClick={onUpgrade}>
        <Sparkles className="size-[0.95rem]" aria-hidden="true" />
        Talk to us about upgrading
      </Button>
    </SectionCard>
  )
}
