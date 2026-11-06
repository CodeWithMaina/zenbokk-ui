import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Building2 } from 'lucide-react'
import { BusinessNotificationDrawer } from '../components/admin/notifications/BusinessNotificationDrawer'
import { Alert } from '../components/ui/alert'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card, SectionCard } from '../components/ui/card'
import { EmptyState } from '../components/ui/empty-state'
import { Input } from '../components/ui/field'
import { PaginationBar } from '../components/ui/pagination-bar'
import { Skeleton } from '../components/ui/skeleton'
import { Toolbar } from '../components/ui/toolbar'
import {
  channelLabel,
  formatCount,
  formatPercent,
  formatTimestamp,
} from '../components/admin/notifications/shared'
import { useAdminNotificationBusinesses } from '../lib/admin/use-admin-notifications'
import { errorMessage } from '../lib/api/client'
import { pluralize } from '../lib/format'

export const Route = createFileRoute('/admin/notifications/businesses')({
  component: AdminNotificationBusinesses,
})

/**
 * Per-business notification management.
 *
 * Lists each business's delivery posture and opens a drawer where an
 * administrator can apply explicit, audited overrides (channel suppression,
 * template reset) that stay distinguishable from the business's own settings.
 */
function AdminNotificationBusinesses() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [selected, setSelected] = useState<string | null>(null)

  const query = useAdminNotificationBusinesses({
    search: search.trim() || null,
    page,
    pageSize,
  })

  const items = query.data?.items ?? []

  return (
    <div className="flex flex-col gap-[1rem]">
      <Card className="p-card">
        <Toolbar>
          <Input
            aria-label="Search businesses"
            placeholder="Search businesses"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(1)
            }}
            className="max-w-[20rem]"
          />
        </Toolbar>
      </Card>

      <SectionCard
        title="Businesses"
        description={
          query.data ? pluralize(query.data.totalCount, 'business', 'businesses') : undefined
        }
      >
        {query.isError ? (
          <Alert tone="danger">{errorMessage(query.error, 'The business list did not load.')}</Alert>
        ) : query.isPending ? (
          <Skeleton className="h-40 rounded-card" />
        ) : items.length === 0 ? (
          <EmptyState
            icon={<Building2 className="size-5" />}
            title="No businesses match"
            description="Try a different search term."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="table w-full" aria-label="Business notification posture">
                <thead>
                  <tr>
                    <th scope="col">Business</th>
                    <th scope="col">Total</th>
                    <th scope="col">Delivered</th>
                    <th scope="col">Failed</th>
                    <th scope="col">Pending</th>
                    <th scope="col">Success rate</th>
                    <th scope="col">Suppressed</th>
                    <th scope="col">Last activity</th>
                    <th scope="col" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((business) => (
                    <tr key={business.businessId}>
                      <td className="font-semibold">{business.businessName}</td>
                      <td className="tabular">{formatCount(business.totalNotifications)}</td>
                      <td className="tabular">{formatCount(business.sent)}</td>
                      <td className="tabular">{formatCount(business.failed)}</td>
                      <td className="tabular">{formatCount(business.pending)}</td>
                      <td className="tabular">{formatPercent(business.deliverySuccessRatePercent)}</td>
                      <td>
                        {business.deliveryDisabled ? (
                          <Badge tone="warning">All categories</Badge>
                        ) : business.channelOverrides.length === 0 ? (
                          <span className="text-caption text-muted">None</span>
                        ) : (
                          <span className="text-caption text-muted">
                            {business.channelOverrides
                              .filter((entry) => !entry.enabled)
                              .map((entry) => channelLabel(entry.channel))
                              .join(', ') || 'None'}
                          </span>
                        )}
                      </td>
                      <td>{formatTimestamp(business.lastNotificationAtUtc)}</td>
                      <td>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelected(business.businessId)}
                        >
                          Manage
                        </Button>
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
              onPageChange={setPage}
              pageSize={pageSize}
              onPageSizeChange={(size) => {
                setPageSize(size)
                setPage(1)
              }}
            />
          </>
        )}
      </SectionCard>

      <BusinessNotificationDrawer businessId={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
