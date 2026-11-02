import { useState } from 'react'
import { RefreshCw, UsersRound } from 'lucide-react'
import { cn } from '../../lib/cn'
import { errorMessage } from '../../lib/api/client'
import type { BusinessCustomer } from '../../lib/api/types'
import { clientStampGoal } from '../../lib/clients/mappers'
import { formatDate, formatNumber } from '../../lib/format'
import { useDebouncedValue } from '../../lib/hooks/use-debounced-value'
import { useProgramCustomers } from '../../lib/loyalty'
import { Alert } from '../ui/alert'
import { Avatar } from '../ui/avatar'
import { Button } from '../ui/button'
import { EmptyState } from '../ui/empty-state'
import { PaginationBar } from '../ui/pagination-bar'
import { Progress } from '../ui/progress'
import { SearchField } from '../ui/search-field'
import { SegmentedControl } from '../ui/segmented-control'
import { Skeleton } from '../ui/skeleton'
import { CustomerLoyaltyCard } from './CustomerLoyaltyCard'

export type LoyaltyProgramCustomersProps = {
  programId: string
  /** The roster endpoint is gated by the `customers` module. */
  enabled: boolean
  className?: string
}

type Layout = 'table' | 'cards'

const PAGE_SIZE = 10

/**
 * The program's customers tab.
 *
 * The roster is the business's own customer list filtered by `programId`, so
 * every row is a real enrollment with the customer's actual stamp balance and
 * enrollment date — never a placeholder. Expanding a row loads that customer's
 * rendered card from the API.
 */
export function LoyaltyProgramCustomers({
  programId,
  enabled,
  className,
}: LoyaltyProgramCustomersProps) {
  const [layout, setLayout] = useState<Layout>('table')
  const [searchInput, setSearchInput] = useState('')
  const search = useDebouncedValue(searchInput, 350)
  const [page, setPage] = useState(1)
  const [expanded, setExpanded] = useState<string | null>(null)

  const query = useProgramCustomers(
    programId,
    {
      search: search.trim() || undefined,
      page,
      pageSize: PAGE_SIZE,
      sortBy: 'recent',
      sortDirection: 'desc',
    },
    enabled,
  )

  const rows = query.data?.items ?? []
  const total = query.data?.totalCount ?? 0
  const pageCount = query.data?.totalPages ?? 1
  const searching = search.trim().length > 0

  const progress = (row: BusinessCustomer) => {
    const goal = clientStampGoal(row)
    const stamps = Math.min(Math.max(0, row.totalStamps), goal)
    return { goal, stamps }
  }

  const toggle = (customerId: string) => {
    setExpanded((current) => (current === customerId ? null : customerId))
  }

  const header = (
    <div className="mb-[0.9rem] flex flex-wrap items-center gap-[0.7rem]">
      <h3 className="flex-1 text-heading font-bold">Customers</h3>

      <div className="flex items-center gap-[0.6rem] max-[720px]:order-3 max-[720px]:basis-full">
        <SearchField
          label="Search customers"
          placeholder="Search customers"
          value={searchInput}
          onChange={(event) => {
            setSearchInput(event.target.value)
            setPage(1)
          }}
          className="min-w-0 flex-1 sm:max-w-[12rem] sm:flex-none"
        />
        <Button
          size="sm"
          onClick={() => void query.refetch()}
          disabled={query.isFetching}
          aria-label="Reload customers"
        >
          <RefreshCw
            className={cn('size-3.5', query.isFetching && 'animate-spin')}
            aria-hidden="true"
          />
          <span className="max-sm:sr-only">Reload</span>
        </Button>
      </div>

      <SegmentedControl<Layout>
        label="Customer layout"
        value={layout}
        onValueChange={setLayout}
        options={[
          { value: 'table', label: 'Table' },
          { value: 'cards', label: 'Cards' },
        ]}
        className="max-[720px]:order-2"
      />
    </div>
  )

  const expandedCard = (row: BusinessCustomer) =>
    expanded === row.userId ? (
      <div className="border-t border-line bg-sunken/60 px-[1rem] py-[1rem]">
        <CustomerLoyaltyCard customerId={row.userId} enabled />
      </div>
    ) : null

  return (
    <div className={className}>
      {header}

      {query.isPending ? (
        <div className="card overflow-hidden" aria-busy="true" aria-label="Loading customers">
          <div className="divide-y divide-line">
            {Array.from({ length: 5 }, (_, index) => (
              <div key={index} className="flex items-center gap-[0.8rem] px-[1rem] py-[0.7rem]">
                <Skeleton className="size-[2.2rem] rounded-round" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-3 w-1/3" />
                  <Skeleton className="h-2.5 w-1/2" />
                </div>
                <Skeleton className="h-3 w-[6rem]" />
              </div>
            ))}
          </div>
        </div>
      ) : query.isError ? (
        <Alert tone="danger" title="Customers could not be loaded">
          <p>{errorMessage(query.error)}</p>
          <Button size="sm" className="mt-[0.6rem]" onClick={() => void query.refetch()}>
            <RefreshCw className="size-3.5" aria-hidden="true" />
            Try again
          </Button>
        </Alert>
      ) : rows.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={searching ? undefined : <UsersRound className="size-5" />}
            title={searching ? 'No matches' : 'No customers yet'}
            description={
              searching
                ? 'Try a different name or email.'
                : 'Customers appear here once they join this program.'
            }
            action={
              searching ? (
                <Button
                  onClick={() => {
                    setSearchInput('')
                    setPage(1)
                  }}
                >
                  Clear search
                </Button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <>
          <div className="card overflow-hidden p-0">
            {layout === 'cards' ? (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,15rem),1fr))] gap-[0.7rem] p-[0.9rem]">
                {rows.map((row) => {
                  const { goal, stamps } = progress(row)
                  return (
                    <div
                      key={row.userId}
                      className="rounded-card border border-line bg-surface p-[0.95rem]"
                    >
                      <div className="flex items-center gap-[0.75rem]">
                        <Avatar name={row.fullName} size="sm" src={row.avatarUrl ?? undefined} decorative />
                        <div className="min-w-0">
                          <p className="truncate font-semibold">
                            {row.fullName || 'Unnamed customer'}
                          </p>
                          <p className="truncate text-meta text-muted">
                            {row.email || row.phoneNumber || '—'}
                          </p>
                        </div>
                      </div>
                      <Progress
                        className="mt-[0.9rem]"
                        value={stamps}
                        max={goal}
                        label={`${stamps} of ${goal} stamps`}
                      />
                      <div className="mt-[0.7rem] flex justify-between text-caption text-muted">
                        <span>Last stamp {row.lastStampAt ? formatDate(row.lastStampAt) : '—'}</span>
                        <span>{formatNumber(row.lifetimeStamps)} lifetime</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggle(row.userId)}
                        aria-expanded={expanded === row.userId}
                        className="link mt-[0.7rem] text-caption"
                      >
                        {expanded === row.userId ? 'Hide card' : 'View card'}
                      </button>
                      {expanded === row.userId ? (
                        <div className="mt-[0.7rem]">
                          <CustomerLoyaltyCard customerId={row.userId} enabled />
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            ) : (
              <ul className="m-0 list-none p-0">
                {rows.map((row) => {
                  const { goal, stamps } = progress(row)
                  return (
                    <li key={row.userId} className="border-b border-line last:border-b-0">
                      <button
                        type="button"
                        onClick={() => toggle(row.userId)}
                        aria-expanded={expanded === row.userId}
                        className="grid w-full grid-cols-[2.2rem_minmax(0,1fr)_7rem_5.2rem_4.5rem] items-center gap-[0.8rem] px-[1rem] py-[0.7rem] text-left transition-colors hover:bg-hover max-[760px]:grid-cols-[2.2rem_minmax(0,1fr)_5.8rem]"
                      >
                        <Avatar name={row.fullName} size="sm" src={row.avatarUrl ?? undefined} decorative />
                        <span className="min-w-0">
                          <span className="block truncate font-semibold">
                            {row.fullName || 'Unnamed customer'}
                          </span>
                          <span className="block truncate text-meta text-muted">
                            {row.email || row.phoneNumber || '—'}
                          </span>
                        </span>
                        <span className="min-w-0">
                          <Progress
                            value={stamps}
                            max={goal}
                            ariaLabel={`${stamps} of ${goal} stamps`}
                          />
                          <span className="mt-[0.3rem] block text-caption text-muted">
                            {stamps} of {goal}
                          </span>
                        </span>
                        <span className="text-caption text-muted max-[760px]:hidden">
                          <b className="block font-semibold text-fg">
                            {row.lastStampAt ? formatDate(row.lastStampAt) : '—'}
                          </b>
                          Last stamp
                        </span>
                        <span className="text-caption text-muted max-[760px]:hidden">
                          <b className="block font-semibold text-fg">
                            {formatNumber(row.lifetimeStamps)}
                          </b>
                          Lifetime
                        </span>
                      </button>
                      {expandedCard(row)}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <p className="mt-[0.9rem] text-center text-meta text-muted">
            Showing {rows.length} of {formatNumber(total)} customers
          </p>

          {pageCount > 1 ? (
            <div className="mt-[0.9rem]">
              <PaginationBar page={page} pageCount={pageCount} onPageChange={setPage} />
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}
