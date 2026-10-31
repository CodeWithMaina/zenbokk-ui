import { useState } from 'react'
import { CalendarDays, RefreshCw } from 'lucide-react'
import { Alert } from '../ui/alert'
import { AppointmentCard } from '../ui/appointment-card'
import { Button } from '../ui/button'
import { Chip, ChipGroup } from '../ui/chip'
import { EmptyState } from '../ui/empty-state'
import { PaginationBar } from '../ui/pagination-bar'
import { Skeleton } from '../ui/skeleton'
import { ClientAppointmentPayment } from './ClientAppointmentPayment'
import { errorMessage } from '../../lib/api/client'
import type { AppointmentDashboardItem, ServiceDashboardItem } from '../../lib/api/types'
import {
  APPOINTMENT_STATUSES,
  appointmentStatusLabel,
  appointmentStatusTone,
} from '../../lib/dashboard/appointment-status'
import { useOwnerAppointments } from '../../lib/dashboard/use-owner-dashboard'
import { formatTimeRange } from '../../lib/format'

export type ClientAppointmentsTabProps = {
  customerId: string
  enabled: boolean
  /** Payments module access, so a row only offers payment when it can load. */
  paymentsEnabled: boolean
}

type StatusFilter = 'all' | (typeof APPOINTMENT_STATUSES)[number]

const DAY_FORMAT = new Intl.DateTimeFormat('en-GB', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

function longDay(iso: string): string {
  return DAY_FORMAT.format(new Date(iso))
}

function dayNumber(iso: string): string {
  return String(new Date(iso).getDate())
}

function monthShort(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { month: 'short' })
}

function toAppointmentCard(
  appointment: AppointmentDashboardItem,
  services: Map<string, ServiceDashboardItem>,
) {
  const service = services.get(appointment.serviceId)

  return {
    id: appointment.id,
    day: dayNumber(appointment.scheduledAt),
    month: monthShort(appointment.scheduledAt),
    weekday: longDay(appointment.scheduledAt),
    time: formatTimeRange(appointment.scheduledAt, appointment.endAt),
    status: appointment.status,
    statusLabel: appointmentStatusLabel(appointment.status),
    statusTone: appointmentStatusTone(appointment.status),
    staff: appointment.staffName ? `With ${appointment.staffName}` : 'No staff assigned',
    services: [
      {
        name: appointment.serviceName,
        duration: service?.durationMinutes,
        price: service?.price,
      },
    ],
  }
}

/**
 * Appointment history for one client, read from
 * `GET /v1/businesses/me/appointments?customerId=…` so status filtering and
 * pagination stay server-side. The same payload carries the business's service
 * bucket, which supplies each row's duration and price.
 */
export function ClientAppointmentsTab({
  customerId,
  enabled,
  paymentsEnabled,
}: ClientAppointmentsTabProps) {
  const [status, setStatus] = useState<StatusFilter>('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const query = useOwnerAppointments(
    {
      customerId,
      status: status === 'all' ? null : status,
      page,
      pageSize,
      sortBy: 'scheduledAt',
      sortDirection: 'desc',
    },
    enabled,
  )

  const data = query.data
  const rows = data?.appointments ?? []
  const services = new Map<string, ServiceDashboardItem>(
    (data?.services ?? []).map((service) => [service.id, service]),
  )

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
          onPressedChange={() => {
            setStatus('all')
            setPage(1)
          }}
          className="shrink-0"
        >
          All
        </Chip>
        {APPOINTMENT_STATUSES.map((value) => (
          <Chip
            key={value}
            pressed={status === value}
            onPressedChange={() => {
              setStatus(value)
              setPage(1)
            }}
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
        <ul className="m-0 flex list-none flex-col gap-[0.7rem] p-0">
          {rows.map((appointment) => (
            <li key={appointment.id}>
              <AppointmentCard appointment={toAppointmentCard(appointment, services)} />
              <ClientAppointmentPayment
                appointmentId={appointment.id}
                enabled={paymentsEnabled}
              />
            </li>
          ))}
        </ul>
      )}

      {data && data.meta.totalPages > 1 ? (
        <PaginationBar
          page={data.meta.page}
          pageCount={data.meta.totalPages}
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
