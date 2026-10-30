import type { ComponentProps, ReactNode } from 'react'
import { Search } from 'lucide-react'
import { cn } from '../../lib/cn'

export type SearchFieldProps = Omit<ComponentProps<'input'>, 'type'> & {
  /** Accessible name for the field. */
  label?: string
  icon?: ReactNode
  inputClassName?: string
}

/** Search input built on the shared `.search` recipe. */
export function SearchField({
  label = 'Search',
  icon,
  className,
  inputClassName,
  ...props
}: SearchFieldProps) {
  return (
    <label className={cn('search', className)}>
      {icon ?? <Search className="size-4" aria-hidden="true" />}
      <input
        type="search"
        aria-label={label}
        className={cn(inputClassName)}
        {...props}
      />
    </label>
  )
}
