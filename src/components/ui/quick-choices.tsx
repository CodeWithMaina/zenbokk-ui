import { cn } from '../../lib/cn'

export type QuickChoiceOption<T extends string | number> = {
  value: T
  label: string
}

export type QuickChoicesProps<T extends string | number> = {
  options: readonly QuickChoiceOption<T>[]
  value: T | null
  onChange: (value: T) => void
  label?: string
  className?: string
}

/** Small preset buttons used under price inputs and other form fields. */
export function QuickChoices<T extends string | number>({
  options,
  value,
  onChange,
  label,
  className,
}: QuickChoicesProps<T>) {
  return (
    <div
      className={cn('mt-[0.5rem] flex flex-wrap gap-[0.4rem]', className)}
      role="group"
      aria-label={label}
    >
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'inline-flex min-h-[2rem] items-center rounded-pill border border-line bg-surface px-[0.7rem] text-[0.8rem] font-medium text-muted transition-colors hover:border-muted hover:text-fg focus-visible:shadow-ring focus-visible:outline-none',
              active && 'border-inverse bg-inverse text-on-inverse',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
