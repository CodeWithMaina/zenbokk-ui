import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral'

/**
 * Soft background + matching ink for a semantic tone.
 *
 * Shared by the pills below and by any other quiet surface that needs to carry a
 * tone (an icon badge in a section heading, a tinted tile), so the five pairs are
 * defined once rather than re-derived per component.
 */
export const toneSoftClass: Record<Tone, string> = {
  success: 'bg-success-soft text-success-ink',
  warning: 'bg-warning-soft text-warning-ink',
  danger: 'bg-danger-soft text-danger-ink',
  info: 'bg-info-soft text-info-ink',
  neutral: 'bg-neutral-soft text-neutral-ink',
}

/** Ink only — for an icon that carries a tone without a filled background. */
export const toneInkClass: Record<Tone, string> = {
  success: 'text-success-ink',
  warning: 'text-warning-ink',
  danger: 'text-danger-ink',
  info: 'text-info-ink',
  neutral: 'text-muted',
}

export type StatusPillProps = {
  /** A status name understood by `[data-status]` in `index.css`. */
  status?: string
  /** Force a semantic tone instead of using the status mapping. */
  tone?: Tone
  children?: ReactNode
  className?: string
}

/**
 * Dot + label pill. Statuses such as `active`, `paused`, `archived`,
 * `confirmed` and `cancelled` are coloured automatically by the token system.
 */
export function StatusPill({
  status = 'neutral',
  tone,
  children,
  className,
}: StatusPillProps) {
  return (
    <span
      className={cn('status-pill', tone && toneSoftClass[tone], className)}
      data-status={tone ? undefined : status}
    >
      {children ?? status}
    </span>
  )
}

export type BadgeProps = {
  tone?: Tone
  children: ReactNode
  className?: string
}

/** Quiet semantic label without the status dot. */
export function Badge({ tone = 'neutral', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-pill px-[0.6rem] py-[0.2rem] text-pill font-medium whitespace-nowrap',
        toneSoftClass[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

export type CountBadgeProps = {
  children: ReactNode
  className?: string
  /**
   * Accessible description for contexts where the number alone is ambiguous,
   * such as a navigation item (`"3 awaiting verification"`).
   */
  label?: string
}

/** Small inverse count used in tab labels and selection controls. */
export function CountBadge({ children, className, label }: CountBadgeProps) {
  return (
    <span
      aria-label={label}
      className={cn(
        'inline-flex h-[1.3rem] min-w-[1.3rem] items-center justify-center rounded-pill bg-inverse px-[0.35rem] text-caption font-semibold text-on-inverse',
        className,
      )}
    >
      {children}
    </span>
  )
}
