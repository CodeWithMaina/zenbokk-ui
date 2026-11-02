import { formatNumber } from '../../lib/format'
import type { ProgramDetail } from '../../lib/loyalty/types'
import { MetricGrid } from '../ui/metric-tile'

export type LoyaltyProgramStatisticsProps = {
  detail: ProgramDetail
  className?: string
}

/** `62.5` → `62.5%`, `0` → `0%`. The API returns rates already as percentages. */
function rate(value: number): string {
  const rounded = Math.round(value * 10) / 10
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)}%`
}

/**
 * The program's live performance, straight from `…/details` — every figure is
 * the server's own count, so the statistics can never disagree with the data
 * they summarise.
 */
export function LoyaltyProgramStatistics({ detail, className }: LoyaltyProgramStatisticsProps) {
  return (
    <MetricGrid
      className={className}
      items={[
        { value: formatNumber(detail.activeCustomers), label: 'Active customers' },
        { value: formatNumber(detail.stampsIssued), label: 'Stamps issued' },
        { value: formatNumber(detail.rewardsEarned), label: 'Rewards earned' },
        { value: formatNumber(detail.rewardsRedeemed), label: 'Rewards redeemed' },
        { value: rate(detail.completionRate), label: 'Completion rate' },
        { value: rate(detail.redemptionRate), label: 'Redemption rate' },
      ]}
    />
  )
}
