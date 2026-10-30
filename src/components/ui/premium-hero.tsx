import type { ReactNode } from 'react'
import { Crown } from 'lucide-react'
import { cn } from '../../lib/cn'

export type PremiumHeroProps = {
  eyebrow?: ReactNode
  title: ReactNode
  description?: ReactNode
  icon?: ReactNode
  action?: ReactNode
  footnote?: ReactNode
  className?: string
}

/**
 * Dark loyalty upsell panel. Uses the fixed premium palette in every theme,
 * so it should contain no theme-dependent surfaces.
 */
export function PremiumHero({
  eyebrow = 'Loyalty programme',
  title,
  description,
  icon,
  action,
  footnote,
  className,
}: PremiumHeroProps) {
  return (
    <section
      className={cn(
        'premium relative overflow-hidden',
        'border border-premium-gold/20 shadow-card',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-12 -right-10 size-40 rounded-round bg-premium-gold/10 blur-2xl"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-16 -left-10 size-40 rounded-round bg-premium-gold/5 blur-2xl"
      />

      <div className="relative flex flex-wrap items-start gap-[0.9rem]">
        <span
          aria-hidden="true"
          className="grid size-[2.7rem] shrink-0 place-items-center rounded-round border border-premium-gold/30 bg-premium-gold/10 text-premium-gold"
        >
          {icon ?? <Crown className="size-[1.15rem]" strokeWidth={1.8} />}
        </span>

        <div className="min-w-0 flex-1">
          {eyebrow ? (
            <p className="text-caption font-semibold tracking-caps text-premium-gold uppercase">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="mt-[0.15rem] text-title leading-tight font-bold tracking-snug text-premium-ink">
            {title}
          </h2>
          {description ? (
            <p className="mt-[0.35rem] max-w-[34rem] text-meta leading-relaxed text-premium-muted">
              {description}
            </p>
          ) : null}

          {action ? (
            <div className="mt-[0.85rem] flex flex-wrap items-center gap-[0.5rem]">
              {action}
            </div>
          ) : null}
        </div>
      </div>

      {footnote ? (
        <p className="relative mt-[0.9rem] border-t border-premium-gold/20 pt-[0.6rem] text-caption text-premium-muted">
          {footnote}
        </p>
      ) : null}
    </section>
  )
}

export type PremiumActionProps = {
  children: ReactNode
  onClick?: () => void
  href?: string
  className?: string
}

/** Gold call-to-action sized for `PremiumHero`. */
export function PremiumAction({
  children,
  onClick,
  href,
  className,
}: PremiumActionProps) {
  const classes = cn(
    'inline-flex min-h-[2.3rem] items-center justify-center gap-[0.35rem] rounded-pill bg-premium-gold px-[0.9rem] text-meta font-semibold text-premium-ink transition-opacity hover:opacity-90 focus-visible:shadow-ring focus-visible:outline-none',
    className,
  )

  if (href) {
    return (
      <a href={href} className={classes}>
        {children}
      </a>
    )
  }

  return (
    <button type="button" onClick={onClick} className={classes}>
      {children}
    </button>
  )
}
