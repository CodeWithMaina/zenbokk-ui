import { createFileRoute } from '@tanstack/react-router'
import { RefreshCw, Users } from 'lucide-react'
import { useState } from 'react'
import { Alert } from '../components/ui/alert'
import { Badge, StatusPill } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { SectionCard } from '../components/ui/card'
import { EmptyState } from '../components/ui/empty-state'
import { Select } from '../components/ui/field'
import { MetricGrid } from '../components/ui/metric-tile'
import { PageHeader } from '../components/ui/page-header'
import { PaginationBar } from '../components/ui/pagination-bar'
import { SearchField } from '../components/ui/search-field'
import { Skeleton } from '../components/ui/skeleton'
import { Toolbar } from '../components/ui/toolbar'
import { errorMessage } from '../lib/api/client'
import { useOwnerConsole } from '../lib/dashboard/console-context'
import { useCustomerOverview, useOwnerCustomers } from '../lib/dashboard/use-owner-dashboard'
import { MODULE } from '../lib/entitlements'
import { formatDate, formatNumber, getInitials, pluralize } from '../lib/format'

export const Route = createFileRoute('/dashboard/customers')({
  component: CustomersPage,
})

const STATUS_OPTIONS = [
  { value: '', label: 'All customers' },
  { value: 'enrolled', label: 'Enrolled' },
  { value: 'left', label: 'Left' },
  { value: 'blocked', label: 'Blocked' },
] as const

function statusTone(status: string) {
  if (status === 'blocked') return 'danger' as const
  if (status === 'left') return 'neutral' as const
  return 'success' as const
}

function CustomersPage() {
  const { hasModule } = useOwnerConsole()
  const enabled = hasModule(MODULE.customers)

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  const customers = useOwnerCustomers(
    { search: search || null, status: status || null, page, pageSize },
    enabled,
  )
  const overview = useCustomerOverview(enabled)

  const rows = customers.data?.items ?? []
  const summary = overview.data
  const filtered = Boolean(search || status)

  return (
    <div>
      <PageHeader
        title="Customers"
        description="Everyone enrolled in your loyalty programme."
        actions={
          enabled ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void customers.refetch()}
              disabled={customers.isFetching}
            >
              <RefreshCw className="size-3.5" aria-hidden="true" />
              Refresh
            </Button>
          ) : null
        }
      />

      {!enabled ? (
        <Alert tone="info" title="Customer tools aren’t in this plan">
          The customers module unlocks the enrolled member list, stamp history and engagement
          insights. Add it from settings to see who’s coming back.
        </Alert>
      ) : (
        <>
          {summary ? (
            <MetricGrid
              className="mb-4"
              items={[
                { value: formatNumber(summary.totalCustomers), label: 'Total customers' },
                { value: formatNumber(summary.newThisWeek), label: 'New this week' },
                { value: formatNumber(summary.active7d), label: 'Active in 7 days' },
                { value: formatNumber(summary.rewardReady), label: 'Reward ready' },
                { value: formatNumber(summary.atRisk), label: 'At risk' },
              ]}
            />
          ) : null}

          <SectionCard contentClassName="space-y-3">
            <Toolbar>
              <SearchField
                placeholder="Search name or email"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value)
                  setPage(1)
                }}
                className="min-w-[15rem] flex-1"
              />
              <Select
                aria-label="Filter by status"
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value)
                  setPage(1)
                }}
                className="w-auto"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
              {filtered ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearch('')
                    setStatus('')
                    setPage(1)
                  }}
                >
                  Clear
                </Button>
              ) : null}
            </Toolbar>

            {customers.isError ? (
              <Alert tone="danger" title="Couldn’t load customers">
                {errorMessage(customers.error)}
              </Alert>
            ) : customers.isPending ? (
              <div className="space-y-2" aria-busy="true">
                <Skeleton className="h-14 rounded-md" />
                <Skeleton className="h-14 rounded-md" />
                <Skeleton className="h-14 rounded-md" />
              </div>
            ) : rows.length === 0 ? (
              <EmptyState
                icon={<Users className="size-5" />}
                title={filtered ? 'No customers match those filters' : 'No customers yet'}
                description={
                  filtered
                    ? 'Try a different search term or status.'
                    : 'Customers appear here as soon as they join your loyalty programme from the storefront.'
                }
                action={
                  filtered ? (
                    <Button
                      onClick={() => {
                        setSearch('')
                        setStatus('')
                        setPage(1)
                      }}
                    >
                      Clear filters
                    </Button>
                  ) : null
                }
              />
            ) : (
              <ul className="m-0 list-none divide-y divide-line p-0">
                {rows.map((customer) => (
                  <li
                    key={customer.userId}
                    className="flex flex-wrap items-center justify-between gap-3 py-[0.7rem] first:pt-0 last:pb-0"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className="grid size-9 shrink-0 place-items-center rounded-round bg-sunken text-caption font-semibold text-muted"
                        aria-hidden="true"
                      >
                        {getInitials(customer.fullName)}
                      </span>
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-center gap-2 text-label font-semibold">
                          {customer.fullName}
                          <StatusPill tone={statusTone(customer.enrollmentStatus)}>
                            {customer.enrollmentStatus}
                          </StatusPill>
                        </p>
                        <p className="truncate text-caption text-muted">
                          {customer.email}
                          {customer.phoneNumber ? ` · ${customer.phoneNumber}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="info">{pluralize(customer.totalStamps, 'stamp')}</Badge>
                      <Badge tone="neutral">{formatNumber(customer.lifetimeStamps)} lifetime</Badge>
                      {customer.totalRedemptions > 0 ? (
                        <Badge tone="success">
                          {pluralize(customer.totalRedemptions, 'reward')} claimed
                        </Badge>
                      ) : null}
                      <span className="text-caption text-muted">
                        Joined {formatDate(customer.enrolledAt)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {customers.data && customers.data.totalPages > 1 ? (
              <PaginationBar
                page={customers.data.page}
                pageCount={customers.data.totalPages}
                onPageChange={setPage}
                pageSize={pageSize}
                pageSizeOptions={[10, 25, 50]}
                onPageSizeChange={(size) => {
                  setPageSize(size)
                  setPage(1)
                }}
              />
            ) : null}
          </SectionCard>
        </>
      )}
    </div>
  )
}
