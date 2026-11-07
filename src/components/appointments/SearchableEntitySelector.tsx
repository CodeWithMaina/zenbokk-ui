import { Check, X } from 'lucide-react'
import { useRef } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { Avatar } from '../ui/avatar'
import { SearchField } from '../ui/search-field'
import { Skeleton } from '../ui/skeleton'

/**
 * One row of a searchable selector. Kept presentational so every caller renders the
 * same menu while supplying its own identifying fields.
 */
export type SearchableSelectorOption = {
  id: string
  label: string
  /** Supporting line, e.g. phone · email. */
  description?: string | null
  avatarUrl?: string | null
}

export type SearchableEntitySelectorProps = {
  /** Accessible name of the search box; also used as the field label. */
  label: string
  placeholder?: string
  value: string | null
  onValueChange: (id: string | null) => void
  options: readonly SearchableSelectorOption[]
  term: string
  onTermChange: (term: string) => void
  isLoading?: boolean
  isError?: boolean
  errorMessage?: string
  /** Shown when the search returned nothing. */
  emptyMessage?: string
  /** True once the query has settled at least once (so we don't flash "no results"). */
  isFetched?: boolean
  /** Extra control under the list, e.g. a "Create new customer" action. */
  menuFooter?: ReactNode
  disabled?: boolean
  /** Rendered beside the field when a value is chosen (usually the entity's name). */
  selectedLabel?: string | null
}

/**
 * The shared searchable-listbox behind every appointment selector.
 *
 * <para>It renders three states explicitly — loading skeletons, an empty message and an
 * error — because a selector that silently shows nothing is indistinguishable from one
 * that found nothing. Keyboard users get Arrow/Home/End movement and Enter/Space to
 * choose; the chosen row is announced with <c>aria-selected</c>.</para>
 *
 * <para>The search term and its data live in the caller (so the customer and staff
 * variants can layer their own hooks on top) — this component is purely the listbox,
 * focus and selection affordances.</para>
 */
export function SearchableEntitySelector({
  label,
  placeholder = 'Search…',
  value,
  onValueChange,
  options,
  term,
  onTermChange,
  isLoading = false,
  isError = false,
  errorMessage = 'The list could not be loaded. Try again.',
  emptyMessage = 'No matches.',
  isFetched = true,
  menuFooter,
  disabled = false,
  selectedLabel,
}: SearchableEntitySelectorProps) {
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([])

  function moveFocus(index: number, delta: number) {
    if (options.length === 0) return
    const next = Math.min(options.length - 1, Math.max(0, index + delta))
    optionRefs.current[next]?.focus()
  }

  function onOptionKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        moveFocus(index, 1)
        break
      case 'ArrowUp':
        event.preventDefault()
        moveFocus(index, -1)
        break
      case 'Home':
        event.preventDefault()
        moveFocus(0, 0)
        break
      case 'End':
        event.preventDefault()
        moveFocus(options.length - 1, 0)
        break
      default:
        break
    }
  }

  const hasValue = Boolean(value)

  return (
    <div className="min-w-0">
      <div className="flex items-center justify-between gap-[0.6rem]">
        <span className="label">{label}</span>
        {hasValue ? (
          <button
            type="button"
            onClick={() => onValueChange(null)}
            className="inline-flex items-center gap-[0.25rem] text-meta text-muted transition-colors hover:text-fg focus-visible:shadow-ring focus-visible:outline-none"
            disabled={disabled}
          >
            <X className="size-3.5" aria-hidden="true" />
            Clear
          </button>
        ) : null}
      </div>

      {hasValue ? (
        <p className="mt-[0.35rem] text-meta font-semibold">{selectedLabel ?? 'Selected'}</p>
      ) : null}

      <div className="mt-[0.4rem]">
        <SearchField
          label={label}
          placeholder={placeholder}
          value={term}
          disabled={disabled}
          onChange={(event) => onTermChange(event.target.value)}
        />
      </div>

      <div
        role="listbox"
        aria-label={`${label} results`}
        className="mt-[0.5rem] max-h-[15rem] overflow-y-auto rounded-lg border border-line"
      >
        {isLoading && options.length === 0 ? (
          <div className="space-y-[0.4rem] p-[0.5rem]">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-[2.6rem] rounded-md" />
            ))}
          </div>
        ) : isError ? (
          <p className="p-[0.9rem] text-meta font-semibold text-danger-ink" role="alert">
            {errorMessage}
          </p>
        ) : options.length === 0 ? (
          <p className="p-[0.9rem] text-meta text-muted">
            {isFetched ? emptyMessage : 'Searching…'}
          </p>
        ) : (
          <ul className="flex flex-col">
            {options.map((option, index) => {
              const selected = option.id === value
              return (
                <li key={option.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    ref={(node) => {
                      optionRefs.current[index] = node
                    }}
                    onClick={() => onValueChange(option.id)}
                    onKeyDown={(event) => onOptionKeyDown(event, index)}
                    className={cn(
                      'flex w-full items-center gap-[0.6rem] px-[0.7rem] py-[0.55rem] text-left transition-colors hover:bg-hover focus-visible:bg-hover focus-visible:shadow-ring focus-visible:outline-none',
                      selected && 'bg-hover',
                    )}
                  >
                    <Avatar size="sm" name={option.label} src={option.avatarUrl ?? undefined} decorative />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{option.label}</span>
                      {option.description ? (
                        <span className="block truncate text-meta text-muted tabular">
                          {option.description}
                        </span>
                      ) : null}
                    </span>
                    {selected ? (
                      <Check className="size-4 shrink-0 text-accent-ink" aria-hidden="true" />
                    ) : null}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {menuFooter ? <div className="mt-[0.5rem]">{menuFooter}</div> : null}
    </div>
  )
}
