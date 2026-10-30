import type { ReactNode } from 'react'
import { Users } from 'lucide-react'
import { cn } from '../../lib/cn'
import { ClientCard } from './client-card'
import type { ClientSummary } from './client-card'
import { EmptyState } from './empty-state'

export type ClientGridProps = {
  clients: readonly ClientSummary[]
  selectedIds?: ReadonlySet<string>
  onSelectedChange?: (id: string, selected: boolean) => void
  onOpen?: (client: ClientSummary) => void
  stampGoal?: number
  empty?: ReactNode
  className?: string
}

/**
 * Responsive card grid from the Clients design. Mirrors `ClientTable` so a
 * toolbar can switch between the two without changing selection semantics.
 */
export function ClientGrid({
  clients,
  selectedIds,
  onSelectedChange,
  onOpen,
  stampGoal,
  empty,
  className,
}: ClientGridProps) {
  if (clients.length === 0) {
    return (
      <div className={cn('card', className)}>
        {empty ?? (
          <EmptyState
            icon={<Users className="size-5" />}
            title="No clients yet"
            description="Clients appear here after their first stamp."
          />
        )}
      </div>
    )
  }

  return (
    <div
      role="list"
      aria-label="Clients"
      className={cn(
        'grid grid-cols-1 gap-[0.7rem] sm:grid-cols-[repeat(auto-fill,minmax(15rem,1fr))]',
        className,
      )}
    >
      {clients.map((client) => {
        const selectable = Boolean(selectedIds && onSelectedChange)

        return (
          <div key={client.id} role="listitem">
            <ClientCard
              client={client}
              selected={selectedIds?.has(client.id) ?? false}
              onSelectedChange={
                selectable
                  ? (selected) => onSelectedChange?.(client.id, selected)
                  : undefined
              }
              onOpen={onOpen}
              stampGoal={stampGoal ?? client.stampGoal}
            />
          </div>
        )
      })}
    </div>
  )
}
