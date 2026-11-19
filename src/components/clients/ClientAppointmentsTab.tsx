import { useState } from 'react'
import { CalendarDays, RefreshCw } from 'lucide-react'
import { Alert } from '../ui/alert'
import { Button } from '../ui/button'
import { Chip, ChipGroup } from '../ui/chip'
import { EmptyState } from '../ui/empty-state'
import { Skeleton } from '../ui/skeleton'
import { ClientAppointmentTimeline } from './ClientAppointmentTimeline'
import { errorMessage } from '../../lib/api/client'
import type {
  AppointmentDashboard,
  ServiceCatalogItem,
  ServiceDashboardItem,
} from '../../lib/api/types'
import {
  APPOINTMENT_STATUSES,
  appointmentStatusLabel,
} from '../../lib/dashboard/appointment-status'
import { useClientAppointmentTimeline } from '../../lib/clients/use-clients'
import { useOwnerServices } from '../../lib/dashboard/use-owner-dashboard'

export type ClientAppointmentsTabProps = {
  customerId: string
  enabled: boolean
  /** Payments module access, so a row only offers payment when it can load. */
  paymentsEnabled: boolean
  /** Open an appointment's details page. */
  onOpenAppointment?: (appointmentId: string) => void
}

type StatusFilter = 'all' | (typeof APPOINTMENT_STATUSES)[number]

/** How many appointments arrive per page; "load earlier" appends the next block. */
const TIMELINE_PAGE_SIZE = 12

/**
 * Appointment history for one client, read from
 * `GET /v1/businesses/me/appointments?customerId=…`.
 *
 * The history is a date-grouped timeline (newest first, newest day at the top) that
 * grows a page at a time, so a long-standing client does not download their whole
 * record to look at the last visit. Status filtering is server-side, and every row
 * opens the real appointment details page by its own id.
 */
export function ClientAppointmentsTab({
  customerId,
  enabled,
  paymentsEnabled,
  onOpenAppointment,
}: ClientAppointmentsTabProps) {
  const [status, setStatus] = useState<StatusFilter>('all')

  const query = useClientAppointmentTimeline(
    customerId,
    {
      status: status === 'all' ? null : status,
      pageSize: TIMELINE_PAGE_SIZE,
    },
    enabled,
  )

  const services = useOwnerServices(enabled)
  const serviceMap = new Map<string, ServiceDashboardItem>(
    (services.data ?? []).map(
      (service: ServiceCatalogItem) => [service.id, service] as const,
    ),
  )

  const rows = query.data?.pages.flatMap((page: AppointmentDashboard) => page.appointments) ?? []
  const total = query.data?.pages[0]?.meta.totalCount ?? 0

  if (!enabled) {
    return (
      <Alert tone="info" title="Appointments aren’t in this plan">
        The appointments module unlocks booking history, services and staff
        assignment for each client.
      </Alert>
    )
  }

  if (query.isPending) {
    return (
      <div
        className="flex flex-col gap-[0.7rem]"
        aria-busy="true"
        aria-label="Loading appointments"
      >
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-[6rem] rounded-card" />
        ))}
      </div>
    )
  }

  if (query.isError) {
    return (
      <Alert tone="danger" title="Appointments could not be loaded">
        <p>{errorMessage(query.error)}</p>
        <Button size="sm" className="mt-[0.6rem]" onClick={() => void query.refetch()}>
          <RefreshCw className="size-3.5" aria-hidden="true" />
          Try again
        </Button>
      </Alert>
    )
  }

  return (
    <div className="flex flex-col gap-[0.9rem]">
      <ChipGroup
        label="Appointment status"
        className="flex-nowrap overflow-x-auto pb-[0.2rem] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <Chip
          pressed={status === 'all'}
          onPressedChange={() => setStatus('all')}
          className="shrink-0"
        >
          All
        </Chip>
        {APPOINTMENT_STATUSES.map((value) => (
          <Chip
            key={value}
            pressed={status === value}
            onPressedChange={() => setStatus(value)}
            className="shrink-0"
          >
            {appointmentStatusLabel(value)}
          </Chip>
        ))}
      </ChipGroup>

      {rows.length === 0 ? (
        <EmptyState
          icon={<CalendarDays className="size-5" />}
          title={
            status === 'all'
              ? 'No appointments yet'
              : 'No appointments with that status'
          }
          description={
            status === 'all'
              ? 'Book this client in and their visit history builds up here.'
              : 'Try another status to see this client’s other visits.'
          }
        />
      ) : (
        <>
          <p className="text-caption text-muted tabular">
            {rows.length} of {total} appointment{total === 1 ? '' : 's'} · newest first
          </p>
          <ClientAppointmentTimeline
            rows={rows}
            services={serviceMap}
            onOpenAppointment={onOpenAppointment}
            paymentsEnabled={paymentsEnabled}
            hasMore={query.hasNextPage}
            loadingMore={query.isFetchingNextPage}
            onLoadMore={() => void query.fetchNextPage()}
          />
        </>
      )}
    </div>
  )
}
