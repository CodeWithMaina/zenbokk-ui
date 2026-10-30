import type { ReactNode } from 'react'
import { clamp } from '../../lib/format'
import { cn } from '../../lib/cn'

export type ProgressTone = 'accent' | 'success' | 'warning' | 'danger'

const barTone: Record<ProgressTone, string> = {
  accent: 'bg-accent',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
}

export type ProgressProps = {
  value: number
  max?: number
  label?: ReactNode
  showValue?: boolean
  tone?: ProgressTone
  /** Accessible name when `label` is not a plain string. */
  ariaLabel?: string
  className?: string
  barClassName?: string
}

/** Thin progress bar for goals, profile completion and usage limits. */
export function Progress({
  value,
  max = 100,
  label,
  showValue = false,
  tone = 'accent',
  ariaLabel,
  className,
  barClassName,
}: ProgressProps) {
  const safeMax = max > 0 ? max : 100
  const safeValue = clamp(value, 0, safeMax)
  const percent = (safeValue / safeMax) * 100

  return (
    <div className={className}>
      {(label || showValue) && (
        <div className="mb-[0.35rem] flex items-center justify-between gap-2 text-meta text-muted">
          {label ? <span className="min-w-0">{label}</span> : <span />}
          {showValue ? (
            <span className="shrink-0 tabular">{Math.round(percent)}%</span>
          ) : null}
        </div>
      )}
      <div
        className="h-[0.4rem] w-full overflow-hidden rounded-pill bg-sunken"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-valuenow={safeValue}
        aria-label={
          ariaLabel ?? (typeof label === 'string' ? label : undefined)
        }
      >
        <div
          className={cn(
            'h-full rounded-pill transition-[width] duration-300 ease-out',
            barTone[tone],
            barClassName,
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}
