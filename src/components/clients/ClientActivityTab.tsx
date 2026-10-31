import { useState } from 'react'
import { History, RefreshCw } from 'lucide-react'
import { ActivityTimeline } from '../ui/activity-timeline'
import type { ActivityEntry } from '../ui/activity-timeline'
import { Alert } from '../ui/alert'
import { Button } from '../ui/button'
import { SectionCard } from '../ui/card'
import { Note } from '../ui/note'
import { PaginationBar } from '../ui/pagination-bar'
import { Skeleton } from '../ui/skeleton'
import { errorMessage } from '../../lib/api/client'
import type { CustomerActivityItem } from '../../lib/api/types'
import { useClientActivity } from '../../lib/clients/use-clients'
import { formatDate, formatTime, money } from '../../lib/format'

export type ClientActivityTabProps = {
  customerId: string
  enabled: boolean
}

function toEntry(item: CustomerActivityItem): ActivityEntry {
  const redemption = item.activityType === 'redemption'
  const actor = item.staffName ? `by ${item.staffName}` : 'not attributed to a staff member'

  return {
    id: item.activityId,
    title: redemption
      ? 'Reward redeemed'
      : `Stamp #${item.stampNumber} added`,
    description: redemption
      ? item.rewardValue
        ? `${money(item.rewardValue)} reward · ${actor}`
        : `Reward · ${actor}`
      : actor,
    time: `${formatDate(item.timestamp)} · ${formatTime(item.timestamp)}`,
    tone: redemption ? 'success' : 'info',
  }
}

/**
 * Client activity timeline.
 *
 * The feed is `GET /v1/businesses/me/customers/{id}/activity`, which records
 * every stamp awarded and every reward redeemed for this client, with the actor
 * and the exact timestamp. Profile edits, enrolment changes and account events
 * are not part of that contract, so the panel says so rather than inventing
 * history.
 */
export function ClientActivityTab({ customerId, enabled }: ClientActivityTabProps) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const query = useClientActivity(customerId, { page, pageSize }, enabled)

  if (query.isPending) {
    return (
      <SectionCard title="Activity">
        <div className="flex flex-col gap-[1rem]" aria-busy="true" aria-label="Loading activity">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-8" />
          ))}
        </div>
      </SectionCard>
    )
  }

  if (query.isError) {
    return (
      <Alert tone="danger" title="Activity could not be loaded">
        <p>{errorMessage(query.error)}</p>
        <Button size="sm" className="mt-[0.6rem]" onClick={() => void query.refetch()}>
          <RefreshCw className="size-3.5" aria-hidden="true" />
          Try again
        </Button>
      </Alert>
    )
  }

  const data = query.data
  const entries = (data?.items ?? []).map(toEntry)

  return (
    <div className="flex flex-col gap-[0.9rem]">
      <SectionCard
        title="Activity"
        description={
          data && data.total > 0
            ? `${data.total} recorded event${data.total === 1 ? '' : 's'} for ${data.customerName}`
            : undefined
        }
        action={
          <Button
            size="sm"
            variant="ghost"
            onClick={() => void query.refetch()}
            disabled={query.isFetching}
          >
            <RefreshCw className="size-3.5" aria-hidden="true" />
            Refresh
          </Button>
        }
      >
        {entries.length === 0 ? (
          <div className="py-6 text-center">
            <History className="mx-auto size-5 text-subtle" aria-hidden="true" />
            <p className="mt-[0.5rem] font-semibold">No activity yet</p>
            <p className="mt-[0.2rem] text-meta text-muted">
              Stamps and reward redemptions appear here as they happen.
            </p>
          </div>
        ) : (
          <ActivityTimeline entries={entries} />
        )}
      </SectionCard>

      <Note>
        This feed contains the events Punched stores for a client — stamps
        awarded and rewards redeemed, with who performed them. Profile edits,
        account changes and messages are not recorded against the client record.
      </Note>

      {data && data.totalPages > 1 ? (
        <PaginationBar
          page={data.page}
          pageCount={data.totalPages}
          onPageChange={setPage}
          pageSize={pageSize}
          pageSizeOptions={[10, 25, 50]}
          onPageSizeChange={(size) => {
            setPageSize(size)
            setPage(1)
          }}
        />
      ) : null}
    </div>
  )
}
