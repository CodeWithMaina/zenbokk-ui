import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { StaffAppointmentList } from '../components/staff/StaffAppointmentList'
import { Alert } from '../components/ui/alert'
import { SectionCard } from '../components/ui/card'
import { PageHeader } from '../components/ui/page-header'
import { PaginationBar } from '../components/ui/pagination-bar'
import { SearchField } from '../components/ui/search-field'
import { SegmentedControl } from '../components/ui/segmented-control'
import { Skeleton } from '../components/ui/skeleton'
import { errorMessage } from '../lib/api/client'
import { APPOINTMENT_STATUSES, appointmentStatusLabel } from '../lib/dashboard/appointment-status'
import { useDebouncedValue } from '../lib/hooks/use-debounced-value'
import { useStaffConsoleAppointments } from '../lib/staff/use-staff'

export const Route = createFileRoute('/staff/appointments')({
  component: StaffAppointments,
})

const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  ...APPOINTMENT_STATUSES.map((status) => ({
    value: status,
    label: appointmentStatusLabel(status),
  })),
] as const

type StatusFilter = (typeof STATUS_FILTERS)[number]['value']

/** Every booking the staff member can act on, filterable by status and search. */
function StaffAppointments() {
  const [status, setStatus] = useState<StatusFilter>('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const debouncedSearch = useDebouncedValue(search)

  const appointments = useStaffConsoleAppointments({
    status: status === 'all' ? null : status,
    search: debouncedSearch.trim() || null,
    sort: 'scheduledAt',
    page,
    pageSize,
  })

  const rows = appointments.data?.items ?? []
  const totalPages = appointments.data?.totalPages ?? 1

  return (
    <div>
      <PageHeader
        title="Appointments"
        description="Bookings assigned to you, with the actions your role allows."
      />

      <div className="mb-[1rem] flex flex-wrap items-center gap-[0.6rem]">
        <SegmentedControl
          label="Filter by status"
          value={status}
          options={STATUS_FILTERS.map((filter) => ({ value: filter.value, label: filter.label }))}
          onValueChange={(next) => {
            setStatus(next)
            setPage(1)
          }}
        />
        <SearchField
          label="Search appointments"
          placeholder="Customer or service…"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value)
            setPage(1)
          }}
          className="w-full sm:ml-auto sm:w-[18rem]"
        />
      </div>

      <SectionCard>
        {appointments.isError ? (
          <Alert tone="danger">
            {errorMessage(appointments.error, 'We could not load the appointment list.')}{' '}
            <button
              type="button"
              className="link font-semibold"
              onClick={() => void appointments.refetch()}
            >
              Try again
            </button>
          </Alert>
        ) : appointments.isPending ? (
          <div className="space-y-2" aria-busy="true">
            <Skeleton className="h-14 rounded-md" />
            <Skeleton className="h-14 rounded-md" />
            <Skeleton className="h-14 rounded-md" />
          </div>
        ) : (
          <StaffAppointmentList
            appointments={rows}
            emptyTitle={status === 'all' ? 'No appointments yet' : 'Nothing with that status'}
            emptyDescription={
              status === 'all'
                ? 'Bookings appear here as customers reserve time with you.'
                : 'Try another status filter.'
            }
          />
        )}

        {rows.length > 0 ? (
          <PaginationBar
            className="mt-[1rem]"
            page={appointments.data?.page ?? page}
            pageCount={totalPages}
            onPageChange={setPage}
            pageSize={pageSize}
            onPageSizeChange={(size) => {
              setPageSize(size)
              setPage(1)
            }}
          />
        ) : null}
      </SectionCard>
    </div>
  )
}
