import { createFileRoute } from '@tanstack/react-router'
import { ScrollText } from 'lucide-react'
import { useState } from 'react'
import { AuditTimeline } from '../components/admin/audit-timeline'
import { Alert } from '../components/ui/alert'
import { Card, SectionCard } from '../components/ui/card'
import { EmptyState } from '../components/ui/empty-state'
import { Select } from '../components/ui/field'
import { PageHeader } from '../components/ui/page-header'
import { PaginationBar } from '../components/ui/pagination-bar'
import { Skeleton } from '../components/ui/skeleton'
import { Toolbar } from '../components/ui/toolbar'
import { useAdminAuditLogs, useAdminTiers } from '../lib/admin/use-admin'
import { errorMessage } from '../lib/api/client'
import { pluralize } from '../lib/format'

export const Route = createFileRoute('/admin/audit')({
  component: AdminAudit,
})

/**
 * The platform-wide administrative audit feed.
 *
 * Every entry is written server-side by the mutation that performed the change:
 * tier lifecycle, business profile edits, status changes, module overrides and
 * subscription lifecycle actions. The client never fabricates an entry.
 */
function AdminAudit() {
  const [tierId, setTierId] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  const tiers = useAdminTiers()
  const audit = useAdminAuditLogs({ tierId: tierId || null, page, pageSize })

  const entries = audit.data?.items ?? []

  return (
    <div>
      <PageHeader
        title="Audit logs"
        description="Every administrative change on the platform, newest first."
      />

      <Card className="p-card">
        <Toolbar>
          <Select
            aria-label="Filter the audit feed by plan"
            value={tierId}
            onChange={(event) => {
              setTierId(event.target.value)
              setPage(1)
            }}
          >
            <option value="">All plans</option>
            {(tiers.data ?? []).map((tier) => (
              <option key={tier.id} value={tier.id}>
                {tier.name}
              </option>
            ))}
          </Select>
        </Toolbar>
      </Card>

      <SectionCard
        title="Activity"
        description={
          audit.data ? pluralize(audit.data.totalCount, 'audit entry', 'audit entries') : undefined
        }
        className="mt-[1rem]"
      >
        {audit.isError ? (
          <Alert tone="danger">{errorMessage(audit.error, 'The audit feed did not load.')}</Alert>
        ) : audit.isPending ? (
          <Skeleton className="h-40 rounded-card" />
        ) : entries.length === 0 ? (
          <EmptyState
            icon={<ScrollText className="size-5" />}
            title="No administrative activity yet"
            description="Entries appear here as plans, businesses and subscriptions are managed."
          />
        ) : (
          <>
            <AuditTimeline entries={entries} />
            <PaginationBar
              className="mt-[1rem]"
              page={audit.data?.page ?? page}
              pageCount={audit.data?.totalPages ?? 1}
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
    </div>
  )
}
