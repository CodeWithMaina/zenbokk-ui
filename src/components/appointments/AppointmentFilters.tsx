import { CalendarRange } from 'lucide-react'
import type { ReactNode } from 'react'
import type { ServiceDashboardItem, StaffDashboardItem } from '../../lib/api/types'
import {
  APPOINTMENT_SORT_LABELS,
  APPOINTMENT_STATUSES,
  DATE_PRESET_LABELS,
  DATE_PRESETS,
  LIST_SORTS,
  PAYMENT_FILTER_LABELS,
  PAYMENT_FILTERS,
  activeFilterCount,
  appointmentStatusLabel,
} from '../../lib/appointments'
import type {
  AppointmentDatePreset,
  AppointmentFilters as Filters,
  AppointmentSort,
  AppointmentStatus,
  CalendarMode,
  PaymentFilter,
} from '../../lib/appointments'
import { Chip } from '../ui/chip'
import { Field, Input } from '../ui/field'
import { FilterDrawer } from '../ui/filter-drawer'
import { OptionRow } from '../ui/option-row'
import { SegmentedControl } from '../ui/segmented-control'
import { CustomerMultiSelect, ServiceMultiSelect, StaffMultiSelect } from './MultiSelectFilters'

/** Small uppercase section heading, matching the design's group labels. */
function FilterGroup({ title, hint, children }: { title: ReactNode; hint?: ReactNode; children: ReactNode }) {
  return (
    <section className="mt-[1.1rem] first:mt-[0.2rem]">
      <h3 className="text-caption font-bold tracking-caps text-muted uppercase">
        {title}
        {hint ? <span className="ml-[0.4rem] font-medium tracking-normal normal-case">{hint}</span> : null}
      </h3>
      <div className="mt-[0.5rem]">{children}</div>
    </section>
  )
}

export type AppointmentFiltersProps = {
  open: boolean
  onClose: () => void
  filters: Filters
  onChange: (next: Filters) => void
  onReset: () => void
  staff: readonly StaffDashboardItem[]
  /**
   * Whether the optional Staff module is entitled for this business. When false the
   * whole Staff group is omitted — not merely disabled — so a business without the
   * module is never offered a staff filter at all.
   */
  staffEnabled?: boolean
  services: readonly ServiceDashboardItem[]
  /** Rows the drawer's result count reflects. */
  resultCount: number
  /** Calendar view: the pane's granularity and a jump-to date. */
  calendar?: {
    mode: CalendarMode
    onModeChange: (mode: CalendarMode) => void
    anchor: string
    onAnchorChange: (value: string) => void
  }
  busy?: boolean
}


/**
 * The filter panel from the reference design, wired to the API's real filter
 * contract.
 *
 * Every change writes straight through `onChange`, so the list behind the drawer
 * is already showing the new result set by the time the drawer closes. The
 * footer's count is the server's own `totalCount` (or the calendar pane's row
 * count), never a guess.
 */
export function AppointmentFilters({
  open,
  onClose,
  filters,
  onChange,
  onReset,
  staff,
  staffEnabled = true,
  services,
  resultCount,
  calendar,
  busy = false,
}: AppointmentFiltersProps) {
  const patch = (next: Partial<Filters>) => onChange({ ...filters, ...next })

  /** How many filters are narrowing the list right now — shown in the drawer's header. */
  const activeCount = activeFilterCount(filters)

  const datePresets: readonly AppointmentDatePreset[] = calendar
    ? DATE_PRESETS.filter((preset) => preset !== 'custom' && preset !== 'all')
    : DATE_PRESETS

  return (
    <FilterDrawer
      open={open}
      onClose={onClose}
      title={
        activeCount > 0 ? (
          <span className="flex items-center gap-[0.45rem]">
            Filters
            <span className="rounded-pill bg-inverse px-[0.45rem] py-[0.05rem] text-caption font-semibold text-on-inverse">
              {activeCount}
            </span>
          </span>
        ) : (
          'Filters'
        )
      }
      description={
        calendar
          ? `Calendar · ${resultCount} result${resultCount === 1 ? '' : 's'}`
          : `Appointments · ${resultCount} result${resultCount === 1 ? '' : 's'}`
      }
      onReset={onReset}
      resetLabel="Reset all"
      applyLabel={`Show ${resultCount} appointment${resultCount === 1 ? '' : 's'}`}
      applyDisabled={busy}
    >
      {calendar ? (
        <FilterGroup title="Calendar view">
          <SegmentedControl
            label="Calendar granularity"
            value={calendar.mode}
            onValueChange={calendar.onModeChange}
            className="w-full [&>button]:flex-1"
            options={[
              { value: 'day', label: 'Day' },
              { value: 'week', label: 'Week' },
              { value: 'month', label: 'Month' },
            ]}
          />
          <Field label="Go to a specific date" htmlFor="appointment-filter-goto" className="mt-[0.8rem]">
            <Input
              id="appointment-filter-goto"
              type="date"
              value={calendar.anchor}
              onChange={(event) => calendar.onAnchorChange(event.target.value)}
            />
          </Field>
        </FilterGroup>
      ) : null}

      <FilterGroup title={calendar ? 'Jump to' : 'Date'}>
        <div role="group" aria-label="Date range" className="flex flex-wrap gap-[0.45rem]">
          {datePresets.map((preset) => (
            <Chip
              key={preset}
              pressed={filters.preset === preset}
              onPressedChange={() => patch({ preset })}
            >
              {DATE_PRESET_LABELS[preset]}
            </Chip>
          ))}
        </div>

        {!calendar && filters.preset === 'custom' ? (
          <div className="mt-[0.8rem] flex gap-[0.6rem]">
            <Field label="From" htmlFor="appointment-filter-from" className="flex-1">
              <Input
                id="appointment-filter-from"
                type="date"
                value={filters.from}
                onChange={(event) => patch({ from: event.target.value })}
              />
            </Field>
            <Field label="To" htmlFor="appointment-filter-to" className="flex-1">
              <Input
                id="appointment-filter-to"
                type="date"
                value={filters.to}
                onChange={(event) => patch({ to: event.target.value })}
              />
            </Field>
          </div>
        ) : null}

        {calendar ? (
          <p className="mt-[0.6rem] flex items-center gap-[0.4rem] text-meta text-muted">
            <CalendarRange className="size-3.5" aria-hidden="true" />
            Custom ranges and sorting are available in Table and Cards.
          </p>
        ) : null}
      </FilterGroup>

      {!calendar ? (
        <FilterGroup title="Sort by">
          <div className="space-y-[0.45rem]">
            {LIST_SORTS.map((sort: AppointmentSort) => (
              <OptionRow
                key={sort}
                role="radio"
                title={APPOINTMENT_SORT_LABELS[sort]}
                selected={filters.sort === sort}
                onSelectedChange={() => patch({ sort })}
              />
            ))}
          </div>
        </FilterGroup>
      ) : null}

      {staffEnabled ? (
        <FilterGroup title="Staff">
          <StaffMultiSelect
            staff={staff}
            selected={filters.staffIds}
            onSelectedChange={(staffIds) => patch({ staffIds })}
          />
        </FilterGroup>
      ) : null}

      <FilterGroup title="Services">
        <ServiceMultiSelect
          services={services}
          selected={filters.serviceIds}
          onSelectedChange={(serviceIds) => patch({ serviceIds })}
        />
      </FilterGroup>

      <FilterGroup title="Customers">
        <CustomerMultiSelect
          selected={filters.customerIds}
          onSelectedChange={(customerIds) => patch({ customerIds })}
        />
      </FilterGroup>

      <FilterGroup title="Status">
        <Field label="Appointment status" htmlFor="appointment-filter-status">
          <select
            id="appointment-filter-status"
            className="select"
            value={filters.status ?? ''}
            onChange={(event) =>
              patch({ status: (event.target.value || null) as AppointmentStatus | null })
            }
          >
            <option value="">All statuses</option>
            {APPOINTMENT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {appointmentStatusLabel(status)}
              </option>
            ))}
          </select>
        </Field>
        {filters.status ? (
          <button
            type="button"
            onClick={() => patch({ status: null })}
            className="mt-[0.5rem] text-meta text-muted transition-colors hover:text-fg focus-visible:shadow-ring focus-visible:outline-none"
          >
            Clear status
          </button>
        ) : null}
      </FilterGroup>

      <FilterGroup title="Payment" hint="from the payment ledger">
        <Field label="Payment state" htmlFor="appointment-filter-payment">
          <select
            id="appointment-filter-payment"
            className="select"
            value={filters.payment}
            onChange={(event) => patch({ payment: event.target.value as PaymentFilter })}
          >
            {/* `all` is a real option, not an absence: it removes ONLY the payment
                filter, leaving every other selection alone. */}
            {PAYMENT_FILTERS.map((option) => (
              <option key={option} value={option}>
                {PAYMENT_FILTER_LABELS[option]}
              </option>
            ))}
          </select>
        </Field>
        {filters.payment !== 'all' ? (
          <button
            type="button"
            onClick={() => patch({ payment: 'all' })}
            className="mt-[0.5rem] text-meta text-muted transition-colors hover:text-fg focus-visible:shadow-ring focus-visible:outline-none"
          >
            Clear payment filter
          </button>
        ) : null}
      </FilterGroup>
    </FilterDrawer>
  )
}
