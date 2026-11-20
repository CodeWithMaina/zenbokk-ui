import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { toneInkClass } from '../ui/badge'
import type { Tone } from '../ui/badge'
import { Card } from '../ui/card'
import { Skeleton } from '../ui/skeleton'

export type StatMetric = {
  key: string
  label: ReactNode
  value: ReactNode
  note?: ReactNode
  /** Semantic ink for the value — used only where the number carries meaning. */
  tone?: Tone
  /** Where the figure leads. A figure without one is inert. */
  onSelect?: () => void
}

export type StatGroup = {
  key: string
  label: ReactNode
  metrics: readonly StatMetric[]
}

export type StatisticsPanelProps = {
  title?: ReactNode
  description?: ReactNode
  action?: ReactNode
  /** The three figures that lead the section. */
  primary: readonly StatMetric[]
  /** Compact, grouped supporting metrics beneath the divider. */
  groups: readonly StatGroup[]
  loading?: boolean
  className?: string
}

function MetricValue({ metric, className }: { metric: StatMetric; className?: string }) {
  return (
    <span className={cn('tabular', metric.tone && toneInkClass[metric.tone], className)}>
      {metric.value}
    </span>
  )
}

function OptionalButton({
  metric,
  className,
  children,
}: {
  metric: StatMetric
  className: string
  children: ReactNode
}) {
  if (!metric.onSelect) return <div className={className}>{children}</div>
  return (
    <button type="button" onClick={metric.onSelect} className={cn(className, 'text-left')}>
      {children}
    </button>
  )
}

/**
 * "Business performance": the section that has to be read in one glance.
 *
 * Deliberately not a wall of identical tiles. Three lead figures (today's work)
 * carry the weight; everything else is grouped by what it belongs to — money,
 * customers, loyalty, team — and set as compact label/value pairs under a single
 * hairline. One card, one hierarchy, no card-inside-a-card.
 *
 * The panel renders only what the caller passes, so a plan without the finance or
 * loyalty modules simply has fewer groups rather than empty ones.
 */
export function StatisticsPanel({
  title = 'Business performance',
  description,
  action,
  primary,
  groups,
  loading = false,
  className,
}: StatisticsPanelProps) {
  const visibleGroups = groups.filter((group) => group.metrics.length > 0)

  return (
    <Card className={cn('dash-stats', className)}>
      <div className="flex flex-wrap items-start justify-between gap-[0.6rem]">
        <div className="min-w-0">
          <h2 className="text-heading font-display font-normal tracking-snug">{title}</h2>
          {description ? (
            <p className="mt-[0.15rem] text-meta text-muted">{description}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>

      {loading ? (
        <div className="mt-[0.9rem] grid gap-[0.9rem]" aria-busy="true" aria-label="Loading statistics">
          <div className="grid grid-cols-3 gap-[0.9rem]">
            <Skeleton className="h-[3.4rem] rounded-md" />
            <Skeleton className="h-[3.4rem] rounded-md" />
            <Skeleton className="h-[3.4rem] rounded-md" />
          </div>
          <Skeleton className="h-[3rem] rounded-md" />
        </div>
      ) : (
        <>
          <div className="dash-stats-primary">
            {primary.map((metric) => (
              <OptionalButton key={metric.key} metric={metric} className="dash-stats-primary-cell">
                <span className="dash-stats-label">{metric.label}</span>
                <b className="dash-stats-value">
                  <MetricValue metric={metric} />
                </b>
                {metric.note ? <span className="dash-stats-note">{metric.note}</span> : null}
              </OptionalButton>
            ))}
          </div>

          {visibleGroups.length > 0 ? (
            <div className="dash-stats-groups">
              {visibleGroups.map((group) => (
                <div key={group.key} className="dash-stats-group">
                  <p className="eyebrow">{group.label}</p>
                  <dl className="mt-[0.4rem] grid gap-[0.35rem]">
                    {group.metrics.map((metric) => (
                      <div
                        key={metric.key}
                        className="flex min-w-0 items-baseline justify-between gap-[0.6rem]"
                      >
                        <dt className="min-w-0 truncate text-caption text-muted">{metric.label}</dt>
                        <dd className="text-label font-semibold">
                          {metric.onSelect ? (
                            <button
                              type="button"
                              onClick={metric.onSelect}
                              className="tabular hover:underline focus-visible:underline focus-visible:outline-none"
                            >
                              <MetricValue metric={metric} />
                            </button>
                          ) : (
                            <MetricValue metric={metric} />
                          )}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
            </div>
          ) : null}
        </>
      )}
    </Card>
  )
}
