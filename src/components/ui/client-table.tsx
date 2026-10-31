import type { MouseEvent, ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { Avatar } from './avatar'
import { StatusPill } from './badge'
import { Checkbox } from './checkbox'
import { EmptyState } from './empty-state'
import { StampDots } from './stamp-dots'
import type { ClientSummary } from './client-card'

export type ClientTableProps = {
  rows: readonly ClientSummary[]
  selectedIds?: ReadonlySet<string>
  onSelectedChange?: (id: string, selected: boolean) => void
  /** Header checkbox. Receives the requested "all" state. */
  onSelectAll?: (selected: boolean) => void
  onOpen?: (client: ClientSummary) => void
  stampGoal?: number
  /** Accessible table name. */
  label?: string
  empty?: ReactNode
  className?: string
}

/**
 * Client list table with bulk selection. Phone and visit columns fold away on
 * narrow screens; the name, status and stamp progress always remain.
 */
export function ClientTable({
  rows,
  selectedIds,
  onSelectedChange,
  onSelectAll,
  onOpen,
  stampGoal = 8,
  label = 'Clients',
  empty,
  className,
}: ClientTableProps) {
  const selectable = Boolean(selectedIds && onSelectedChange)
  const selectedCount = selectable
    ? rows.filter((row) => selectedIds?.has(row.id)).length
    : 0
  const allSelected = rows.length > 0 && selectedCount === rows.length
  const someSelected = selectedCount > 0 && !allSelected
  const goal = Math.max(1, stampGoal)
  const columnCount = selectable ? 6 : 5

  return (
    <table className={cn('table', className)} aria-label={label}>
      <caption className="sr-only">{label}</caption>
      <thead>
        <tr>
          {selectable ? (
            <th scope="col" className="w-[2.4rem]">
              {onSelectAll ? (
                <Checkbox
                  checked={allSelected}
                  indeterminate={someSelected}
                  onCheckedChange={() => onSelectAll(!allSelected)}
                  label="Select all clients"
                />
              ) : (
                <span className="sr-only">Select</span>
              )}
            </th>
          ) : null}
          <th scope="col">Client</th>
          <th scope="col" className="hidden md:table-cell">
            Phone
          </th>
          <th scope="col" className="hidden sm:table-cell">
            Status
          </th>
          <th scope="col" className="hidden sm:table-cell">
            Stamps
          </th>
          <th scope="col" className="hidden lg:table-cell">
            Last visit
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td colSpan={columnCount} className="p-0">
              {empty ?? (
                <EmptyState
                  title="No clients yet"
                  description="Clients appear here after their first stamp."
                />
              )}
            </td>
          </tr>
        ) : (
          rows.map((client) => {
            const selected = Boolean(selectedIds?.has(client.id))
            const stamps = Math.min(Math.max(0, client.stamps ?? 0), goal)

            const handleRowClick = (event: MouseEvent<HTMLTableRowElement>) => {
              if (!onOpen) return
              if (
                (event.target as HTMLElement).closest(
                  'a, button, input, [role="checkbox"]',
                )
              ) {
                return
              }
              onOpen(client)
            }

            return (
              <tr
                key={client.id}
                onClick={onOpen ? handleRowClick : undefined}
                className={cn(selected && 'bg-selected', onOpen && 'cursor-pointer')}
              >
                {selectable ? (
                  <td className="w-[2.4rem]">
                    <Checkbox
                      checked={selected}
                      onCheckedChange={(checked) =>
                        onSelectedChange?.(client.id, checked)
                      }
                      label={`Select ${client.name}`}
                    />
                  </td>
                ) : null}

                <td>
                  <div className="flex min-w-0 items-center gap-[0.7rem]">
                    <Avatar
                      name={client.name}
                      tint={client.tint}
                      size="sm"
                      decorative
                    />
                    <div className="min-w-0">
                      {onOpen ? (
                        <button
                          type="button"
                          onClick={() => onOpen(client)}
                          className="block max-w-full truncate text-left font-semibold tracking-snug hover:underline focus-visible:shadow-ring focus-visible:outline-none"
                        >
                          {client.name}
                        </button>
                      ) : (
                        <p className="truncate font-semibold tracking-snug">
                          {client.name}
                        </p>
                      )}
                      <span className="block truncate text-caption text-muted md:hidden">
                        {client.phone ?? 'No phone number'}
                      </span>
                    </div>
                  </div>
                </td>

                <td className="hidden text-meta text-muted md:table-cell">
                  {client.phone ? (
                    <a
                      href={`tel:${client.phone.replace(/\s/g, '')}`}
                      className="hover:text-fg"
                    >
                      {client.phone}
                    </a>
                  ) : (
                    <span className="text-subtle">—</span>
                  )}
                </td>

                <td className="hidden sm:table-cell">
                  <StatusPill status={client.status} tone={client.tone}>
                    {client.statusLabel ?? client.status}
                  </StatusPill>
                </td>

                <td className="hidden sm:table-cell">
                  {client.stamps === undefined ? (
                    <span className="text-muted">—</span>
                  ) : (
                    <span className="flex items-center gap-[0.5rem]">
                      <StampDots stamps={stamps} goal={goal} />
                      <span className="text-meta text-muted tabular">
                        {stamps}/{goal}
                      </span>
                    </span>
                  )}
                </td>

                <td className="hidden text-meta text-muted lg:table-cell">
                  {client.lastVisit ?? '—'}
                </td>
              </tr>
            )
          })
        )}
      </tbody>
    </table>
  )
}
