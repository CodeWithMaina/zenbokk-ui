import { SearchField } from '../ui/search-field'

export type StorefrontFiltersProps = {
  /** Placeholder text, e.g. `Search services`. */
  placeholder: string
  search: string
  onSearchChange: (value: string) => void
  /** `null` represents "All" — the unfiltered view. */
  options: string[]
  active: string | null
  onActiveChange: (value: string | null) => void
  /** Accessible name for the chip group. */
  label: string
}

/**
 * The storefront's search box plus category chips.
 *
 * Filtering is client-side on purpose. The public catalogue and roster endpoints
 * return a business's entire published set in one call and offer no server-side
 * filter parameters, so filtering here is not a shortcut — it is the only correct
 * implementation, and it means typing never issues a request. A business with
 * thousands of services would need a paginated public endpoint before that could
 * change.
 */
export function StorefrontFilters({
  placeholder,
  search,
  onSearchChange,
  options,
  active,
  onActiveChange,
  label,
}: StorefrontFiltersProps) {
  return (
    <div className="sf-tools">
      <SearchField
        className="sf-search"
        label={placeholder}
        placeholder={placeholder}
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
      />

      {options.length > 1 ? (
        <div className="sf-chips" role="group" aria-label={label}>
          {[null, ...options].map((option) => (
            <button
              key={option ?? 'all'}
              type="button"
              className="sf-chip"
              aria-pressed={active === option}
              onClick={() => onActiveChange(option)}
            >
              {option ?? 'All'}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

