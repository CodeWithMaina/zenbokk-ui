import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export type ChipProps = {
  children: ReactNode
  icon?: ReactNode
  /** When provided the chip becomes a toggle button. */
  pressed?: boolean
  onPressedChange?: (pressed: boolean) => void
  /** Optional count shown before the label, as in "All 24". */
  count?: ReactNode
  onRemove?: () => void
  removeLabel?: string
  disabled?: boolean
  className?: string
}

/**
 * Pill filter/tag. Uses `aria-pressed` so the shared `.chip` recipe handles
 * the inverted active state without a conditional class.
 */
export function Chip({
  children,
  icon,
  pressed,
  onPressedChange,
  count,
  onRemove,
  removeLabel = 'Remove filter',
  disabled,
  className,
}: ChipProps) {
  const content = (
    <>
      {icon}
      <span>{children}</span>
      {count !== undefined ? (
        <span className="ml-[0.3rem] opacity-60">{count}</span>
      ) : null}
    </>
  )

  if (onPressedChange) {
    return (
      <button
        type="button"
        className={cn('chip', className)}
        aria-pressed={pressed}
        disabled={disabled}
        onClick={() => onPressedChange(!pressed)}
      >
        {content}
      </button>
    )
  }

  return (
    <span className={cn('chip', className)}>
      {content}
      {onRemove ? (
        <button
          type="button"
          aria-label={removeLabel}
          onClick={onRemove}
          className="-mr-[0.3rem] grid size-[1.1rem] place-items-center rounded-round opacity-60 transition-opacity hover:opacity-100"
        >
          <X className="size-3" aria-hidden="true" />
        </button>
      ) : null}
    </span>
  )
}

export type ChipGroupProps = {
  children: ReactNode
  label?: string
  className?: string
}

/** Wrapping chip row. Use `overflow-x-auto flex-nowrap` for a scrolling row. */
export function ChipGroup({ children, label, className }: ChipGroupProps) {
  return (
    <div
      className={cn('flex flex-wrap gap-[0.5rem]', className)}
      role="group"
      aria-label={label}
    >
      {children}
    </div>
  )
}
