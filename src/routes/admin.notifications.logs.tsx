import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { ScrollText } from 'lucide-react'
import {
  ClassificationBadge,
  NOTIFICATION_CHANNELS,
  channelLabel,
  formatTimestamp,
  humanize,
} from '../components/admin/notifications/shared'
import { NotificationLogDetailDrawer } from '../components/admin/notifications/NotificationLogDetailDrawer'
import { Alert } from '../components/ui/alert'
import { Button } from '../components/ui/button'
import { Card, SectionCard } from '../components/ui/card'
import { EmptyState } from '../components/ui/empty-state'
import { Input, Select } from '../components/ui/field'
import { PaginationBar } from '../components/ui/pagination-bar'
import { Skeleton } from '../components/ui/skeleton'
import { Toolbar } from '../components/ui/toolbar'
import { useAdminNotificationLogs } from '../lib/admin/use-admin-notifications'
import type { AdminNotificationLogFilters } from '../lib/admin/notifications-api'
import { errorMessage } from '../lib/api/client'
import { pluralize } from '../lib/format'

export const Route = createFileRoute('/admin/notifications/logs')({
  component: AdminNotificationLogs,
})

const STATUSES = ['pending', 'processing', 'sent', 'failed', 'cancelled'] as const

/**
 * Notification log explorer.
 *
 * Filtering is server-side (the API applies it in SQL) so the page stays fast on
 * a large ledger. Recipients arrive already masked — the console never receives
 * a raw address.
 */
function AdminNotificationLogs() {
  const [filters, setFilters] = useState<AdminNotificationLogFilters>({ page: 1, pageSize: 25 })
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [idSearch, setIdSearch] = useState('')

  const query = useAdminNotificationLogs(filters)
  const items = query.data?.items ?? []

  const patch = (next: Partial<AdminNotificationLogFilters>) =>
    setFilters((current) => ({ ...current, ...next, page: next.page ?? 1 }))

  return (
    <div className="flex flex-col gap-[1rem]">
      <Card className="p-card">
        <Toolbar>
          <Input
            aria-label="Search notification logs"
            placeholder="Search recipient, type or business"
            value={filters.search ?? ''}
            onChange={(event) => patch({ search: event.target.value || null })}
            className="max-w-[18rem]"
          />
          <Select
            aria-label="Filter by channel"
            value={filters.channel ?? ''}
            onChange={(event) => patch({ channel: event.target.value || null })}
          >
            <option value="">All channels</option>
            {NOTIFICATION_CHANNELS.map((channel) => (
              <option key={channel} value={channel}>
                {channelLabel(channel)}
              </option>
            ))}
          </Select>
          <Select
            aria-label="Filter by status"
            value={filters.status ?? ''}
            onChange={(event) => patch({ status: event.target.value || null })}
          >
            <option value="">All statuses</option>
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {humanize(status)}
              </option>
            ))}
          </Select>
          <Input
            aria-label="Search by notification id"
            placeholder="Notification id"
            value={idSearch}
            onChange={(event) => setIdSearch(event.target.value)}
            className="max-w-[16rem]"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => patch({ notificationId: idSearch.trim() || null, page: 1 })}
          >
            Find by id
          </Button>
          <Input
            type="date"
            aria-label="From date"
            value={filters.fromUtc?.slice(0, 10) ?? ''}
            onChange={(event) =>
              patch({ fromUtc: event.target.value ? `${event.target.value}T00:00:00Z` : null })
            }
          />
          <Input
            type="date"
            aria-label="To date"
            value={filters.toUtc?.slice(0, 10) ?? ''}
            onChange={(event) =>
              patch({ toUtc: event.target.value ? `${event.target.value}T23:59:59Z` : null })
            }
          />
        </Toolbar>
      </Card>

      <SectionCard
        title="Notification records"
        description={query.data ? pluralize(query.data.totalCount, 'record') : undefined}
      >
        {query.isError ? (
          <Alert tone="danger">{errorMessage(query.error, 'The notification log did not load.')}</Alert>
        ) : query.isPending ? (
          <Skeleton className="h-40 rounded-card" />
        ) : items.length === 0 ? (
          <EmptyState
            icon={<ScrollText className="size-5" />}
            title="No notification records match"
            description="Adjust the filters, or wait for the platform to send notifications."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="table w-full" aria-label="Notification log">
                <thead>
                  <tr>
                    <th scope="col">Created</th>
                    <th scope="col">Type</th>
                    <th scope="col">Channel</th>
                    <th scope="col">Recipient</th>
                    <th scope="col">Business</th>
                    <th scope="col">Status</th>
                    <th scope="col">Attempts</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <button
                          type="button"
                          onClick={() => setSelectedId(item.id)}
                          className="text-left font-semibold text-accent"
                        >
                          {formatTimestamp(item.createdAtUtc)}
                        </button>
                      </td>
                      <td>{humanize(item.notificationType)}</td>
                      <td>{channelLabel(item.channel)}</td>
                      <td className="tabular">{item.recipientMasked}</td>
                      <td>{item.businessName ?? '—'}</td>
                      <td>
                        <ClassificationBadge classification={item.classification} />
                      </td>
                      <td className="tabular">{item.attempts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <PaginationBar
              className="mt-[1rem]"
              page={query.data?.page ?? 1}
              pageCount={query.data?.totalPages ?? 1}
              onPageChange={(page) => setFilters((current) => ({ ...current, page }))}
              pageSize={filters.pageSize ?? 25}
              onPageSizeChange={(pageSize) =>
                setFilters((current) => ({ ...current, pageSize, page: 1 }))
              }
            />
          </>
        )}
      </SectionCard>

      <NotificationLogDetailDrawer notificationId={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  )
}
