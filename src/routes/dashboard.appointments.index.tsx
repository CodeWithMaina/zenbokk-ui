import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useCallback, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  AppointmentBookingForm,
  AppointmentCalendar,
  AppointmentCalendarSkeleton,
  AppointmentCancelDialog,
  AppointmentCards,
  AppointmentEmptyState,
  AppointmentErrorState,
  AppointmentFilters,
  AppointmentSkeleton,
  AppointmentTable,
  AppointmentsHeader,
  AppointmentsToolbar,
} from '../components/appointments'
import type {
  AppointmentAction,
  BookingMode,
  BookingPrefill,
  BookingSubmission,
} from '../components/appointments'
import { ConfirmDialog } from '../components/ui/confirm-dialog'
import { errorMessage } from '../lib/api/client'
import type { AppointmentDashboard } from '../lib/api/types'
import {
  DEFAULT_APPOINTMENT_FILTERS,
  activeFilterCount,
  addDays,
  appointmentStatusLabel,
  calendarWindow,
  isClientSort,
  isSameDay,
  resolveDateWindow,
  sortAppointments,
  toAppointmentRows,
  toDateValue,
} from '../lib/appointments'
import type {
  AppointmentFilters as Filters,
  AppointmentRow,
  AppointmentView,
  CalendarMode,
} from '../lib/appointments'
import { useAppointmentMutations, useAppointmentPage, useAppointmentRange } from '../lib/appointments'
import { useDashboardContext } from '../lib/dashboard/dashboard-context'
import { MODULE } from '../lib/entitlements'
import { useDebouncedValue } from '../lib/hooks/use-debounced-value'
import { formatDay, formatNumber, pluralize } from '../lib/format'

export const Route = createFileRoute('/dashboard/appointments/')({
  component: AppointmentsPage,
})

const PAGE_SIZE_OPTIONS = [10, 25, 50] as const

/** Human label for whatever pane the calendar is showing. */
function calendarLabel(mode: CalendarMode, anchor: Date): string {
  if (mode === 'month') {
    return new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(anchor)
  }
  if (mode === 'week') {
    const { start } = calendarWindow('week', anchor)
    const end = addDays(start, 6)
    return `${formatDay(start)} – ${formatDay(end)}`
  }
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(anchor)
}

/** Label for the non-calendar views' date window. */
function windowLabel(filters: Filters): string {
  const window = resolveDateWindow(filters)
  if (!window.from || !window.to) return 'All dates'
  const from = new Date(window.from)
  const to = new Date(window.to)
  if (isSameDay(from, to)) return formatDay(from)
  return `${formatDay(from)} – ${formatDay(to)}`
}

/**
 * The Appointments module.
 *
 * One page owns the three views, the filters and every write, so the calendar,
 * the table and the cards always describe the same query. Reads are keyed under
 * `['appointments', …]`; a mutation invalidates that prefix, which is what
 * makes a refused reschedule snap back to the server's truth instead of leaving
 * a block where the browser wished it had gone.
 */
function AppointmentsPage() {
  const { business, hasModule, hasPermission } = useDashboardContext()
  const enabled = hasModule(MODULE.appointments)
  const navigate = useNavigate({ from: Route.fullPath })

  const [view, setView] = useState<AppointmentView>('calendar')
  const [mode, setMode] = useState<CalendarMode>('week')
  const [anchor, setAnchor] = useState(() => new Date())
  const [filters, setFilters] = useState<Filters>(DEFAULT_APPOINTMENT_FILTERS)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(25)
  const [selected, setSelected] = useState<Set<string>>(() => new Set())

  const [filtersOpen, setFiltersOpen] = useState(false)
  const [booking, setBooking] = useState<{
    mode: BookingMode
    prefill?: BookingPrefill
  } | null>(null)
  const [pendingCancel, setPendingCancel] = useState<AppointmentRow | null>(null)
  const [bulkCancelOpen, setBulkCancelOpen] = useState(false)

  const search = useDebouncedValue(filters.search, 300)
  const queryFilters = useMemo<Filters>(() => ({ ...filters, search }), [filters, search])

  const window = useMemo(() => calendarWindow(mode, anchor), [mode, anchor])

  const rangeQuery = useAppointmentRange(
    {
      search: queryFilters.search.trim() || null,
      status: queryFilters.status,
      staffId: queryFilters.staffId,
      serviceId: queryFilters.serviceId,
      from: window.start.toISOString(),
      to: window.end.toISOString(),
    },
    enabled && view === 'calendar',
  )

  const pageQuery = useAppointmentPage(queryFilters, page, pageSize, enabled && view !== 'calendar')

  const active = view === 'calendar' ? rangeQuery : pageQuery
  const dashboard: AppointmentDashboard | undefined = active.data

  const rows = useMemo<AppointmentRow[]>(
    () => (dashboard ? toAppointmentRows(dashboard) : []),
    [dashboard],
  )

  /** Rows in the order the list should present them. */
  const orderedRows = useMemo(
    () => (isClientSort(queryFilters.sort) ? sortAppointments(rows, queryFilters.sort) : rows),
    [rows, queryFilters.sort],
  )

  const statusCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const row of rows) counts.set(row.status, (counts.get(row.status) ?? 0) + 1)
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([status, count]) => ({ status, label: appointmentStatusLabel(status), count }))
  }, [rows])

  const todayCount = useMemo(() => {
    const now = Date.now()
    return rows.filter((row) => isSameDay(new Date(row.scheduledAt), now) && row.status !== 'cancelled')
      .length
  }, [rows])

  const reference = dashboard ?? null
  const mutations = useAppointmentMutations()
  const canBook = hasPermission('appointments.create') || hasPermission('appointments.manage')

  const mutateBusy =
    mutations.create.isPending ||
    mutations.reschedule.isPending ||
    mutations.cancel.isPending ||
    mutations.confirm.isPending ||
    mutations.complete.isPending ||
    mutations.markNoShow.isPending ||
    mutations.updateNote.isPending

  const resetPaging = useCallback(() => {
    setPage(1)
    setSelected(new Set())
  }, [])

  const onFiltersChange = useCallback(
    (next: Filters) => {
      setFilters(next)
      resetPaging()
    },
    [resetPaging],
  )

  const resetFilters = useCallback(() => {
    setFilters({ ...DEFAULT_APPOINTMENT_FILTERS })
    resetPaging()
  }, [resetPaging])

  const runTransition = useCallback(
    (action: 'confirm' | 'complete' | 'no_show', row: AppointmentRow) => {
      const mutation =
        action === 'confirm'
          ? mutations.confirm
          : action === 'complete'
            ? mutations.complete
            : mutations.markNoShow

      mutation.mutate(row.id, {
        onSuccess: () => {
          toast.success(
            action === 'confirm'
              ? `${row.customerName} confirmed.`
              : action === 'complete'
                ? `${row.customerName} marked completed.`
                : `${row.customerName} marked as a no-show.`,
          )
        },
        onError: (error) => toast.error(errorMessage(error)),
      })
    },
    [mutations.complete, mutations.confirm, mutations.markNoShow],
  )

  /** Open the drawer pre-filled for a reschedule or a rebooking. */
  const openBookingFor = useCallback((mode: BookingMode, row: AppointmentRow) => {
    setBooking({
      mode,
      prefill: {
        appointmentId: row.id,
        customerId: row.customerId,
        serviceId: row.serviceId,
        staffUserId: row.staffUserId,
        start: mode === 'rebook' ? addDays(new Date(row.scheduledAt), 7) : new Date(row.scheduledAt),
      },
    })
  }, [])

  const handleAction = useCallback(
    (action: AppointmentAction, row: AppointmentRow) => {
      switch (action) {
        case 'view':
          void navigate({
            to: '/dashboard/appointments/$appointmentId',
            params: { appointmentId: row.id },
          })
          return
        case 'confirm':
        case 'complete':
        case 'no_show':
          runTransition(action, row)
          return
        case 'reschedule':
          openBookingFor('reschedule', row)
          return
        case 'rebook':
          openBookingFor('rebook', row)
          return
        case 'cancel':
          setPendingCancel(row)
          return
      }
    },
    [navigate, openBookingFor, runTransition],
  )

  const submitBooking = useCallback(
    (submission: BookingSubmission) => {
      const scheduledAt = submission.start.toISOString()
      const note = submission.note

      const done = (message: string) => {
        setBooking(null)
        toast.success(message)
      }
      const failed = (error: unknown) => toast.error(errorMessage(error))

      if (submission.mode === 'reschedule' && submission.appointmentId) {
        mutations.reschedule.mutate(
          {
            appointmentId: submission.appointmentId,
            payload: {
              scheduledAt,
              serviceIds: [submission.serviceId],
              staffUserId: submission.staffUserId,
              note,
            },
          },
          { onSuccess: () => done('Appointment rescheduled.'), onError: failed },
        )
        return
      }

      mutations.create.mutate(
        {
          businessId: business.id,
          customerId: submission.customerId,
          serviceIds: [submission.serviceId],
          staffUserId: submission.staffUserId,
          scheduledAt,
          note,
        },
        {
          onSuccess: () =>
            done(
              submission.mode === 'rebook'
                ? 'Rebooking created.'
                : 'Booking created.',
            ),
          onError: failed,
        },
      )
    },
    [business.id, mutations.create, mutations.reschedule],
  )

  const bulkConfirm = useCallback(() => {
    const targets = orderedRows.filter((row) => selected.has(row.id) && row.status === 'booked')
    if (targets.length === 0) {
      toast.info('Select a pending appointment to confirm.')
      return
    }

    let settled = 0
    let failed = 0
    for (const row of targets) {
      mutations.confirm.mutate(row.id, {
        onSuccess: () => {
          settled += 1
          if (settled + failed === targets.length) {
            setSelected(new Set())
            if (failed === 0) toast.success(`${settled} appointment${settled === 1 ? '' : 's'} confirmed.`)
            else toast.warning(`${settled} confirmed, ${failed} could not be.`)
          }
        },
        onError: (error) => {
          failed += 1
          toast.error(`${row.customerName}: ${errorMessage(error)}`)
          if (settled + failed === targets.length) setSelected(new Set())
        },
      })
    }
  }, [mutations.confirm, orderedRows, selected])

  const bulkCancel = useCallback(() => {
    const targets = orderedRows.filter(
      (row) => selected.has(row.id) && (row.status === 'booked' || row.status === 'confirmed'),
    )
    let settled = 0
    let failed = 0
    for (const row of targets) {
      mutations.cancel.mutate(
        { appointmentId: row.id, note: 'Bulk cancel' },
        {
          onSuccess: () => {
            settled += 1
            if (settled + failed === targets.length) {
              setSelected(new Set())
              if (failed === 0) toast.success(`${settled} appointment${settled === 1 ? '' : 's'} cancelled.`)
              else toast.warning(`${settled} cancelled, ${failed} could not be.`)
            }
          },
          onError: (error) => {
            failed += 1
            toast.error(`${row.customerName}: ${errorMessage(error)}`)
            if (settled + failed === targets.length) setSelected(new Set())
          },
        },
      )
    }
  }, [mutations.cancel, orderedRows, selected])

  /** A drag on the day board. The write is the only thing that moves the block. */
  const handleReschedule = useCallback(
    (input: { appointmentId: string; start: Date; staffUserId?: string }) => {
      const row = rows.find((entry) => entry.id === input.appointmentId)
      mutations.reschedule.mutate(
        {
          appointmentId: input.appointmentId,
          payload: {
            scheduledAt: input.start.toISOString(),
            staffUserId: input.staffUserId ?? row?.staffUserId ?? null,
          },
        },
        {
          onSuccess: () =>
            toast.success(
              row
                ? `${row.customerName} moved to ${input.start.toLocaleTimeString('en-GB', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}.`
                : 'Appointment moved.',
            ),
          onError: (error) => toast.error(errorMessage(error)),
        },
      )
    },
    [mutations.reschedule, rows],
  )

  const navigateCalendar = useCallback(
    (direction: -1 | 1) => {
      setAnchor((current) =>
        mode === 'month'
          ? new Date(current.getFullYear(), current.getMonth() + direction, 1)
          : addDays(current, direction * (mode === 'week' ? 7 : 1)),
      )
    },
    [mode],
  )

  if (!enabled) {
    return (
      <div className="card">
        <AppointmentEmptyState filtered={false} />
      </div>
    )
  }

  const busy = active.isFetching
  const showEmpty = !active.isLoading && !active.isError && orderedRows.length === 0
  const filtered =
    Boolean(queryFilters.search.trim()) ||
    activeFilterCount(queryFilters) > 0

  return (
    <div>
      <AppointmentsHeader
        view={view}
        onViewChange={(next) => {
          setView(next)
          resetPaging()
        }}
        todayCount={todayCount}
        onNewBooking={() => setBooking({ mode: 'new' })}
        canBook={canBook}
        busy={mutateBusy}
      />

      <AppointmentsToolbar
        search={filters.search}
        onSearchChange={(value) => onFiltersChange({ ...filters, search: value })}
        filterCount={activeFilterCount(filters)}
        onOpenFilters={() => setFiltersOpen(true)}
        navigation={
          view === 'calendar'
            ? {
                label: calendarLabel(mode, anchor),
                onPrevious: () => navigateCalendar(-1),
                onNext: () => navigateCalendar(1),
                onToday: () => {
                  setAnchor(new Date())
                  setMode((current) => (current === 'month' ? 'month' : 'week'))
                },
              }
            : undefined
        }
        summary={
          view === 'calendar'
            ? `${pluralize(orderedRows.length, 'appointment')} · ${calendarLabel(mode, anchor)}`
            : `${formatNumber(pageQuery.data?.meta.totalCount ?? 0)} appointments · ${windowLabel(
                queryFilters,
              )}`
        }
        statusCounts={statusCounts}
        busy={busy}
      />

      {active.isError ? (
        <AppointmentErrorState error={active.error} onRetry={() => void active.refetch()} />
      ) : active.isLoading ? (
        view === 'calendar' ? (
          <AppointmentCalendarSkeleton />
        ) : (
          <AppointmentSkeleton rows={Math.min(pageSize, 8)} />
        )
      ) : showEmpty ? (
        <div className="card">
          <AppointmentEmptyState
            filtered={filtered}
            onReset={resetFilters}
            onNewBooking={canBook ? () => setBooking({ mode: 'new' }) : undefined}
          />
        </div>
      ) : view === 'calendar' ? (
        <AppointmentCalendar
          mode={mode}
          anchor={anchor}
          rows={orderedRows}
          staff={reference?.staff ?? []}
          busy={busy}
          onSelect={(appointmentId) =>
            void navigate({
              to: '/dashboard/appointments/$appointmentId',
              params: { appointmentId },
            })
          }
          onSelectDate={(date) => {
            setAnchor(date)
            setMode('day')
          }}
          onCreateAt={({ start, staffUserId }) =>
            setBooking({ mode: 'new', prefill: { start, staffUserId: staffUserId ?? null } })
          }
          onReschedule={handleReschedule}
        />
      ) : view === 'table' ? (
        <AppointmentTable
          rows={orderedRows}
          totalCount={pageQuery.data?.meta.totalCount ?? 0}
          page={pageQuery.data?.meta.page ?? 1}
          pageCount={pageQuery.data?.meta.totalPages ?? 1}
          pageSize={pageSize}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size)
            resetPaging()
          }}
          selected={selected}
          onSelectionChange={setSelected}
          onOpen={(appointmentId) =>
            void navigate({
              to: '/dashboard/appointments/$appointmentId',
              params: { appointmentId },
            })
          }
          onAction={handleAction}
          onBulkConfirm={bulkConfirm}
          onBulkCancel={() => setBulkCancelOpen(true)}
          busy={busy}
        />
      ) : (
        <AppointmentCards
          rows={orderedRows}
          groupByDate={!isClientSort(queryFilters.sort)}
          onOpen={(appointmentId) =>
            void navigate({
              to: '/dashboard/appointments/$appointmentId',
              params: { appointmentId },
            })
          }
          onAction={handleAction}
          busy={busy}
        />
      )}

      <AppointmentFilters
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        filters={filters}
        onChange={onFiltersChange}
        onReset={resetFilters}
        staff={reference?.staff ?? []}
        services={reference?.services ?? []}
        resultCount={view === 'calendar' ? orderedRows.length : pageQuery.data?.meta.totalCount ?? 0}
        calendar={{
          mode,
          onModeChange: (next) => {
            setMode(next)
            resetPaging()
          },
          anchor: toDateValue(anchor),
          onAnchorChange: (value) => {
            const [year, month, day] = value.split('-').map(Number)
            if (!year || !month || !day) return
            setAnchor(new Date(year, month - 1, day))
          },
        }}
        busy={busy}
      />

      {booking ? (
        <AppointmentBookingForm
          open
          onClose={() => setBooking(null)}
          mode={booking.mode}
          businessId={business.id}
          customers={reference?.customers ?? []}
          services={reference?.services ?? []}
          staff={reference?.staff ?? []}
          prefill={booking.prefill}
          busy={mutations.create.isPending || mutations.reschedule.isPending}
          error={
            mutations.create.isError
              ? errorMessage(mutations.create.error)
              : mutations.reschedule.isError
                ? errorMessage(mutations.reschedule.error)
                : null
          }
          onSubmit={submitBooking}
        />
      ) : null}

      <AppointmentCancelDialog
        open={pendingCancel !== null}
        row={pendingCancel}
        pending={mutations.cancel.isPending}
        error={mutations.cancel.isError ? errorMessage(mutations.cancel.error) : null}
        onCancel={() => setPendingCancel(null)}
        onConfirm={({ reason, note }) => {
          if (!pendingCancel) return
          mutations.cancel.mutate(
            { appointmentId: pendingCancel.id, note: note ? `${reason} · ${note}` : reason },
            {
              onSuccess: () => {
                setPendingCancel(null)
                toast.success('Appointment cancelled.')
              },
              onError: (error) => toast.error(errorMessage(error)),
            },
          )
        }}
      />

      <ConfirmDialog
        open={bulkCancelOpen}
        tone="danger"
        title="Cancel the selected appointments?"
        description={`${selected.size} selected. Each one is cancelled individually, and any that cannot be cancelled will be reported.`}
        confirmLabel={mutations.cancel.isPending ? 'Cancelling…' : 'Cancel appointments'}
        cancelLabel="Keep them"
        onCancel={() => setBulkCancelOpen(false)}
        onConfirm={() => {
          setBulkCancelOpen(false)
          bulkCancel()
        }}
      />
    </div>
  )
}
