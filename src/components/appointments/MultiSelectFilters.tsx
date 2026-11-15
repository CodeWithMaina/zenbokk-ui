import { useEffect, useMemo, useState } from 'react'
import type { ServiceDashboardItem, StaffDashboardItem } from '../../lib/api/types'
import { serviceColor, useCustomerSearch, useStaffSearch } from '../../lib/appointments'
import { formatDuration, money } from '../../lib/format'
import { MultiSelectFilter } from './MultiSelectFilter'
import type { MultiSelectOption } from './MultiSelectFilter'

/**
 * The three multi-select filters, each wired to the source that fits it.
 *
 * <para>Services come from the dashboard's own service bucket (the catalogue is small and
 * already loaded), so the search is local. Customers and staff are searched by the API,
 * because a business may have thousands of customers and shipping them all to the browser
 * to fill a filter would be the very thing the server-side search exists to avoid.</para>
 *
 * <para>Every selector remembers the rows it has seen, so a chip keeps its label after the
 * search term changes — a chosen customer is never shown as a bare id.</para>
 */

/** Keeps a lookup of every option seen so far, so chips survive a new search. */
function useSeenOptions() {
  const [seen, setSeen] = useState<Record<string, MultiSelectOption>>({})

  function remember(options: readonly MultiSelectOption[]) {
    setSeen((current) => {
      let changed = false
      const next = { ...current }
      for (const option of options) {
        if (next[option.id]?.label === option.label) continue
        next[option.id] = option
        changed = true
      }
      return changed ? next : current
    })
  }

  return { seen, remember }
}

/** Chips for the chosen ids, in the order they were chosen. */
function chipsFor(
  ids: readonly string[],
  lookup: Record<string, MultiSelectOption>,
): MultiSelectOption[] {
  return ids.map((id) => lookup[id] ?? { id, label: 'Selected' })
}

/** Service text shown under the name: duration · price, as the drawer's rows read. */
function serviceDescription(service: ServiceDashboardItem): string {
  return `${formatDuration(service.durationMinutes)} · ${money(service.price)}`
}

export function ServiceMultiSelect({
  services,
  selected,
  onSelectedChange,
}: {
  services: readonly ServiceDashboardItem[]
  selected: readonly string[]
  onSelectedChange: (ids: string[]) => void
}) {
  const options = useMemo<MultiSelectOption[]>(
    () =>
      services.map((service) => ({
        id: service.id,
        label: service.name,
        description: serviceDescription(service),
        color: serviceColor(service.id),
      })),
    [services],
  )

  const lookup = useMemo(() => Object.fromEntries(options.map((o) => [o.id, o])), [options])

  return (
    <MultiSelectFilter
      label="Services"
      placeholder="Search services by name"
      options={options}
      selectedOptions={chipsFor(selected, lookup)}
      selected={selected}
      onSelectedChange={onSelectedChange}
      emptyMessage={services.length === 0 ? 'This business has no services yet.' : 'No service matches.'}
    />
  )
}

export function CustomerMultiSelect({
  selected,
  onSelectedChange,
}: {
  selected: readonly string[]
  onSelectedChange: (ids: string[]) => void
}) {
  const [term, setTerm] = useState('')
  const query = useCustomerSearch(term)
  const { seen, remember } = useSeenOptions()

  const options = useMemo<MultiSelectOption[]>(
    () =>
      (query.data ?? []).map((customer) => ({
        id: customer.userId,
        label: customer.fullName,
        description: [customer.phoneNumber, customer.email].filter(Boolean).join(' · '),
        avatarUrl: customer.avatarUrl,
      })),
    [query.data],
  )

  useEffect(() => {
    if (options.length > 0) remember(options)
  }, [options, remember])

  return (
    <MultiSelectFilter
      label="Customers"
      placeholder="Search by name, phone or email"
      term={term}
      onTermChange={setTerm}
      options={options}
      selectedOptions={chipsFor(selected, seen)}
      selected={selected}
      onSelectedChange={onSelectedChange}
      isLoading={query.isLoading}
      isError={query.isError}
      errorMessage="Customers could not be searched. Try again."
      emptyMessage="No customer matches."
    />
  )
}

export function StaffMultiSelect({
  staff,
  selected,
  onSelectedChange,
}: {
  /** The business's active staff, from the dashboard bucket. */
  staff: readonly StaffDashboardItem[]
  selected: readonly string[]
  onSelectedChange: (ids: string[]) => void
}) {
  const [term, setTerm] = useState('')
  // The bucket already names everyone; the search endpoint narrows it when the roster is
  // long. Both are merged so a busy business can still find someone by typing.
  const query = useStaffSearch(term)
  const { seen, remember } = useSeenOptions()

  const options = useMemo<MultiSelectOption[]>(() => {
    const byId = new Map<string, MultiSelectOption>()
    for (const member of [...staff, ...(query.data ?? [])]) {
      byId.set(member.userId, {
        id: member.userId,
        label: member.fullName,
        description: member.email,
        avatarUrl: member.avatarUrl,
      })
    }
    const needle = term.trim().toLowerCase()
    const all = [...byId.values()]
    return needle
      ? all.filter((option) =>
          `${option.label} ${option.description ?? ''}`.toLowerCase().includes(needle),
        )
      : all
  }, [query.data, staff, term])

  useEffect(() => {
    if (options.length > 0) remember(options)
  }, [options, remember])

  return (
    <MultiSelectFilter
      label="Staff"
      placeholder="Search staff members"
      term={term}
      onTermChange={setTerm}
      options={options}
      selectedOptions={chipsFor(selected, seen)}
      selected={selected}
      onSelectedChange={onSelectedChange}
      isLoading={query.isLoading && options.length === 0}
      isError={query.isError && options.length === 0}
      errorMessage="Staff could not be searched. Try again."
      emptyMessage="No staff member matches."
    />
  )
}
