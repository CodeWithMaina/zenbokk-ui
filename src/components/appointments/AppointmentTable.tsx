import { MoreHorizontal } from 'lucide-react'
import { useMemo } from 'react'
import { appointmentReference, serviceColor } from '../../lib/appointments'
import type { AppointmentRow } from '../../lib/appointments'
import { cn } from '../../lib/cn'
import { formatDay, formatDuration, formatTime, getInitials, money } from '../../lib/format'
import { Avatar } from '../ui/avatar'
import { LinkButton } from '../ui/button'
import { Checkbox } from '../ui/checkbox'
import { Menu } from '../ui/menu'
import { PaginationBar } from '../ui/pagination-bar'
import { AppointmentStatusBadge } from './AppointmentStatusBadge'
import { appointmentActionItems, isBulkCancellable, isBulkConfirmable } from './AppointmentActions'
import type { AppointmentAction } from './AppointmentActions'

export type AppointmentTableProps = {
  rows: readonly AppointmentRow[]
  /** Server total for the current filter set. */
  totalCount: number
  page: number
  pageCount: number
  pageSize: number
  pageSizeOptions?: readonly number[]
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  selected: ReadonlySet<string>
  onSelectionChange: (next: Set<string>) => void
  onOpen: (appointmentId: string) => void
  onAction: (action: AppointmentAction, row: AppointmentRow) => void
  onBulkConfirm: () => void
  onBulkCancel: () => void
  busy?: boolean
}

/**
 * Dense list view.
 *
 * The table is a real `<table>`, so rows, headers and the select-all control are
 * announced correctly, and columns drop out at the same breakpoints as the
 * reference design rather than forcing a sideways scroll.
 */
export function AppointmentTable({
  rows,
  totalCount,
  page,
  pageCount,
  pageSize,
  pageSizeOptions,
  onPageChange,
  onPageSizeChange,
  selected,
  onSelectionChange,
  onOpen,
  onAction,
  onBulkConfirm,
  onBulkCancel,
  busy = false,
}: AppointmentTableProps) {
  const pageIds = useMemo(() => rows.map((row) => row.id), [rows])
  const allSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id))
  const someSelected = pageIds.some((id) => selected.has(id))

  const selectedRows = useMemo(() => rows.filter((row) => selected.has(row.id)), [rows, selected])
  const canConfirmSelection = selectedRows.some((row) => isBulkConfirmable(row.status))
  const canCancelSelection = selectedRows.some((row) => isBulkCancellable(row.status))

  const toggleAll = () => {
    const next = new Set(selected)
    if (allSelected) pageIds.forEach((id) => next.delete(id))
    else pageIds.forEach((id) => next.add(id))
    onSelectionChange(next)
  }

  const toggleOne = (id: string) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    onSelectionChange(next)
  }

  return (
    <div>
      {selectedRows.length > 0 ? (
        <div
          role="region"
          aria-label="Bulk actions"
          className="mb-[0.6rem] flex flex-wrap items-center gap-[0.7rem] rounded-card border border-line bg-hover px-[0.9rem] py-[0.5rem] text-meta"
        >
          <b>{selectedRows.length} selected</b>
          <LinkButton onClick={onBulkConfirm} disabled={busy || !canConfirmSelection}>
            Confirm pending
          </LinkButton>
          <LinkButton
            onClick={onBulkCancel}
            disabled={busy || !canCancelSelection}
            className="text-danger-ink"
          >
            Cancel
          </LinkButton>
          <span className="flex-1" />
          <LinkButton onClick={() => onSelectionChange(new Set())}>Clear</LinkButton>
        </div>
      ) : null}

      <div className="card overflow-hidden" aria-busy={busy || undefined}>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <caption className="sr-only">Appointments for the current filters</caption>
            <thead>
              <tr className="bg-hover text-caption font-semibold tracking-caps text-muted uppercase">
                <th scope="col" className="w-[2.6rem] px-[1rem] py-[0.7rem]">
                  <Checkbox
                    label="Select every appointment on this page"
                    checked={allSelected}
                    indeterminate={!allSelected && someSelected}
                    onCheckedChange={toggleAll}
                  />
                </th>
                <th scope="col" className="px-[0.8rem] py-[0.7rem]">
                  Customer
                </th>
                <th scope="col" className="px-[0.8rem] py-[0.7rem]">
                  When
                </th>
                <th scope="col" className="px-[0.8rem] py-[0.7rem] max-md:hidden">
                  Service
                </th>
                <th scope="col" className="px-[0.8rem] py-[0.7rem] max-lg:hidden">
                  Staff
                </th>
                <th scope="col" className="px-[0.8rem] py-[0.7rem]">
                  Status
                </th>
                <th scope="col" className="px-[0.8rem] py-[0.7rem] text-right max-md:hidden">
                  Price
                </th>
                <th scope="col" className="w-[3.4rem] px-[1rem] py-[0.7rem]">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <AppointmentTableRow
                  key={row.id}
                  row={row}
                  selected={selected.has(row.id)}
                  onToggle={() => toggleOne(row.id)}
                  onOpen={() => onOpen(row.id)}
                  onAction={(action) => onAction(action, row)}
                />
              ))}
            </tbody>
          </table>
        </div>

        <div className="border-t border-line px-[1rem] py-[0.8rem]">
          <PaginationBar
            page={page}
            pageCount={pageCount}
            onPageChange={onPageChange}
            pageSize={pageSize}
            pageSizeOptions={pageSizeOptions}
            onPageSizeChange={onPageSizeChange}
          />
        </div>
      </div>

      <p className="mt-[0.6rem] text-meta text-muted tabular">
        Showing {rows.length} of <b>{totalCount}</b> appointments in this range
      </p>
    </div>
  )
}

/** One table row, kept separate so the table body stays readable. */
function AppointmentTableRow({
  row,
  selected,
  onToggle,
  onOpen,
  onAction,
}: {
  row: AppointmentRow
  selected: boolean
  onToggle: () => void
  onOpen: () => void
  onAction: (action: AppointmentAction) => void
}) {
  const dimmed = row.status === 'cancelled'

  return (
    <tr
      className={cn(
        'border-t border-line align-middle transition-colors hover:bg-hover',
        selected && 'bg-selected hover:bg-selected',
        dimmed && 'text-muted',
      )}
    >
      <td className="px-[1rem] py-[0.7rem]">
        <Checkbox
          label={`Select ${row.customerName}`}
          checked={selected}
          onCheckedChange={onToggle}
        />
      </td>

      <td className="px-[0.8rem] py-[0.7rem]">
        <button
          type="button"
          onClick={onOpen}
          className="flex min-w-0 items-center gap-[0.6rem] text-left focus-visible:shadow-ring focus-visible:outline-none"
        >
          <Avatar
            size="sm"
            name={row.customerName}
            initials={getInitials(row.customerName)}
            decorative
          />
          <span className="min-w-0">
            <span className={cn('block truncate font-semibold', dimmed && 'line-through')}>
              {row.customerName}
            </span>
            <span className="block truncate text-caption text-muted">
              {row.customerPhone ?? row.customerEmail ?? 'No contact'}
            </span>
          </span>
        </button>
      </td>

      <td className="px-[0.8rem] py-[0.7rem]">
        <span className="block font-semibold">{formatDay(row.scheduledAt)}</span>
        <span className="block text-caption text-muted tabular">
          {formatTime(row.scheduledAt)} – {formatTime(row.endAt)}
        </span>
      </td>

      <td className="px-[0.8rem] py-[0.7rem] max-md:hidden">
        <span className="flex items-center gap-[0.45rem]">
          <span
            aria-hidden="true"
            className="size-[0.55rem] shrink-0 rounded-round"
            style={{ backgroundColor: serviceColor(row.serviceId) }}
          />
          <span className="min-w-0 truncate font-semibold">{row.serviceName}</span>
        </span>
        <span className="block text-caption text-muted">{formatDuration(row.durationMinutes)}</span>
      </td>

      <td className="px-[0.8rem] py-[0.7rem] max-lg:hidden">
        {row.staffName ? (
          <span className="flex items-center gap-[0.5rem]">
            <Avatar size="sm" name={row.staffName} decorative />
            <span className="min-w-0 truncate">{row.staffName}</span>
          </span>
        ) : (
          <span className="text-muted">Unassigned</span>
        )}
      </td>

      <td className="px-[0.8rem] py-[0.7rem]">
        <AppointmentStatusBadge status={row.status} />
      </td>

      <td className="px-[0.8rem] py-[0.7rem] text-right font-semibold tabular max-md:hidden">
        {row.price === null ? '—' : money(row.price)}
      </td>

      <td className="px-[1rem] py-[0.7rem] text-right">
        <Menu
          items={appointmentActionItems(row.status, onAction)}
          triggerLabel={`Actions for ${row.customerName} (${appointmentReference(row.id)})`}
          trigger={<MoreHorizontal className="size-4" aria-hidden="true" />}
        />
      </td>
    </tr>
  )
}
