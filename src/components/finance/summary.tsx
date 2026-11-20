import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { Card } from '../ui/card'

/**
 * The finance overview pieces, shared by Cashbook, Payments and Expenses.
 *
 * They are one file because they are one composition: the dark statement panel and the four quiet
 * tiles beside it are the same summary read two ways, and the bars below answer "where did it come
 * from?". Keeping them together is what stops the three sections growing three different summaries.
 */

export type SummarySegment = {
  key: string
  label: string
  value: number
  /** `gold` is the reference's warm metallic; `accent` its sage. One of each per panel. */
  tone?: 'gold' | 'accent'
}

export type FinanceSummaryPanelProps = {
  /** What the headline figure is, e.g. "Net cash movement". */
  label: ReactNode
  amount: number | string
  currency?: string
  /** Gold pill at the top right — a count, a period, "N entries". */
  badge?: ReactNode
  /** Two (or more) parts whose widths show their share of the total. */
  segments?: readonly SummarySegment[]
  /** The same parts, written out: dot, label, amount. */
  legend?: readonly { key: string; label: ReactNode; value: ReactNode; tone?: 'gold' | 'accent' }[]
  className?: string
  children?: ReactNode
}

const tonedBar = {
  gold: 'bg-premium-gold',
  accent: 'bg-accent',
} as const

const tonedDot = {
  gold: 'bg-premium-gold',
  accent: 'bg-accent',
} as const

/**
 * The statement panel: a dark, warm charcoal card with a serif figure, a gold pill, a split bar and
 * a legend. It is deliberately theme-independent (the `.premium` palette never flips), exactly like
 * the reference — a summary that changed colour with the theme would stop reading as a statement.
 */
export function FinanceSummaryPanel({
  label,
  amount,
  currency = 'KES',
  badge,
  segments,
  legend,
  className,
  children,
}: FinanceSummaryPanelProps) {
  const formatted = typeof amount === 'number' ? amount.toLocaleString('en-KE') : amount
  const total = (segments ?? []).reduce((sum, segment) => sum + Math.max(0, segment.value), 0)

  return (
    <section className={cn('premium flex flex-col gap-[1rem]', className)}>
      <div className="flex items-start justify-between gap-[0.8rem]">
        <div className="min-w-0">
          <p className="text-meta text-premium-muted">{label}</p>
          <p className="mt-[0.35rem] font-display text-display leading-none font-medium tracking-tight text-premium-ink [overflow-wrap:anywhere]">
            <small className="mr-[0.35rem] text-[0.45em] tracking-normal text-premium-gold">{currency}</small>
            {formatted}
          </p>
        </div>
        {badge ? (
          <span className="rounded-pill border border-premium-gold/40 px-[0.7rem] py-[0.25rem] text-caption font-semibold whitespace-nowrap text-premium-gold">
            {badge}
          </span>
        ) : null}
      </div>

      {segments && segments.length > 0 ? (
        <div
          className="flex h-[0.6rem] gap-[2px] overflow-hidden rounded-pill bg-premium-ink/10"
          role="img"
          aria-label={segments
            .map((segment) => `${segment.label} ${total > 0 ? Math.round((segment.value / total) * 100) : 0}%`)
            .join(', ')}
        >
          {segments.map((segment) => (
            <span
              key={segment.key}
              className={cn('block h-full', tonedBar[segment.tone ?? 'gold'])}
              style={{ width: `${total > 0 ? Math.max(0, (segment.value / total) * 100) : 0}%` }}
            />
          ))}
        </div>
      ) : null}

      {legend && legend.length > 0 ? (
        <div className="flex flex-wrap gap-x-[1.4rem] gap-y-[0.4rem] text-meta">
          {legend.map((item) => (
            <span key={item.key} className="inline-flex items-center gap-[0.5rem] text-premium-muted">
              <i aria-hidden="true" className={cn('size-[0.55rem] shrink-0 rounded-round', tonedDot[item.tone ?? 'gold'])} />
              {item.label} <b className="font-semibold text-premium-ink tabular">{item.value}</b>
            </span>
          ))}
        </div>
      ) : null}

      {children}
    </section>
  )
}


export type FinanceMetric = {
  key: string
  label: ReactNode
  value: ReactNode
  hint?: ReactNode
  /** Draws the reference's amber "needs attention" tile. */
  hot?: boolean
  onClick?: () => void
  /** Small call to action at the foot of the tile ("Review claims"). */
  actionLabel?: ReactNode
}

/** Two-by-two grid of quiet tiles that sits beside `FinanceSummaryPanel`. */
export function FinanceMetricGrid({
  metrics,
  className,
}: {
  metrics: readonly FinanceMetric[]
  className?: string
}) {
  return (
    <div className={cn('grid grid-cols-2 gap-[0.8rem] max-[30rem]:grid-cols-1', className)}>
      {metrics.map((metric) => {
        const body = (
          <>
            <span className="text-meta text-muted">{metric.label}</span>
            <b className="text-metric leading-tight font-semibold tracking-tight tabular">{metric.value}</b>
            {metric.hint ? <small className="text-caption text-subtle">{metric.hint}</small> : null}
            {metric.actionLabel ? (
              <span className="mt-[0.3rem] text-meta font-semibold text-accent">{metric.actionLabel}</span>
            ) : null}
          </>
        )

        const classes = cn(
          'flex min-w-0 flex-col gap-[0.15rem] rounded-xl border border-line bg-surface p-[0.9rem] text-left',
          metric.hot && 'border-warning-ink/45 bg-warning-soft',
          metric.onClick &&
            'cursor-pointer transition-colors hover:border-accent focus-visible:shadow-ring focus-visible:outline-none',
        )

        return metric.onClick ? (
          <button key={metric.key} type="button" onClick={metric.onClick} className={classes}>
            {body}
          </button>
        ) : (
          <div key={metric.key} className={classes}>
            {body}
          </div>
        )
      })}
    </div>
  )
}

/** The panel and its tiles, in the reference's 1.25 : 1 arrangement (one column on phones). */
export function FinanceStats({
  panel,
  metrics,
  className,
}: {
  panel: ReactNode
  metrics: readonly FinanceMetric[]
  className?: string
}) {
  return (
    <div
      className={cn(
        'mb-[1.2rem] grid gap-[0.8rem] min-[56rem]:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]',
        className,
      )}
    >
      {panel}
      <FinanceMetricGrid metrics={metrics} />
    </div>
  )
}


export type FinanceBarItem = {
  key: string
  label: ReactNode
  amount: number
}

/**
 * Horizontal bars from the reference's "Income by method" card. The bar width is the item's share
 * of the largest item (not of the total), so a long tail stays visible instead of collapsing.
 */
export function FinanceBreakdownBars({
  title,
  items,
  emptyLabel = 'Nothing recorded in this period yet.',
  formatAmount,
  className,
}: {
  title: ReactNode
  items: readonly FinanceBarItem[]
  emptyLabel?: ReactNode
  formatAmount: (amount: number) => string
  className?: string
}) {
  const largest = items.reduce((max, item) => Math.max(max, item.amount), 0)

  return (
    <Card className={cn('mb-[1.2rem] p-[1.1rem]', className)}>
      <h2 className="text-heading font-bold tracking-snug">{title}</h2>
      {items.length === 0 ? (
        <p className="mt-[0.6rem] text-meta text-muted">{emptyLabel}</p>
      ) : (
        <div className="mt-[0.7rem] grid gap-[0.7rem]">
          {items.map((item) => (
            <div
              key={item.key}
              className="grid grid-cols-[5.5rem_minmax(0,1fr)_auto] items-center gap-[0.7rem] text-label max-[30rem]:grid-cols-[4.5rem_minmax(0,1fr)_auto]"
            >
              <span className="truncate text-muted">{item.label}</span>
              <i className="block h-[0.5rem] overflow-hidden rounded-pill bg-sunken">
                <b
                  className="block h-full rounded-pill bg-accent"
                  style={{ width: `${largest > 0 ? Math.max(2, (item.amount / largest) * 100) : 0}%` }}
                />
              </i>
              <b className="font-semibold whitespace-nowrap tabular">{formatAmount(item.amount)}</b>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
