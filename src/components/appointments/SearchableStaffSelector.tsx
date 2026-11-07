import { useState } from 'react'
import { useStaffSearch } from '../../lib/appointments'
import type { StaffOption } from '../../lib/appointments'
import { SearchableEntitySelector } from './SearchableEntitySelector'

export type SearchableStaffSelectorProps = {
  value: StaffOption | null
  onChange: (staff: StaffOption | null) => void
  /** The Staff module gate — false means the caller must not search at all. */
  enabled: boolean
  disabled?: boolean
  label?: string
}

/**
 * Searchable staff selection.
 *
 * <para>Only rendered (and only ever queried) when the business is entitled to the
 * optional Staff module: <paramref name="enabled"/> is wired to the caller's real
 * entitlement, so switching the module off stops the request at the source rather than
 * fetching a list the user must not see.</para>
 */
export function SearchableStaffSelector({
  value,
  onChange,
  enabled,
  disabled = false,
  label = 'Staff member',
}: SearchableStaffSelectorProps) {
  const [term, setTerm] = useState('')
  const search = useStaffSearch(term, enabled && !disabled)

  const options = (search.data ?? []).map((member) => ({
    id: member.userId,
    label: member.fullName,
    description: member.email,
    avatarUrl: member.avatarUrl,
  }))

  return (
    <SearchableEntitySelector
      label={label}
      placeholder="Search by name…"
      value={value?.userId ?? null}
      onValueChange={(id) => {
        if (id == null) {
          onChange(null)
          return
        }
        onChange((search.data ?? []).find((member) => member.userId === id) ?? null)
      }}
      selectedLabel={value?.fullName ?? null}
      options={options}
      term={term}
      onTermChange={setTerm}
      isLoading={search.isLoading}
      isFetched={search.isFetched}
      isError={search.isError}
      errorMessage="Staff could not be loaded. Check your connection and try again."
      emptyMessage={`No staff member matches “${term.trim()}”.`}
      disabled={disabled}
    />
  )
}
