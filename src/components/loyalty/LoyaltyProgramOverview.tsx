import { RefreshCw } from 'lucide-react'
import { errorMessage } from '../../lib/api/client'
import { formatDate, money } from '../../lib/format'
import { programTypeLabel, rewardValidityLabel } from '../../lib/loyalty/mappers'
import type { ProgramDetail } from '../../lib/loyalty/types'
import { Alert } from '../ui/alert'
import { Button } from '../ui/button'
import { SectionCard } from '../ui/card'
import { DescriptionList, DescriptionRow } from '../ui/description-list'
import { Skeleton } from '../ui/skeleton'
import { LoyaltyProgramStatistics } from './LoyaltyProgramStatistics'

export type LoyaltyProgramOverviewProps = {
  detail: ProgramDetail | undefined
  loading: boolean
  error: unknown
  onRetry: () => void
}

/** `2026-09-12T…` → `12 Sep 2026 – 30 Dec 2026`, or `Always on`. */
function scheduleLabel(detail: ProgramDetail): string {
  const { startsAt, endsAt } = detail.program
  if (!startsAt && !endsAt) return 'Always on'
  const start = startsAt ? formatDate(startsAt) : 'Now'
  const end = endsAt ? formatDate(endsAt) : 'open-ended'
  return `${start} – ${end}`
}

/**
 * The Overview tab: live performance, how the program works, and the full
 * configuration. Every value comes from `…/details`; nothing is inferred.
 */
export function LoyaltyProgramOverview({
  detail,
  loading,
  error,
  onRetry,
}: LoyaltyProgramOverviewProps) {
  if (loading) {
    return (
      <div className="space-y-[1rem]" aria-busy="true" aria-label="Loading program overview">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(8rem,1fr))] gap-[0.7rem]">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-[4.6rem] rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-[7rem] rounded-card" />
        <Skeleton className="h-[12rem] rounded-card" />
      </div>
    )
  }

  if (error || !detail) {
    return (
      <Alert tone="danger" title="Program details could not be loaded">
        <p>{error ? errorMessage(error) : 'No details were returned.'}</p>
        <Button size="sm" className="mt-[0.6rem]" onClick={onRetry}>
          <RefreshCw className="size-3.5" aria-hidden="true" />
          Try again
        </Button>
      </Alert>
    )
  }

  const program = detail.program

  return (
    <div className="space-y-[1rem]">
      <section>
        <h3 className="mb-[0.9rem] text-heading font-bold">Performance</h3>
        <LoyaltyProgramStatistics detail={detail} />
      </section>

      <SectionCard title="How it works">
        <p className="m-0 mb-[0.8rem] max-w-[52ch] text-label leading-[1.6] text-muted">
          {detail.summary || 'Customers earn a stamp for every qualifying action.'}
        </p>
        <ul className="m-0 list-none p-0">
          <li className="flex justify-between gap-4 border-t border-line py-[0.7rem] text-label">
            <span className="text-muted">After {program.stampsRequired} stamps</span>
            <b className="text-right font-semibold">
              {program.rewardDescription || money(program.rewardValue)}
            </b>
          </li>
        </ul>
      </SectionCard>

      <SectionCard title="Details">
        <DescriptionList>
          <DescriptionRow
            label="Reward"
            value={
              <>
                {program.rewardDescription || '—'} · {money(program.rewardValue)}
              </>
            }
          />
          <DescriptionRow label="Stamps required" value={program.stampsRequired} />
          <DescriptionRow
            label="Reward valid for"
            value={rewardValidityLabel(program.rewardExpirationHours)}
          />
          <DescriptionRow label="Stamps on enrolment" value={program.defaultEnrollmentStamps} />
          <DescriptionRow label="Schedule" value={scheduleLabel(detail)} />
          <DescriptionRow label="Created" value={formatDate(program.createdAt)} />
          <DescriptionRow
            label="Card design"
            value={
              <>
                {program.cardDesignName ?? 'Default card'}
                {program.cardDesignIsDefault ? ' (default)' : ''}
              </>
            }
          />
          <DescriptionRow label="Type" value={programTypeLabel(program.programType)} />
        </DescriptionList>
      </SectionCard>
    </div>
  )
}
