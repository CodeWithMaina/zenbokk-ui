import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export type SegmentedOption<T extends string> = {
  value: T
  label: ReactNode
  icon?: ReactNode
  disabled?: boolean
}

export type SegmentedControlProps<T extends string> = {
  options: readonly SegmentedOption<T>[]
  value: T
  onValueChange: (value: T) => void
  /** Accessible name for the group. */
  label?: string
  className?: string
}

/** Compact two/three-way switch built on the `.segmented` recipe. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onValueChange,
  label,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div className={cn('segmented', className)} role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={option.value === value}
          disabled={option.disabled}
          onClick={() => onValueChange(option.value)}
          className="inline-flex items-center justify-center gap-[0.35rem] whitespace-nowrap"
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  )
}
