import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export type HeroStat = {
  value: ReactNode
  label: ReactNode
}

export type DashboardHeroProps = {
  /** What the big figure is, e.g. "Collected today". */
  kicker: ReactNode
  /** Currency prefix printed small before the figure (`KES`). Omit for a count. */
  currency?: string
  amount: ReactNode
  /** Change against the comparison window, already computed from ledger totals. */
  delta?: { percent: number; caption: ReactNode } | null
  /** The verification meter under the figure. */
  progress?: { label: ReactNode; percent: number; detail?: ReactNode } | null
  /** Optional corner slot — the storefront link with its live dot. */
  live?: ReactNode
  /** The supporting figures, as a single divided row rather than separate tiles. */
  stats: readonly HeroStat[]
  className?: string
}

/**
 * The dashboard's opening statement.
 *
 * It is the one **deep-accent** surface on the page: the pressed accent in light,
 * the deep accent surface in dark, with the matching `--on-accent` / `--accent-ink`
 * ink. That keeps it a statement in both themes — a rich forest panel rather than a
 * plain white card — while every colour stays a theme token, so no bespoke palette
 * is introduced.
 *
 * The figure, its comparison and the verification meter form the statement; the
 * four supporting figures sit in one divided row beneath it, clearly subordinate
 * rather than four tiles competing inside a card.
 *
 * Nothing here is computed: every figure arrives from the caller, which reads it
 * from the ledger or the appointment list.
 */
export function DashboardHero({
  kicker,
  currency,
  amount,
  delta,
  progress,
  live,
  stats,
  className,
}: DashboardHeroProps) {
  const percent = progress ? Math.max(0, Math.min(100, progress.percent)) : 0
  const down = (delta?.percent ?? 0) < 0

  return (
    <section className={cn('dash-hero', className)}>
      <div className="dash-hero-main">
        <div className="flex items-start justify-between gap-[0.8rem]">
          <p className="dash-hero-kicker">{kicker}</p>
          {live}
        </div>

        <div className="mt-[0.5rem] flex flex-wrap items-center gap-x-[0.75rem] gap-y-[0.45rem]">
          <p className="dash-hero-amount">
            {currency ? <small>{currency}</small> : null}
            {amount}
          </p>
          {delta ? (
            <span className="dash-hero-delta">
              <b>
                {down ? '▼' : '▲'} {Math.abs(delta.percent).toFixed(1)}%
              </b>
              <span>{delta.caption}</span>
            </span>
          ) : null}
        </div>

        {progress ? (
          <div className="mt-[1.15rem]">
            <div className="flex items-baseline justify-between gap-[0.8rem]">
              <span className="dash-hero-meter-label">{progress.label}</span>
              <b className="dash-hero-meter-value">{Math.round(percent)}%</b>
            </div>
            <div
              className="dash-hero-meter"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(percent)}
              aria-label={typeof progress.label === 'string' ? progress.label : undefined}
            >
              <i style={{ width: `${percent}%` }} />
            </div>
            {progress.detail ? <p className="dash-hero-meter-foot">{progress.detail}</p> : null}
          </div>
        ) : null}
      </div>

      <dl className="dash-hero-stats">
        {stats.map((stat, index) => (
          <div key={index}>
            <dt>{stat.label}</dt>
            <dd>{stat.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
