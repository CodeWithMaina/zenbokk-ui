import { createFileRoute } from '@tanstack/react-router'
import { UsersRound } from 'lucide-react'
import { useState } from 'react'
import { Alert } from '../components/ui/alert'
import { StatusPill } from '../components/ui/badge'
import { Card } from '../components/ui/card'
import { EmptyState } from '../components/ui/empty-state'
import { PageHeader } from '../components/ui/page-header'
import { PaginationBar } from '../components/ui/pagination-bar'
import { SearchField } from '../components/ui/search-field'
import { Skeleton } from '../components/ui/skeleton'
import { useAdminUsers } from '../lib/admin/use-admin'
import { errorMessage } from '../lib/api/client'
import { formatDate, pluralize } from '../lib/format'
import { useDebouncedValue } from '../lib/hooks/use-debounced-value'

export const Route = createFileRoute('/admin/users')({
  component: AdminUsers,
})

/** The role tone map — one place so the label and colour can never disagree. */
const ROLE_TONE = {
  Customer: 'info',
  Business: 'success',
  Staff: 'neutral',
  Admin: 'warning',
} as const

/** Everyone with an account on the platform, across every role. */
function AdminUsers() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const debouncedSearch = useDebouncedValue(search)

  const users = useAdminUsers({ search: debouncedSearch.trim() || null, page, pageSize })

  const rows = users.data?.items ?? []
  const totalPages = users.data?.totalPages ?? 1

  return (
    <div>
      <PageHeader
        title="People"
        description="Owners, staff, customers and administrators in one list."
        actions={
          <SearchField
            label="Search people"
            placeholder="Name or email…"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(1)
            }}
            className="w-full sm:w-[18rem]"
          />
        }
      />

      {users.isError ? (
        <Alert tone="danger">
          {errorMessage(users.error, 'We could not load the people list.')}{' '}
          <button type="button" className="link font-semibold" onClick={() => void users.refetch()}>
            Try again
          </button>
        </Alert>
      ) : users.isPending ? (
        <div className="space-y-[0.6rem]" aria-busy="true">
          <Skeleton className="h-12 rounded-card" />
          <Skeleton className="h-12 rounded-card" />
          <Skeleton className="h-12 rounded-card" />
        </div>
      ) : rows.length === 0 ? (
        <Card className="p-card">
          <EmptyState
            icon={<UsersRound className="size-5" />}
            title={search ? 'Nobody matches that search' : 'No accounts yet'}
            description={
              search ? 'Try a different name or email address.' : 'Accounts appear here as people join.'
            }
          />
        </Card>
      ) : (
        <>
          <p className="mb-[0.5rem] text-meta text-muted">
            {pluralize(users.data?.totalCount ?? 0, 'account')}
          </p>

          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Person</th>
                  <th scope="col">Role</th>
                  <th scope="col">Phone</th>
                  <th scope="col">Joined</th>
                  <th scope="col">Email</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <span className="block font-semibold">{user.fullName}</span>
                      <span className="block text-caption text-muted">{user.email}</span>
                    </td>
                    <td>
                      <StatusPill tone={ROLE_TONE[user.role]}>{user.role}</StatusPill>
                    </td>
                    <td className="text-meta text-muted">{user.phoneNumber ?? '—'}</td>
                    <td className="text-meta text-muted">{formatDate(user.createdAt)}</td>
                    <td>
                      <StatusPill tone={user.isVerified ? 'success' : 'warning'}>
                        {user.isVerified ? 'Verified' : 'Unverified'}
                      </StatusPill>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <PaginationBar
            className="mt-[1rem]"
            page={users.data?.page ?? page}
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
