import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral'

const toneClass: Record<Tone, string> = {
  success: 'bg-success-soft text-success-ink',
  warning: 'bg-warning-soft text-warning-ink',
  danger: 'bg-danger-soft text-danger-ink',
  info: 'bg-info-soft text-info-ink',
  neutral: 'bg-neutral-soft text-neutral-ink',
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
      className={cn('status-pill', tone && toneClass[tone], className)}
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
        toneClass[tone],
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
}

/** Small inverse count used in tab labels and selection controls. */
export function CountBadge({ children, className }: CountBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex h-[1.3rem] min-w-[1.3rem] items-center justify-center rounded-pill bg-inverse px-[0.35rem] text-caption font-semibold text-on-inverse',
        className,
      )}
    >
      {children}
    </span>
  )
}
