import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { TriangleAlert } from 'lucide-react'
import {
  ClassificationBadge,
  NOTIFICATION_CHANNELS,
  channelLabel,
  formatTimestamp,
  humanize,
} from '../components/admin/notifications/shared'
import { Alert } from '../components/ui/alert'
import { Button } from '../components/ui/button'
import { Card, SectionCard } from '../components/ui/card'
import { EmptyState } from '../components/ui/empty-state'
import { Input, Select } from '../components/ui/field'
import { PaginationBar } from '../components/ui/pagination-bar'
import { Skeleton } from '../components/ui/skeleton'
import { Toolbar } from '../components/ui/toolbar'
import {
  useAdminNotificationLogs,
  useCancelNotification,
  useRetryNotification,
} from '../lib/admin/use-admin-notifications'
import type { AdminNotificationLogFilters } from '../lib/admin/notifications-api'
import { errorMessage } from '../lib/api/client'
import { pluralize } from '../lib/format'

export const Route = createFileRoute('/admin/notifications/failures')({
  component: AdminNotificationFailures,
})

/**
 * Failed notification management.
 *
 * Retry is offered only where the server will accept it (retry-exhausted rows);
 * cancel only for rows the worker has not claimed. Permanent failures are shown
 * with their error so an operator fixes the cause rather than replaying them.
 */
function AdminNotificationFailures() {
  const [filters, setFilters] = useState<AdminNotificationLogFilters>({
    status: 'failed',
    page: 1,
    pageSize: 25,
  })

  const query = useAdminNotificationLogs(filters)
  const retry = useRetryNotification()
  const cancel = useCancelNotification()
  const items = query.data?.items ?? []

  const act = async (
    action: 'retry' | 'cancel',
    run: () => Promise<{ accepted: boolean; message: string }>,
  ) => {
    try {
      const result = await run()
      if (result.accepted) toast.success(result.message)
      else toast.error(result.message)
    } catch (error) {
      toast.error(errorMessage(error, `The ${action} could not be completed.`))
    }
  }

  return (
    <div className="flex flex-col gap-[1rem]">
      <Card className="p-card">
        <Toolbar>
          <Select
            aria-label="Filter failures by channel"
            value={filters.channel ?? ''}
            onChange={(event) =>
              setFilters((current) => ({ ...current, channel: event.target.value || null, page: 1 }))
            }
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
            value={filters.status ?? 'failed'}
            onChange={(event) =>
              setFilters((current) => ({ ...current, status: event.target.value || null, page: 1 }))
            }
          >
            <option value="failed">All failures</option>
            <option value="pending">Pending (cancellable)</option>
          </Select>
          <Input
            aria-label="Search failures"
            placeholder="Search recipient, type or business"
            value={filters.search ?? ''}
            onChange={(event) =>
              setFilters((current) => ({ ...current, search: event.target.value || null, page: 1 }))
            }
            className="max-w-[18rem]"
          />
        </Toolbar>
      </Card>

      <SectionCard
        title="Failed deliveries"
        description={
          query.data
            ? pluralize(query.data.totalCount, 'record')
            : 'Permanent failures must be fixed at the source; only retry-exhausted rows can be replayed.'
        }
      >
        {query.isError ? (
          <Alert tone="danger">{errorMessage(query.error, 'The failure list did not load.')}</Alert>
        ) : query.isPending ? (
          <Skeleton className="h-40 rounded-card" />
        ) : items.length === 0 ? (
          <EmptyState
            icon={<TriangleAlert className="size-5" />}
            title="No failures match"
            description="Nothing needs attention for the current filters."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="table w-full" aria-label="Failed notifications">
                <thead>
                  <tr>
                    <th scope="col">Updated</th>
                    <th scope="col">Type</th>
                    <th scope="col">Channel</th>
                    <th scope="col">Recipient</th>
                    <th scope="col">Business</th>
                    <th scope="col">Failure</th>
                    <th scope="col">Error</th>
                    <th scope="col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td>{formatTimestamp(item.updatedAtUtc)}</td>
                      <td>{humanize(item.notificationType)}</td>
                      <td>{channelLabel(item.channel)}</td>
                      <td className="tabular">{item.recipientMasked}</td>
                      <td>{item.businessName ?? '—'}</td>
                      <td>
                        <ClassificationBadge classification={item.classification} />
                      </td>
                      <td className="max-w-[18rem] truncate" title={item.errorSummary ?? ''}>
                        {item.errorSummary ?? '—'}
                      </td>
                      <td>
                        <div className="flex gap-[0.4rem]">
                          {item.retryEligible ? (
                            <Button
                              size="sm"
                              variant="primary"
                              disabled={retry.isPending}
                              onClick={() => void act('retry', () => retry.mutateAsync(item.id))}
                            >
                              Retry
                            </Button>
                          ) : null}
                          {item.cancellable ? (
                            <Button
                              size="sm"
                              variant="danger"
                              disabled={cancel.isPending}
                              onClick={() =>
                                void act('cancel', () =>
                                  cancel.mutateAsync({
                                    id: item.id,
                                    reason: 'Cancelled from the failures page',
                                  }),
                                )
                              }
                            >
                              Cancel
                            </Button>
                          ) : null}
                        </div>
                      </td>
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
    </div>
  )
}
