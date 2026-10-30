import { cn } from '../../lib/cn'

export type SwitchProps = {
  checked: boolean
  onCheckedChange?: (checked: boolean) => void
  /** Required accessible name. */
  label: string
  disabled?: boolean
  className?: string
}

/** Compact settings switch. */
export function Switch({
  checked,
  onCheckedChange,
  label,
  disabled = false,
  className,
}: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onCheckedChange?.(!checked)}
      className={cn(
        'relative h-[1.6rem] w-[2.8rem] shrink-0 rounded-pill border border-line bg-neutral-soft p-0 transition-[background-color,border-color] duration-[250ms]',
        'focus-visible:shadow-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-35',
        checked && 'border-accent bg-accent',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'absolute left-[0.17rem] top-[0.17rem] size-[1.2rem] rounded-round bg-muted transition-[transform,background-color] duration-[250ms]',
          checked && 'translate-x-[1.2rem] bg-[#fff]',
        )}
      />
    </button>
  )
}
