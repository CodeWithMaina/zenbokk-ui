import { Check, Minus } from 'lucide-react'
import { cn } from '../../lib/cn'

export type CheckboxProps = {
  checked: boolean
  /** Renders a dash; used for "some selected" table headers. */
  indeterminate?: boolean
  onCheckedChange?: (checked: boolean) => void
  /** Required: the visible control has no text of its own. */
  label: string
  disabled?: boolean
  className?: string
}

/**
 * Square selection checkbox from the Clients design. Visual only — state is
 * controlled, which keeps bulk selection logic with the page.
 */
export function Checkbox({
  checked,
  indeterminate = false,
  onCheckedChange,
  label,
  disabled = false,
  className,
}: CheckboxProps) {
  const active = checked || indeterminate

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? 'mixed' : checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onCheckedChange?.(!checked)}
      className={cn(
        'inline-flex size-[1.35rem] shrink-0 items-center justify-center rounded-xs border-[1.5px] border-muted bg-surface p-0 text-on-accent transition-[background-color,border-color,color] duration-150',
        'hover:border-fg focus-visible:shadow-ring focus-visible:outline-none',
        'disabled:cursor-not-allowed disabled:opacity-35',
        active && 'border-accent bg-accent',
        className,
      )}
    >
      {indeterminate ? (
        <Minus className="size-[0.8rem]" strokeWidth={2.6} aria-hidden="true" />
      ) : checked ? (
        <Check className="size-[0.8rem]" strokeWidth={2.6} aria-hidden="true" />
      ) : null}
    </button>
  )
}
