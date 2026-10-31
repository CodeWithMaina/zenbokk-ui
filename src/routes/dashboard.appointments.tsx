import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { CalendarClock, Check, Plus, TriangleAlert, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Alert } from '../components/ui/alert'
import { StatusPill } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { SectionCard } from '../components/ui/card'
import { ConfirmDialog } from '../components/ui/confirm-dialog'
import { EmptyState } from '../components/ui/empty-state'
import { Input, Select } from '../components/ui/field'
import { PageHeader } from '../components/ui/page-header'
import { PaginationBar } from '../components/ui/pagination-bar'
import { SearchField } from '../components/ui/search-field'
import { Skeleton } from '../components/ui/skeleton'
import { Tabs } from '../components/ui/tabs'
import { Toolbar, ToolbarSpacer } from '../components/ui/toolbar'
import { errorMessage } from '../lib/api/client'
import type { AppointmentDashboardItem } from '../lib/api/types'
import { ownerApi } from '../lib/dashboard/api'
import {
  APPOINTMENT_STATUSES,
  appointmentActions,
  appointmentStatusLabel,
  appointmentStatusTone,
} from '../lib/dashboard/appointment-status'
import type { AppointmentStatus } from '../lib/dashboard/appointment-status'
import { useDashboardContext } from '../lib/dashboard/dashboard-context'
import { useOwnerAppointments } from '../lib/dashboard/use-owner-dashboard'
import { MODULE } from '../lib/entitlements'
import { formatDate, formatDay, formatTimeRange } from '../lib/format'

type StatusFilter = 'all' | AppointmentStatus
type TransitionAction = 'confirm' | 'complete' | 'no_show'

const TRANSITION_PAST_TENSE: Record<TransitionAction, string> = {
  confirm: 'confirmed',
  complete: 'completed',
  no_show: 'no-show',
}

export const Route = createFileRoute('/dashboard/appointments')({
  component: AppointmentsPage,
})

function AppointmentsPage() {
  const { hasModule } = useDashboardContext()
  const enabled = hasModule(MODULE.appointments)

  const [status, setStatus] = useState<StatusFilter>('all')
  const [search, setSearch] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [staffId, setStaffId] = useState('')
  const [serviceId, setServiceId] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [pendingCancel, setPendingCancel] = useState<AppointmentDashboardItem | null>(null)

  const query = useOwnerAppointments(
    {
      status: status === 'all' ? null : status,
      search: search || null,
      from: from ? new Date(`${from}T00:00:00`).toISOString() : null,
      to: to ? new Date(`${to}T23:59:59`).toISOString() : null,
      staffId: staffId || null,
      serviceId: serviceId || null,
      page,
      pageSize,
      sortBy: 'scheduledAt',
      sortDirection: 'asc',
    },
    enabled,
  )

  const queryClient = useQueryClient()
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['appointments'] })

  const transition = useMutation({
    mutationFn: async (input: { id: string; action: TransitionAction }) => {
      if (input.action === 'confirm') return ownerApi.confirmAppointment(input.id)
      if (input.action === 'complete') return ownerApi.completeAppointment(input.id)
      return ownerApi.markAppointmentNoShow(input.id)
    },
    onSuccess: (_, input) => {
      toast.success(`Appointment marked ${TRANSITION_PAST_TENSE[input.action]}.`)
      void invalidate()
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  const cancel = useMutation({
    mutationFn: (id: string) => ownerApi.cancelAppointment(id),
    onSuccess: () => {
      toast.success('Appointment cancelled.')
      setPendingCancel(null)
      void invalidate()
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  const data = query.data
  const filtersDirty = useMemo(
    () => Boolean(search || from || to || staffId || serviceId || status !== 'all'),
    [search, from, to, staffId, serviceId, status],
  )

  const resetFilters = () => {
    setStatus('all')
    setSearch('')
    setFrom('')
    setTo('')
    setStaffId('')
    setServiceId('')
    setPage(1)
  }

  return (
    <div>
      <PageHeader
        title="Appointments"
        description={
          data ? `${data.meta.totalCount} matching bookings` : 'Every booking across your team.'
        }
        actions={
          <Button variant="primary" size="sm" disabled title="Use the storefront to book">
            <Plus className="size-4" aria-hidden="true" />
            New booking
          </Button>
        }
      />

      {!enabled ? (
        <Alert tone="info" title="Appointments aren’t in this plan">
          Bookings are disabled for this business. Turn on the appointments module in settings to
          accept them from your storefront.
        </Alert>
      ) : (
        <>
          <SectionCard contentClassName="space-y-3">
            <Toolbar>
              <SearchField
                placeholder="Search client, service or staff"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value)
                  setPage(1)
                }}
                className="min-w-[15rem] flex-1"
              />
              <Input
                type="date"
                aria-label="From date"
                value={from}
                onChange={(event) => {
                  setFrom(event.target.value)
                  setPage(1)
                }}
                className="w-auto"
              />
              <Input
                type="date"
                aria-label="To date"
                value={to}
                onChange={(event) => {
                  setTo(event.target.value)
                  setPage(1)
                }}
                className="w-auto"
              />
              <ToolbarSpacer />
              {filtersDirty ? (
                <Button variant="ghost" size="sm" onClick={resetFilters}>
                  Clear
                </Button>
              ) : null}
            </Toolbar>

            <div className="flex flex-wrap gap-2">
              <Select
                aria-label="Filter by staff"
                value={staffId}
                onChange={(event) => {
                  setStaffId(event.target.value)
                  setPage(1)
                }}
                className="w-auto"
              >
                <option value="">All staff</option>
                {(data?.staff ?? []).map((member) => (
                  <option key={member.userId} value={member.userId}>
                    {member.fullName}
                  </option>
                ))}
              </Select>
              <Select
                aria-label="Filter by service"
                value={serviceId}
                onChange={(event) => {
                  setServiceId(event.target.value)
                  setPage(1)
                }}
                className="w-auto"
              >
                <option value="">All services</option>
                {(data?.services ?? []).map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name}
                  </option>
                ))}
              </Select>
            </div>

            <Tabs
              label="Filter by status"
              value={status}
              onValueChange={(value) => {
                setStatus(value)
                setPage(1)
              }}
              items={[
                { value: 'all', label: 'All' },
                ...APPOINTMENT_STATUSES.map((value) => ({
                  value,
                  label: appointmentStatusLabel(value),
                })),
              ]}
            />
          </SectionCard>

          <div className="mt-4">
            {query.isError ? (
              <Alert tone="danger" title="Couldn’t load appointments">
                {errorMessage(query.error)}
              </Alert>
            ) : query.isPending ? (
              <div className="space-y-2" aria-busy="true">
                <Skeleton className="h-16 rounded-card" />
                <Skeleton className="h-16 rounded-card" />
                <Skeleton className="h-16 rounded-card" />
              </div>
            ) : !data || data.appointments.length === 0 ? (
              <SectionCard>
                <EmptyState
                  icon={<CalendarClock className="size-5" />}
                  title={filtersDirty ? 'No bookings match those filters' : 'No bookings yet'}
                  description={
                    filtersDirty
                      ? 'Try a wider date range or a different status.'
                      : 'Share your storefront address — bookings will land here.'
                  }
                  action={
                    filtersDirty ? (
                      <Button variant="ghost" onClick={resetFilters}>
                        Clear filters
                      </Button>
                    ) : null
                  }
                />
              </SectionCard>
            ) : (
              <SectionCard contentClassName="p-0">
                <ul className="m-0 list-none divide-y divide-line p-0">
                  {data.appointments.map((appointment) => (
                    <li
                      key={appointment.id}
                      className="flex flex-wrap items-start justify-between gap-3 px-[1.1rem] py-[0.75rem]"
                    >
                      <div className="min-w-0">
                        <p className="text-label font-semibold">
                          {appointment.customerName}
                          <span className="font-normal text-muted">
                            {' '}
                            · {appointment.serviceName}
                          </span>
                        </p>
                        <p className="text-caption text-muted">
                          {formatDay(appointment.scheduledAt)} ·{' '}
                          {formatTimeRange(appointment.scheduledAt, appointment.endAt)}
                          {appointment.staffName ? ` · ${appointment.staffName}` : ''}
                        </p>
                        {appointment.customerPhone || appointment.customerEmail ? (
                          <p className="text-caption text-muted">
                            {appointment.customerPhone ?? appointment.customerEmail}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusPill tone={appointmentStatusTone(appointment.status)}>
                          {appointmentStatusLabel(appointment.status)}
                        </StatusPill>
                        {appointmentActions(appointment.status).map((action) => (
                          <Button
                            key={action}
                            size="sm"
                            variant={action === 'cancel' ? 'ghost' : 'default'}
                            disabled={transition.isPending || cancel.isPending}
                            onClick={() => {
                              if (action === 'cancel') {
                                setPendingCancel(appointment)
                                return
                              }
                              transition.mutate({ id: appointment.id, action })
                            }}
                          >
                            {action === 'no_show' ? (
                              <TriangleAlert className="size-3.5" aria-hidden="true" />
                            ) : action === 'cancel' ? (
                              <X className="size-3.5" aria-hidden="true" />
                            ) : (
                              <Check className="size-3.5" aria-hidden="true" />
                            )}
                            {action === 'confirm'
                              ? 'Confirm'
                              : action === 'complete'
                                ? 'Complete'
                                : action === 'no_show'
                                  ? 'No-show'
                                  : 'Cancel'}
                          </Button>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="border-t border-line px-[1.1rem] py-3">
                  <PaginationBar
                    page={data.meta.page}
                    pageCount={data.meta.totalPages}
                    onPageChange={setPage}
                    pageSize={pageSize}
                    onPageSizeChange={(size) => {
                      setPageSize(size)
                      setPage(1)
                    }}
                  />
                </div>
              </SectionCard>
            )}
          </div>
        </>
      )}

      <ConfirmDialog
        open={pendingCancel !== null}
        tone="danger"
        title="Cancel this appointment?"
        description={
          pendingCancel
            ? `${pendingCancel.customerName} · ${pendingCancel.serviceName} on ${formatDate(
                pendingCancel.scheduledAt,
              )}. The client is notified.`
            : undefined
        }
        confirmLabel={cancel.isPending ? 'Cancelling…' : 'Cancel appointment'}
        cancelLabel="Keep it"
        onConfirm={() => {
          if (pendingCancel) cancel.mutate(pendingCancel.id)
        }}
        onCancel={() => setPendingCancel(null)}
      />
    </div>
  )
}
