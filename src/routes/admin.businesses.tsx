import { createFileRoute, Link } from '@tanstack/react-router'
import { Ban, Building2, ShieldCheck, ShieldOff } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { BusinessStatusPill, SubscriptionStatusPill } from '../components/admin/badges'
import { ReasonDialog } from '../components/admin/reason-dialog'
import { Alert } from '../components/ui/alert'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { EmptyState } from '../components/ui/empty-state'
import { Select } from '../components/ui/field'
import { MetricGrid } from '../components/ui/metric-tile'
import { PageHeader } from '../components/ui/page-header'
import { PaginationBar } from '../components/ui/pagination-bar'
import { SearchField } from '../components/ui/search-field'
import { Skeleton } from '../components/ui/skeleton'
import { Toolbar } from '../components/ui/toolbar'
import {
  useAdminBusinessStats,
  useAdminManagedBusinesses,
  useAdminModuleCatalog,
  useAdminTiers,
  useSetBusinessStatus,
} from '../lib/admin/use-admin'
import { errorMessage } from '../lib/api/client'
import { formatDate, formatNumber, pluralize } from '../lib/format'
import { useDebouncedValue } from '../lib/hooks/use-debounced-value'

export const Route = createFileRoute('/admin/businesses')({
  component: AdminBusinesses,
})

const STATUS_OPTIONS = [
  { value: '', label: 'Any status' },
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'deactivated', label: 'Deactivated' },
] as const

const SUBSCRIPTION_OPTIONS = [
  { value: '', label: 'Any subscription' },
  { value: 'active', label: 'Active' },
  { value: 'trial', label: 'Trial' },
  { value: 'past_due', label: 'Past due' },
  { value: 'paused', label: 'Paused' },
  { value: 'canceled', label: 'Cancelled' },
  { value: 'expired', label: 'Expired' },
  { value: 'deactivated', label: 'Deactivated' },
] as const

type StatusAction = 'suspended' | 'active' | 'deactivated'

/** Every business on the platform, with the controls to manage each one. */
function AdminBusinesses() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [planKey, setPlanKey] = useState('')
  const [subscriptionStatus, setSubscriptionStatus] = useState('')
  const [moduleKey, setModuleKey] = useState('')
  const [sort, setSort] = useState('created')
  const [direction, setDirection] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [pending, setPending] = useState<{ id: string; name: string; action: StatusAction } | null>(
    null,
  )

  const debouncedSearch = useDebouncedValue(search)

  const filters = useMemo(
    () => ({
      search: debouncedSearch.trim() || null,
      status: status || null,
      planKey: planKey || null,
      subscriptionStatus: subscriptionStatus || null,
      moduleKey: moduleKey || null,
      sort,
      direction,
      page,
      pageSize,
    }),
    [debouncedSearch, status, planKey, subscriptionStatus, moduleKey, sort, direction, page, pageSize],
  )

  const stats = useAdminBusinessStats()
  const businesses = useAdminManagedBusinesses(filters)
  const tiers = useAdminTiers()
  const catalog = useAdminModuleCatalog()
  const statusAction = useSetBusinessStatus(pending?.id ?? '')
  const rows = businesses.data?.items ?? []
  const totalPages = businesses.data?.totalPages ?? 1
  const resetPage = () => setPage(1)

  const confirmStatus = (reason: string) => {
    if (!pending) return
    statusAction.mutate(
      { status: pending.action, reason },
      {
        onSuccess: () => {
          toast.success(
            pending.action === 'active'
              ? `${pending.name} reactivated.`
              : pending.action === 'suspended'
                ? `${pending.name} suspended.`
                : `${pending.name} deactivated.`,
          )
          setPending(null)
        },
        onError: (error) => toast.error(errorMessage(error)),
      },
    )
  }

  const metrics = stats.data
    ? [
        { value: formatNumber(stats.data.total), label: 'Total businesses' },
        { value: formatNumber(stats.data.active), label: 'Active' },
        { value: formatNumber(stats.data.trial), label: 'On trial' },
        { value: formatNumber(stats.data.suspended), label: 'Suspended' },
        { value: formatNumber(stats.data.deactivated), label: 'Deactivated' },
        { value: formatNumber(stats.data.activeSubscriptions), label: 'Active subscriptions' },
        { value: formatNumber(stats.data.expiredSubscriptions), label: 'Expired subscriptions' },
        { value: formatNumber(stats.data.expiringSoon), label: 'Expiring in 7 days' },
        { value: formatNumber(stats.data.noSubscription), label: 'No subscription' },
      ]
    : []

  return (
    <div>
      <PageHeader
        title="Businesses"
        description="Every workspace on the platform: discover, inspect and control."
      />

      {stats.isError ? (
        <Alert tone="danger">{errorMessage(stats.error, 'The business totals did not load.')}</Alert>
      ) : (
        <MetricGrid
          items={
            stats.isPending
              ? Array.from({ length: 9 }, (_, index) => ({
                  value: <Skeleton className="h-6 w-12" />,
                  label: `metric-${index}`,
                }))
              : metrics
          }
        />
      )}

      <Card className="mt-[1rem] p-card">
        <Toolbar>
          <SearchField
            label="Search businesses"
            placeholder="Name, address, owner or email…"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              resetPage()
            }}
            className="w-full sm:w-[20rem]"
          />
          <Select
            aria-label="Filter by business status"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value)
              resetPage()
            }}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <Select
            aria-label="Filter by subscription status"
            value={subscriptionStatus}
            onChange={(event) => {
              setSubscriptionStatus(event.target.value)
              resetPage()
            }}
          >
            {SUBSCRIPTION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <Select
            aria-label="Filter by plan"
            value={planKey}
            onChange={(event) => {
              setPlanKey(event.target.value)
              resetPage()
            }}
          >
            <option value="">Any plan</option>
            {(tiers.data ?? []).map((tier) => (
              <option key={tier.id} value={tier.key}>
                {tier.name}
              </option>
            ))}
          </Select>
          <Select
            aria-label="Filter by enabled module"
            value={moduleKey}
            onChange={(event) => {
              setModuleKey(event.target.value)
              resetPage()
            }}
          >
            <option value="">Any module</option>
            {(catalog.data?.modules ?? []).map((module) => (
              <option key={module.key} value={module.key}>
                {module.name}
              </option>
            ))}
          </Select>
          <Select
            aria-label="Sort businesses"
            value={`${sort}:${direction}`}
            onChange={(event) => {
              const [nextSort, nextDirection] = event.target.value.split(':')
              setSort(nextSort)
              setDirection(nextDirection === 'asc' ? 'asc' : 'desc')
            }}
          >
            <option value="created:desc">Newest first</option>
            <option value="created:asc">Oldest first</option>
            <option value="name:asc">Name A–Z</option>
            <option value="name:desc">Name Z–A</option>
            <option value="status:asc">Status</option>
            <option value="expiry:asc">Expiring soonest</option>
          </Select>
        </Toolbar>
      </Card>

      {businesses.isError ? (
        <Alert tone="danger" className="mt-[1rem]">
          {errorMessage(businesses.error, 'We could not load the business list.')}{' '}
          <button
            type="button"
            className="link font-semibold"
            onClick={() => void businesses.refetch()}
          >
            Try again
          </button>
        </Alert>
      ) : businesses.isPending ? (
        <div className="mt-[1rem] space-y-[0.6rem]" aria-busy="true">
          <Skeleton className="h-12 rounded-card" />
          <Skeleton className="h-12 rounded-card" />
          <Skeleton className="h-12 rounded-card" />
        </div>
      ) : rows.length === 0 ? (
        <Card className="mt-[1rem] p-card">
          <EmptyState
            icon={<Building2 className="size-5" />}
            title="No business matches those filters"
            description="Clear a filter or try a different name, owner or email address."
          />
        </Card>
      ) : (
        <div className="mt-[1rem]">
          <p className="mb-[0.5rem] text-meta text-muted">
            {pluralize(businesses.data?.totalCount ?? 0, 'business', 'businesses')}
          </p>

          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Business</th>
                  <th scope="col">Owner</th>
                  <th scope="col">Status</th>
                  <th scope="col">Subscription</th>
                  <th scope="col">Modules</th>
                  <th scope="col">Registered</th>
                  <th scope="col" className="text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((business) => (
                  <tr key={business.id}>
                    <td>
                      <Link
                        to="/admin/businesses/$businessId"
                        params={{ businessId: business.id }}
                        className="font-semibold"
                      >
                        {business.name}
                      </Link>
                      <span className="block text-caption text-muted">
                        {business.category}
                        {business.location ? ` · ${business.location}` : ''}
                      </span>
                      {business.slug ? (
                        <span className="block font-mono text-caption text-subtle">
                          {business.slug}
                        </span>
                      ) : null}
                    </td>
                    <td>
                      <span className="block">{business.ownerName}</span>
                      <span className="block text-caption text-muted">{business.ownerEmail}</span>
                    </td>
                    <td>
                      <BusinessStatusPill status={business.status} />
                    </td>
                    <td>
                      <span className="block font-medium">{business.planName ?? 'No plan'}</span>
                      <span className="mt-[0.2rem] block">
                        <SubscriptionStatusPill status={business.subscriptionStatus} />
                      </span>
                      {business.subscriptionEndsAt ? (
                        <span className="mt-[0.2rem] block text-caption text-subtle">
                          Ends {formatDate(business.subscriptionEndsAt)}
                        </span>
                      ) : null}
                    </td>
                    <td>
                      {business.enabledModules.length === 0 ? (
                        <span className="text-caption text-muted">None</span>
                      ) : (
                        <span className="flex max-w-[14rem] flex-wrap gap-[0.25rem]">
                          {business.enabledModules.slice(0, 4).map((key) => (
                            <Badge key={key} tone="neutral">
                              {key}
                            </Badge>
                          ))}
                          {business.enabledModules.length > 4 ? (
                            <Badge tone="neutral">+{business.enabledModules.length - 4}</Badge>
                          ) : null}
                        </span>
                      )}
                    </td>
                    <td className="text-meta text-muted">{formatDate(business.createdAt)}</td>
                    <td>
                      <div className="flex flex-wrap justify-end gap-[0.35rem]">
                        <Link
                          to="/admin/businesses/$businessId"
                          params={{ businessId: business.id }}
                          className="btn btn-sm"
                        >
                          View
                        </Link>
                        {business.status === 'active' ? (
                          <Button
                            size="sm"
                            onClick={() =>
                              setPending({
                                id: business.id,
                                name: business.name,
                                action: 'suspended',
                              })
                            }
                          >
                            <ShieldOff className="size-[0.85rem]" aria-hidden="true" />
                            Suspend
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() =>
                              setPending({ id: business.id, name: business.name, action: 'active' })
                            }
                          >
                            <ShieldCheck className="size-[0.85rem]" aria-hidden="true" />
                            Reactivate
                          </Button>
                        )}
                        {business.status !== 'deactivated' ? (
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() =>
                              setPending({
                                id: business.id,
                                name: business.name,
                                action: 'deactivated',
                              })
                            }
                          >
                            <Ban className="size-[0.85rem]" aria-hidden="true" />
                            Deactivate
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
            page={businesses.data?.page ?? page}
            pageCount={totalPages}
            onPageChange={setPage}
            pageSize={pageSize}
            onPageSizeChange={(size) => {
              setPageSize(size)
              setPage(1)
            }}
          />
        </div>
      )}

      <ReasonDialog
        open={pending !== null}
        tone={pending?.action === 'active' ? 'default' : 'danger'}
        title={
          pending?.action === 'active'
            ? `Reactivate ${pending?.name}?`
            : pending?.action === 'suspended'
              ? `Suspend ${pending?.name}?`
              : `Deactivate ${pending?.name}?`
        }
        description={
          pending?.action === 'active'
            ? 'Access is restored immediately, subject to the subscription and module entitlements.'
            : pending?.action === 'suspended'
              ? 'The business keeps every row of data; access is withheld until it is reactivated.'
              : 'The business keeps every row of data and can be reactivated later. This is not a deletion.'
        }
        icon={
          pending?.action === 'active' ? (
            <ShieldCheck className="size-5" />
          ) : pending?.action === 'suspended' ? (
            <ShieldOff className="size-5" />
          ) : (
            <Ban className="size-5" />
          )
        }
        confirmLabel={
          pending?.action === 'active'
            ? 'Reactivate'
            : pending?.action === 'suspended'
              ? 'Suspend'
              : 'Deactivate'
        }
        requireReason={pending?.action !== 'active'}
        busy={statusAction.isPending}
        onConfirm={confirmStatus}
        onCancel={() => setPending(null)}
      />
    </div>
  )
}
