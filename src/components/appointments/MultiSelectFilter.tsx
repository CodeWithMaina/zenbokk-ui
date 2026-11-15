import { Check, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { cn } from '../../lib/cn'
import { Avatar } from '../ui/avatar'
import { Chip } from '../ui/chip'
import { SearchField } from '../ui/search-field'
import { Skeleton } from '../ui/skeleton'

/** One row of a multi-select filter. */
export type MultiSelectOption = {
  id: string
  label: string
  /** Supporting line, e.g. `+254 712… · john@example.com`. */
  description?: string | null
  avatarUrl?: string | null
  /** Optional swatch, used by the service filter's palette dot. */
  color?: string | null
}

export type MultiSelectFilterProps = {
  /** Accessible name of the field; also labels the results list. */
  label: string
  placeholder?: string
  /** Rows offered for selection (already searched, when the caller searches server-side). */
  options: readonly MultiSelectOption[]
  /** The chips: every chosen row, even one the current search no longer returns. */
  selectedOptions: readonly MultiSelectOption[]
  selected: readonly string[]
  onSelectedChange: (ids: string[]) => void
  /**
   * The search term. Supply `onTermChange` to own it (server-side search) —
   * omit both and the component filters `options` itself.
   */
  term?: string
  onTermChange?: (term: string) => void
  isLoading?: boolean
  isError?: boolean
  errorMessage?: string
  emptyMessage?: string
  /** How tall the results list may grow before it scrolls. */
  listClassName?: string
}

/**
 * A searchable multi-select with removable chips.
 *
 * <para>Built for the appointment filters: a business may have hundreds of services or
 * customers, so the list is always searched (locally or by the API) and never rendered in
 * full, and the chosen values are shown as chips each with its own remove button. Removing
 * one chip removes exactly that value — it does not reset the others — so a filter set can
 * be built up and edited one value at a time.</para>
 */
export function MultiSelectFilter({
  label,
  placeholder = 'Search…',
  options,
  selectedOptions,
  selected,
  onSelectedChange,
  term,
  onTermChange,
  isLoading = false,
  isError = false,
  errorMessage = 'This list could not be loaded. Try again.',
  emptyMessage = 'No matches.',
  listClassName = 'max-h-[13rem]',
}: MultiSelectFilterProps) {
  const [localTerm, setLocalTerm] = useState('')
  const controlled = typeof onTermChange === 'function'
  const activeTerm = controlled ? (term ?? '') : localTerm

  const chosen = useMemo(() => new Set(selected), [selected])

  /** Add or remove one id, never clearing the rest and never duplicating. */
  function toggle(id: string) {
    onSelectedChange(chosen.has(id) ? selected.filter((entry) => entry !== id) : [...selected, id])
  }

  const visible = useMemo(() => {
    const needle = activeTerm.trim().toLowerCase()
    // Locally searched only when the caller is not searching for us.
    if (controlled || !needle) return options
    return options.filter((option) =>
      `${option.label} ${option.description ?? ''}`.toLowerCase().includes(needle),
    )
  }, [activeTerm, controlled, options])

  return (
    <div className="min-w-0">
      <div className="flex items-center justify-between gap-[0.5rem]">
        <span className="text-meta font-semibold text-muted">{label}</span>
        {selected.length > 0 ? (
          <button
            type="button"
            onClick={() => onSelectedChange([])}
            className="inline-flex items-center gap-[0.25rem] text-meta text-muted transition-colors hover:text-fg focus-visible:shadow-ring focus-visible:outline-none"
          >
            <X className="size-3.5" aria-hidden="true" />
            {selected.length === 1 ? 'Clear selection' : `Clear ${selected.length}`}
          </button>
        ) : null}
      </div>

      {selectedOptions.length > 0 ? (
        <div
          className="mt-[0.45rem] flex flex-wrap gap-[0.4rem]"
          role="list"
          aria-label={`${label} selected`}
        >
          {selectedOptions.map((option) => (
            <Chip
              key={option.id}
              onRemove={() => toggle(option.id)}
              removeLabel={`Remove ${option.label}`}
            >
              {option.label}
            </Chip>
          ))}
        </div>
      ) : null}

      <div className="mt-[0.5rem]">
        <SearchField
          label={label}
          placeholder={placeholder}
          value={activeTerm}
          onChange={(event) =>
            controlled ? onTermChange!(event.target.value) : setLocalTerm(event.target.value)
          }
        />
      </div>

      <div
        role="listbox"
        aria-label={`${label} options`}
        className={cn('mt-[0.5rem] overflow-y-auto rounded-lg border border-line', listClassName)}
      >
        {isLoading && visible.length === 0 ? (
          <div className="space-y-[0.4rem] p-[0.5rem]">
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={index} className="h-[2.4rem] rounded-md" />
            ))}
          </div>
        ) : isError ? (
          <p className="p-[0.9rem] text-meta font-semibold text-danger-ink" role="alert">
            {errorMessage}
          </p>
        ) : visible.length === 0 ? (
          <p className="p-[0.9rem] text-meta text-muted">{emptyMessage}</p>
        ) : (
          <ul className="flex flex-col">
            {visible.map((option) => {
              const isChosen = chosen.has(option.id)
              return (
                <li key={option.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isChosen}
                    onClick={() => toggle(option.id)}
                    className={cn(
                      'flex w-full items-center gap-[0.55rem] px-[0.7rem] py-[0.5rem] text-left transition-colors hover:bg-hover focus-visible:bg-hover focus-visible:shadow-ring focus-visible:outline-none',
                      isChosen && 'bg-hover',
                    )}
                  >
                    {option.color ? (
                      <span
                        aria-hidden="true"
                        className="size-[0.6rem] shrink-0 rounded-round"
                        style={{ backgroundColor: option.color }}
                      />
                    ) : (
                      <Avatar size="sm" name={option.label} src={option.avatarUrl ?? undefined} decorative />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{option.label}</span>
                      {option.description ? (
                        <span className="block truncate text-meta text-muted tabular">
                          {option.description}
                        </span>
                      ) : null}
                    </span>
                    {isChosen ? (
                      <Check className="size-4 shrink-0 text-accent-ink" aria-hidden="true" />
                    ) : null}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
