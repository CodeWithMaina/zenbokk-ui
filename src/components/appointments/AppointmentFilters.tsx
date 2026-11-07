import { CalendarRange } from 'lucide-react'
import type { ReactNode } from 'react'
import type { ServiceDashboardItem, StaffDashboardItem } from '../../lib/api/types'
import {
  APPOINTMENT_SORT_LABELS,
  APPOINTMENT_SORTS,
  APPOINTMENT_STATUSES,
  DATE_PRESET_LABELS,
  DATE_PRESETS,
  appointmentStatusLabel,
  serviceColor,
} from '../../lib/appointments'
import type {
  AppointmentDatePreset,
  AppointmentFilters as Filters,
  AppointmentSort,
  CalendarMode,
} from '../../lib/appointments'
import { formatDuration, money } from '../../lib/format'
import { Avatar } from '../ui/avatar'
import { Chip } from '../ui/chip'
import { Field, Input } from '../ui/field'
import { FilterDrawer } from '../ui/filter-drawer'
import { OptionRow } from '../ui/option-row'
import { SegmentedControl } from '../ui/segmented-control'

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

export type AppointmentFilterCounts = {
  staff: ReadonlyMap<string, number>
  service: ReadonlyMap<string, number>
  status: ReadonlyMap<string, number>
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
  /**
   * Per-option counts. Only supplied when the loaded rows are the whole range
   * (the calendar pane), so a page number is never presented as a total.
   */
  counts?: AppointmentFilterCounts
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
  counts,
  calendar,
  busy = false,
}: AppointmentFiltersProps) {
  const patch = (next: Partial<Filters>) => onChange({ ...filters, ...next })

  const datePresets: readonly AppointmentDatePreset[] = calendar
    ? DATE_PRESETS.filter((preset) => preset !== 'custom' && preset !== 'all')
    : DATE_PRESETS

  return (
    <FilterDrawer
      open={open}
      onClose={onClose}
      title="Filters"
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
            {APPOINTMENT_SORTS.map((sort: AppointmentSort) => (
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
        <div className="space-y-[0.45rem]">
          <OptionRow
            role="radio"
            title="All staff"
            meta={counts ? `${counts.staff.get('all') ?? 0}` : undefined}
            selected={filters.staffId === null}
            onSelectedChange={() => patch({ staffId: null })}
          />
          {staff.map((member) => (
            <OptionRow
              key={member.userId}
              role="radio"
              title={
                <span className="flex items-center gap-[0.5rem]">
                  <Avatar
                    size="sm"
                    name={member.fullName}
                    src={member.avatarUrl ?? undefined}
                    decorative
                  />
                  {member.fullName}
                </span>
              }
              description={member.email}
              selected={filters.staffId === member.userId}
              onSelectedChange={() => patch({ staffId: member.userId })}
              meta={counts ? `${counts.staff.get(member.userId) ?? 0}` : undefined}
            />
          ))}
          {staff.length === 0 ? (
            <p className="text-meta text-muted">No staff members are linked to this business yet.</p>
          ) : null}
        </div>
      </FilterGroup>
      ) : null}

      <FilterGroup title="Service">
        <div className="space-y-[0.45rem]">
          <OptionRow
            role="radio"
            title="All services"
            meta={counts ? `${counts.service.get('all') ?? 0}` : undefined}
            selected={filters.serviceId === null}
            onSelectedChange={() => patch({ serviceId: null })}
          />
          {services.map((service) => (
            <OptionRow
              key={service.id}
              role="radio"
              title={
                <span className="flex items-center gap-[0.5rem]">
                  <span
                    aria-hidden="true"
                    className="size-[0.6rem] shrink-0 rounded-round"
                    style={{ backgroundColor: serviceColor(service.id) }}
                  />
                  {service.name}
                </span>
              }
              description={`${formatDuration(service.durationMinutes)} · ${money(service.price)}`}
              selected={filters.serviceId === service.id}
              onSelectedChange={() => patch({ serviceId: service.id })}
              meta={counts ? `${counts.service.get(service.id) ?? 0}` : undefined}
            />
          ))}
        </div>
      </FilterGroup>

      <FilterGroup title="Status">
        <div className="space-y-[0.45rem]">
          <OptionRow
            role="radio"
            title="All statuses"
            meta={counts ? `${counts.status.get('all') ?? 0}` : undefined}
            selected={filters.status === null}
            onSelectedChange={() => patch({ status: null })}
          />
          {APPOINTMENT_STATUSES.map((status) => (
            <OptionRow
              key={status}
              role="radio"
              title={appointmentStatusLabel(status)}
              selected={filters.status === status}
              onSelectedChange={() => patch({ status })}
              meta={counts ? `${counts.status.get(status) ?? 0}` : undefined}
            />
          ))}
        </div>
      </FilterGroup>
    </FilterDrawer>
  )
}
