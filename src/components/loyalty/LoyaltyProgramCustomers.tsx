import { useMemo, useState } from 'react'
import { RefreshCw, UsersRound } from 'lucide-react'
import { cn } from '../../lib/cn'
import { errorMessage } from '../../lib/api/client'
import { clientStampGoal, toClientSummary } from '../../lib/clients/mappers'
import { formatNumber } from '../../lib/format'
import { useDebouncedValue } from '../../lib/hooks/use-debounced-value'
import { useProgramCustomers } from '../../lib/loyalty'
import { Alert } from '../ui/alert'
import { Button } from '../ui/button'
import { ClientGrid } from '../ui/client-grid'
import { ClientTable } from '../ui/client-table'
import { EmptyState } from '../ui/empty-state'
import { PaginationBar } from '../ui/pagination-bar'
import { SearchField } from '../ui/search-field'
import { SegmentedControl } from '../ui/segmented-control'
import { Skeleton } from '../ui/skeleton'

export type LoyaltyProgramCustomersProps = {
  programId: string
  /** The roster endpoint is gated by the `customers` module. */
  enabled: boolean
  /** Open a customer's details page. */
  onOpenCustomer?: (customerId: string) => void
  className?: string
}

type Layout = 'table' | 'cards'

const PAGE_SIZE = 10

/**
 * The program's customers tab.
 *
 * The roster is the business's own customer list filtered by `programId`, so
 * every row is a real enrollment with the customer's actual stamp balance and
 * enrollment date — never a placeholder.
 *
 * The list is presented with the Clients module's own components (`ClientGrid`
 * and `ClientTable`), mapped through `toClientSummary`, so the loyalty tab looks
 * and behaves exactly like the Customers page. Tapping a row opens that
 * customer's details page — which is where the full loyalty card and ledger
 * live — rather than re-implementing a second customer view inside the tab.
 */
export function LoyaltyProgramCustomers({
  programId,
  enabled,
  onOpenCustomer,
  className,
}: LoyaltyProgramCustomersProps) {
  const [layout, setLayout] = useState<Layout>('table')
  const [searchInput, setSearchInput] = useState('')
  const search = useDebouncedValue(searchInput, 350)
  const [page, setPage] = useState(1)

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

  const customers = useMemo(
    () => rows.map((row) => toClientSummary(row, clientStampGoal(row))),
    [rows],
  )

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

  const emptyState = (
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
  )

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
      ) : (
        <>
          {layout === 'cards' ? (
            <ClientGrid
              clients={customers}
              onOpen={onOpenCustomer ? (client) => onOpenCustomer(client.id) : undefined}
              empty={emptyState}
            />
          ) : (
            <ClientTable
              rows={customers}
              onOpen={onOpenCustomer ? (client) => onOpenCustomer(client.id) : undefined}
              label="Program customers"
              empty={emptyState}
            />
          )}

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
