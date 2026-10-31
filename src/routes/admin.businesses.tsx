import { createFileRoute, Link } from '@tanstack/react-router'
import { Building2 } from 'lucide-react'
import { useState } from 'react'
import { Alert } from '../components/ui/alert'
import { Badge } from '../components/ui/badge'
import { Card } from '../components/ui/card'
import { EmptyState } from '../components/ui/empty-state'
import { PageHeader } from '../components/ui/page-header'
import { PaginationBar } from '../components/ui/pagination-bar'
import { SearchField } from '../components/ui/search-field'
import { Skeleton } from '../components/ui/skeleton'
import { useAdminBusinesses } from '../lib/admin/use-admin'
import { errorMessage } from '../lib/api/client'
import { formatNumber, pluralize } from '../lib/format'
import { useDebouncedValue } from '../lib/hooks/use-debounced-value'

export const Route = createFileRoute('/admin/businesses')({
  component: AdminBusinesses,
})

/** Every business on the platform, with its owner and roll-up counters. */
function AdminBusinesses() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const debouncedSearch = useDebouncedValue(search)

  const businesses = useAdminBusinesses({
    search: debouncedSearch.trim() || null,
    page,
    pageSize,
  })

  const rows = businesses.data?.items ?? []
  const totalPages = businesses.data?.totalPages ?? 1

  return (
    <div>
      <PageHeader
        title="Businesses"
        description="Every workspace on the platform, newest activity first."
        actions={
          <SearchField
            label="Search businesses"
            placeholder="Name, owner or email…"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(1)
            }}
            className="w-full sm:w-[18rem]"
          />
        }
      />

      {businesses.isError ? (
        <Alert tone="danger">
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
        <div className="space-y-[0.6rem]" aria-busy="true">
          <Skeleton className="h-12 rounded-card" />
          <Skeleton className="h-12 rounded-card" />
          <Skeleton className="h-12 rounded-card" />
        </div>
      ) : rows.length === 0 ? (
        <Card className="p-card">
          <EmptyState
            icon={<Building2 className="size-5" />}
            title={search ? 'No business matches that search' : 'No businesses yet'}
            description={
              search
                ? 'Try a different name, owner or email address.'
                : 'Businesses appear here as soon as owners finish onboarding.'
            }
          />
        </Card>
      ) : (
        <>
          <p className="mb-[0.5rem] text-meta text-muted">
            {pluralize(businesses.data?.totalCount ?? 0, 'business', 'businesses')}
          </p>

          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Business</th>
                  <th scope="col">Owner</th>
                  <th scope="col">Address</th>
                  <th scope="col" className="text-right">
                    Customers
                  </th>
                  <th scope="col" className="text-right">
                    Staff
                  </th>
                  <th scope="col" className="text-right">
                    Stamps
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((business) => (
                  <tr key={business.id}>
                    <td>
                      <span className="block font-semibold">{business.name}</span>
                      <span className="block text-caption text-muted">
                        {business.category}
                        {business.location ? ` · ${business.location}` : ''}
                      </span>
                    </td>
                    <td>
                      <span className="block">{business.ownerName}</span>
                      <span className="block text-caption text-muted">{business.ownerEmail}</span>
                    </td>
                    <td>
                      {business.slug ? (
                        <Link
                          to="/$slug"
                          params={{ slug: business.slug }}
                          className="link font-mono text-caption"
                        >
                          {business.slug}
                        </Link>
                      ) : (
                        <Badge tone="neutral">No address</Badge>
                      )}
                    </td>
                    <td className="text-right tabular">
                      {formatNumber(business.totalCustomers)}
                    </td>
                    <td className="text-right tabular">{formatNumber(business.totalStaff)}</td>
                    <td className="text-right tabular">{formatNumber(business.totalStamps)}</td>
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
        </>
      )}
    </div>
  )
}
