import { SearchField } from '../ui/search-field'

export type ServiceSearchProps = {
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  /** Marks the field busy while the debounced query is in flight. */
  busy?: boolean
  className?: string
  inputId?: string
}

/**
 * Search input for the services list.
 *
 * The value is owned by the page (it also lives in the URL), so this component
 * stays controlled and never debounces on its own — the page debounces the value
 * it sends to the server.
 */
export function ServiceSearch({
  value,
  onValueChange,
  placeholder = 'Search services',
  busy = false,
  className,
  inputId,
}: ServiceSearchProps) {
  return (
    <SearchField
      id={inputId}
      label="Search services"
      value={value}
      placeholder={placeholder}
      autoComplete="off"
      aria-busy={busy || undefined}
      className={className}
      onChange={(event) => onValueChange(event.target.value)}
    />
  )
}
