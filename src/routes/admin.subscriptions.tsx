import { createFileRoute, Link } from '@tanstack/react-router'
import { CreditCard, Pause, Play, RotateCcw, XCircle } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { SubscriptionStatusPill } from '../components/admin/badges'
import { ReasonDialog } from '../components/admin/reason-dialog'
import { Alert } from '../components/ui/alert'
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
  useAdminSubscriptionStats,
  useAdminSubscriptions,
  useAdminTiers,
  useSubscriptionAction,
} from '../lib/admin/use-admin'
import { errorMessage } from '../lib/api/client'
import { formatDate, formatNumber, money, pluralize } from '../lib/format'
import { useDebouncedValue } from '../lib/hooks/use-debounced-value'

export const Route = createFileRoute('/admin/subscriptions')({
  component: AdminSubscriptions,
})

const STATUS_OPTIONS = [
  { value: '', label: 'Any status' },
  { value: 'active', label: 'Active' },
  { value: 'trial', label: 'Trial' },
  { value: 'past_due', label: 'Past due' },
  { value: 'paused', label: 'Paused' },
  { value: 'canceled', label: 'Cancelled' },
  { value: 'expired', label: 'Expired' },
  { value: 'deactivated', label: 'Deactivated' },
] as const

type Action = 'pause' | 'resume' | 'cancel' | 'reactivate' | 'deactivate'

/** Every business subscription, with the controls to manage each one. */
function AdminSubscriptions() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [planKey, setPlanKey] = useState('')
  const [billingInterval, setBillingInterval] = useState('')
  const [sort, setSort] = useState('created')
  const [direction, setDirection] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [pending, setPending] = useState<{ id: string; name: string; action: Action } | null>(null)

  const debouncedSearch = useDebouncedValue(search)

  const filters = useMemo(
    () => ({
      search: debouncedSearch.trim() || null,
      status: status || null,
      planKey: planKey || null,
      billingInterval: billingInterval || null,
      sort,
      direction,
      page,
      pageSize,
    }),
    [debouncedSearch, status, planKey, billingInterval, sort, direction, page, pageSize],
  )

  const stats = useAdminSubscriptionStats()
  const subscriptions = useAdminSubscriptions(filters)
  const tiers = useAdminTiers()
  const action = useSubscriptionAction(pending?.id ?? '')

  const rows = subscriptions.data?.items ?? []
  const resetPage = () => setPage(1)

  const confirmAction = (reason: string) => {
    if (!pending) return
    action.mutate(
      { action: pending.action, reason },
      {
        onSuccess: (result) => {
          toast.success(result.message)
          setPending(null)
        },
        onError: (error) => toast.error(errorMessage(error)),
      },
    )
  }

  const metrics = stats.data
    ? [
        { value: formatNumber(stats.data.total), label: 'Subscriptions' },
        { value: formatNumber(stats.data.active), label: 'Active' },
        { value: formatNumber(stats.data.trial), label: 'Trial' },
        { value: formatNumber(stats.data.paused), label: 'Paused' },
        { value: formatNumber(stats.data.pastDue), label: 'Past due' },
        { value: formatNumber(stats.data.canceled), label: 'Cancelled' },
        { value: formatNumber(stats.data.expired), label: 'Expired' },
        { value: formatNumber(stats.data.renewingIn7Days), label: 'Renewing in 7 days' },
        { value: money(Number(stats.data.monthlyRecurringRevenue)), label: 'MRR' },
        { value: money(Number(stats.data.annualRecurringRevenue)), label: 'ARR' },
      ]
    : []

  return (
    <div>
      <PageHeader
        title="Subscriptions"
        description="Every business subscription: plans, periods, lifecycle and revenue."
      />

      {stats.isError ? (
        <Alert tone="danger">
          {errorMessage(stats.error, 'The subscription totals did not load.')}
        </Alert>
      ) : (
        <MetricGrid
          items={
            stats.isPending
              ? Array.from({ length: 10 }, (_, index) => ({
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
            label="Search subscriptions"
            placeholder="Business or plan…"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              resetPage()
            }}
            className="w-full sm:w-[18rem]"
          />
          <Select
            aria-label="Filter by subscription status"
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
            aria-label="Filter by billing interval"
            value={billingInterval}
            onChange={(event) => {
              setBillingInterval(event.target.value)
              resetPage()
            }}
          >
            <option value="">Any interval</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </Select>
          <Select
            aria-label="Sort subscriptions"
            value={`${sort}:${direction}`}
            onChange={(event) => {
              const [nextSort, nextDirection] = event.target.value.split(':')
              setSort(nextSort)
              setDirection(nextDirection === 'asc' ? 'asc' : 'desc')
            }}
          >
            <option value="created:desc">Newest first</option>
            <option value="business:asc">Business A–Z</option>
            <option value="status:asc">Status</option>
            <option value="expiry:asc">Ending soonest</option>
          </Select>
        </Toolbar>
      </Card>

      {subscriptions.isError ? (
        <Alert tone="danger" className="mt-[1rem]">
          {errorMessage(subscriptions.error, 'We could not load the subscription list.')}{' '}
          <button
            type="button"
            className="link font-semibold"
            onClick={() => void subscriptions.refetch()}
          >
            Try again
          </button>
        </Alert>
      ) : subscriptions.isPending ? (
        <div className="mt-[1rem] space-y-[0.6rem]" aria-busy="true">
          <Skeleton className="h-12 rounded-card" />
          <Skeleton className="h-12 rounded-card" />
          <Skeleton className="h-12 rounded-card" />
        </div>
      ) : rows.length === 0 ? (
        <Card className="mt-[1rem] p-card">
          <EmptyState
            icon={<CreditCard className="size-5" />}
            title="No subscription matches those filters"
            description="Clear a filter or try a different business name."
          />
        </Card>
      ) : (
        <div className="mt-[1rem]">
          <p className="mb-[0.5rem] text-meta text-muted">
            {pluralize(subscriptions.data?.totalCount ?? 0, 'subscription')}
          </p>

          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Business</th>
                  <th scope="col">Plan</th>
                  <th scope="col">Status</th>
                  <th scope="col">Started</th>
                  <th scope="col">Ends</th>
                  <th scope="col" className="text-right">
                    Modules
                  </th>
                  <th scope="col" className="text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.subscriptionId}>
                    <td>
                      <Link
                        to="/admin/subscriptions/$businessId"
                        params={{ businessId: row.businessId }}
                        className="font-semibold"
                      >
                        {row.businessName}
                      </Link>
                      <span className="block font-mono text-caption text-subtle">
                        {row.subscriptionId}
                      </span>
                    </td>
                    <td>
                      <span className="block font-medium">{row.planName}</span>
                      <span className="block text-caption text-muted">
                        {money(Number(row.price))} / {row.billingInterval}
                      </span>
                    </td>
                    <td>
                      <SubscriptionStatusPill status={row.status} />
                    </td>
                    <td className="text-meta text-muted">
                      {row.startsAt ? formatDate(row.startsAt) : '—'}
                    </td>
                    <td className="text-meta text-muted">
                      {row.endsAt ? formatDate(row.endsAt) : 'No fixed end'}
                    </td>
                    <td className="text-right tabular">{formatNumber(row.enabledModuleCount)}</td>
                    <td>
                      <div className="flex flex-wrap justify-end gap-[0.35rem]">
                        <Link
                          to="/admin/subscriptions/$businessId"
                          params={{ businessId: row.businessId }}
                          className="btn btn-sm"
                        >
                          View
                        </Link>
                        {row.status === 'paused' ? (
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() =>
                              setPending({
                                id: row.businessId,
                                name: row.businessName,
                                action: 'resume',
                              })
                            }
                          >
                            <Play className="size-[0.85rem]" aria-hidden="true" />
                            Resume
                          </Button>
                        ) : row.status === 'active' ||
                          row.status === 'trial' ||
                          row.status === 'past_due' ? (
                          <Button
                            size="sm"
                            onClick={() =>
                              setPending({
                                id: row.businessId,
                                name: row.businessName,
                                action: 'pause',
                              })
                            }
                          >
                            <Pause className="size-[0.85rem]" aria-hidden="true" />
                            Pause
                          </Button>
                        ) : null}
                        {row.status === 'canceled' ||
                        row.status === 'expired' ||
                        row.status === 'deactivated' ? (
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() =>
                              setPending({
                                id: row.businessId,
                                name: row.businessName,
                                action: 'reactivate',
                              })
                            }
                          >
                            <RotateCcw className="size-[0.85rem]" aria-hidden="true" />
                            Reactivate
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() =>
                              setPending({
                                id: row.businessId,
                                name: row.businessName,
                                action: 'cancel',
                              })
                            }
                          >
                            <XCircle className="size-[0.85rem]" aria-hidden="true" />
                            Cancel
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <PaginationBar
            className="mt-[1rem]"
            page={subscriptions.data?.page ?? page}
            pageCount={subscriptions.data?.totalPages ?? 1}
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
        tone={
          pending?.action === 'resume' || pending?.action === 'reactivate' ? 'default' : 'danger'
        }
        title={`${
          pending?.action === 'pause'
            ? 'Pause'
            : pending?.action === 'resume'
              ? 'Resume'
              : pending?.action === 'cancel'
                ? 'Cancel'
                : pending?.action === 'reactivate'
                  ? 'Reactivate'
                  : 'Deactivate'
        } ${pending?.name}'s subscription?`}
        description={
          pending?.action === 'resume' || pending?.action === 'reactivate'
            ? 'Access is restored immediately, subject to the plan’s modules.'
            : 'Module access is withheld. No subscription history is deleted and the change is reversible.'
        }
        requireReason={pending?.action === 'pause' || pending?.action === 'cancel'}
        busy={action.isPending}
        onConfirm={confirmAction}
        onCancel={() => setPending(null)}
      />
    </div>
  )
}
