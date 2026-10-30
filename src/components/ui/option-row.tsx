import type { ReactNode } from 'react'
import { Check } from 'lucide-react'
import { cn } from '../../lib/cn'

export type OptionRowProps = {
  title: ReactNode
  description?: ReactNode
  /** Trailing text shown before the check, e.g. a price or status. */
  meta?: ReactNode
  selected?: boolean
  disabled?: boolean
  /** Changes the selection semantics. Use `radio` inside a radio group. */
  role?: 'checkbox' | 'radio'
  /** Omit to render a static, already-selected summary row. */
  onSelectedChange?: (selected: boolean) => void
  className?: string
}

/**
 * Large tappable option row used by booking services, filter drawers and
 * storefront settings. Built on the shared `.option` recipe.
 */
export function OptionRow({
  title,
  description,
  meta,
  selected = false,
  disabled = false,
  role = 'checkbox',
  onSelectedChange,
  className,
}: OptionRowProps) {
  const body = (
    <>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">{title}</span>
        {description ? (
          <span className="mt-[0.05rem] block text-meta text-muted">
            {description}
          </span>
        ) : null}
      </span>

      {meta ? (
        <span className="shrink-0 text-meta text-muted">{meta}</span>
      ) : null}

      <span className="check shrink-0" aria-hidden="true">
        <Check className="size-[0.8rem]" strokeWidth={2.6} />
      </span>
    </>
  )

  if (!onSelectedChange) {
    return (
      <div
        className={cn(
          'option',
          selected && 'border-accent bg-selected',
          className,
        )}
      >
        {body}
      </div>
    )
  }

  return (
    <button
      type="button"
      role={role}
      aria-checked={selected}
      disabled={disabled}
      onClick={() => onSelectedChange(!selected)}
      className={cn(
        'option focus-visible:shadow-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40',
        className,
      )}
    >
      {body}
    </button>
  )
}
