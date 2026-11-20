import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  AppointmentBookingForm,
  AppointmentCalendar,
  AppointmentCalendarSkeleton,
  AppointmentCancelDialog,
  AppointmentEmptyState,
  AppointmentErrorState,
  AppointmentFilters,
  AppointmentSkeleton,
  AppointmentTable,
  AppointmentTimeline,
  AppointmentsHeader,
  AppointmentsToolbar,
} from '../components/appointments'
import type { TimelineScope } from '../components/appointments'
import type { AppointmentAction, BookingMode, BookingPrefill, BookingSubmission } from '../components/appointments'
import { BookingWizard } from '../components/booking'
import type { BookingPrefill as WizardPrefill } from '../components/booking'
import { ConfirmDialog } from '../components/ui/confirm-dialog'
import { errorMessage } from '../lib/api/client'
import type { AppointmentDashboard } from '../lib/api/types'
import {
  ALL_DATES_LABEL,
  DEFAULT_APPOINTMENT_FILTERS,
  DEFAULT_CALENDAR_SORT,
  activeFilterCount,
  addDays,
  appointmentSortQuery,
  appointmentStatusLabel,
  calendarPeriod,
  calendarWindow,
  isClientSort,
  isSameDay,
  periodLabel,
  presetPeriodUnit,
  resolveDateWindow,
  shiftPeriod,
  shiftPeriodAnchor,
  sortAppointments,
  toAppointmentRows,
  toDateValue,
  zonedStartOfDayUtc,
} from '../lib/appointments'
import type {
  AppointmentFilters as Filters,
  AppointmentRow,
  AppointmentView,
  Period,
} from '../lib/appointments'
import { useAppointmentMutations, useAppointmentPage, useAppointmentRange, useAppointmentPreferences, useBusinessOpeningHours, browserTimeZone, resolveTimeZone } from '../lib/appointments'
import { useDashboardContext } from '../lib/dashboard/dashboard-context'
import { MODULE } from '../lib/entitlements'
import { useDebouncedValue } from '../lib/hooks/use-debounced-value'
import { formatNumber, pluralize } from '../lib/format'

/** The appointments page's search: `?new=1` opens the booking wizard immediately. */
type AppointmentsSearch = { new?: number }

/**
 * `?new=1` opens the booking wizard straight away — the dashboard's primary
 * action lands on the flow, not on a list the operator then has to act on again.
 * Every other value (or none) leaves the page as it was.
 */
function validateAppointmentsSearch(search: Record<string, unknown>): AppointmentsSearch {
  const flag = search.new
  return { new: flag === '1' || flag === 1 || flag === true ? 1 : undefined }
}

export const Route = createFileRoute('/dashboard/appointments/')({
  validateSearch: validateAppointmentsSearch,
  component: AppointmentsPage,
})

const PAGE_SIZE_OPTIONS = [10, 25, 50] as const

/** The timeline loads a block at a time; "Load more" reveals the next one. */
const TIMELINE_PAGE_SIZE = 24

/** Human label for whatever pane the calendar is showing. */
/** `HH:mm` for a pre-filled start time, in the viewer's timezone. */
function clockTime(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

/**
 * The Appointments module.
 *
 * One page owns the three views, the filters and every write, so the calendar,
 * the table and the timeline always describe the same query. Reads are keyed under
 * `['appointments', …]`; a mutation invalidates that prefix, which is what
 * makes a refused reschedule snap back to the server's truth instead of leaving
 * a block where the browser wished it had gone.
 */
function AppointmentsPage() {
  const { business, hasModule, hasPermission } = useDashboardContext()
  const enabled = hasModule(MODULE.appointments)

  /**
   * Module gates for the booking wizard and the filter panel. The optional Staff module
   * decides whether staff can be selected or filtered at all; the Payments module
   * decides whether the payment step is offered. Both come from the same entitlement
   * system the API enforces — never a local flag.
   */
  const staffModuleEnabled = hasModule(MODULE.staff)
  const paymentsEnabled = hasModule(MODULE.payments)

  const navigate = useNavigate({ from: Route.fullPath })
  const searchParams = Route.useSearch()

  /**
   * How this owner likes to see their day. Remembered per business across sessions —
   * the calendar view, its granularity and the sort order — while the search box, the
   * date range and the filters describe the question being asked right now and are
   * deliberately not restored.
   */
  const { preferences, update: updatePreferences } = useAppointmentPreferences(business.id)
  const view = preferences.view
  const mode = preferences.mode
  const [anchor, setAnchor] = useState(() => new Date())

  /** Everything except the order, which lives in the remembered preferences. */
  const [filterState, setFilterState] = useState<Omit<Filters, 'sort'>>(() => {
    const { sort: _sort, ...rest } = DEFAULT_APPOINTMENT_FILTERS
    return rest
  })
  const filters = useMemo<Filters>(
    () => ({ ...filterState, sort: preferences.sort }),
    [filterState, preferences.sort],
  )

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(25)
  const [timelinePageSize, setTimelinePageSize] = useState<number>(TIMELINE_PAGE_SIZE)
  const [selected, setSelected] = useState<Set<string>>(() => new Set())

  const [filtersOpen, setFiltersOpen] = useState(false)
  /** Reschedule / rebook, which keeps the shared booking drawer. */
  const [booking, setBooking] = useState<{
    mode: BookingMode
    prefill?: BookingPrefill
  } | null>(null)
  /** The new-booking flow. An empty object opens it with nothing pre-filled. */
  const [newBooking, setNewBooking] = useState<WizardPrefill | null>(() =>
    searchParams.new ? {} : null,
  )
  const [pendingCancel, setPendingCancel] = useState<AppointmentRow | null>(null)
  const [bulkCancelOpen, setBulkCancelOpen] = useState(false)

  /**
   * Close the wizard and drop the `?new=1` that opened it, so a reload or a shared
   * link cannot reopen a flow somebody has already finished.
   */
  const closeNewBooking = useCallback(() => {
    setNewBooking(null)
    if (searchParams.new) {
      void navigate({
        to: '/dashboard/appointments',
        search: { new: undefined },
        replace: true,
      })
    }
  }, [navigate, searchParams.new])

  const search = useDebouncedValue(filters.search, 300)
  // While the Staff module is off no staff filter is ever sent, even if a stale value
  // lingers in the filter set: the server would ignore it, so the request must omit it.
  const queryFilters = useMemo<Filters>(
    () => ({ ...filters, search, staffIds: staffModuleEnabled ? filters.staffIds : [] }),
    [filters, search, staffModuleEnabled],
  )

  /**
   * The business's opening hours — the schedule the calendar's band, its per-day
   * labels, its closed-day treatment and the timeline's day headers are drawn from.
   * Read once per business and cached; a failed read leaves the views on their
   * default band rather than blocking the page.
   */
  const openingHours = useBusinessOpeningHours(business.id, enabled)

  /**
   * The one authoritative business timezone.
   *
   * It comes from the scheduling domain's own record (published on the opening-hours
   * read), never from the viewer's device — a business in Nairobi must not have its
   * appointments shifted into another day because the dashboard was opened elsewhere.
   * While the hours are still loading (or if the read failed) the browser's timezone
   * is the fallback, which is exactly the pre-existing behaviour.
   */
  const businessTimeZone = useMemo(
    () => resolveTimeZone(openingHours.data?.timeZoneId, browserTimeZone()),
    [openingHours.data?.timeZoneId],
  )

  const window = useMemo(() => {
    const local = calendarWindow(mode, anchor)
    return {
      start: zonedStartOfDayUtc(toDateValue(local.start), businessTimeZone),
      end: zonedStartOfDayUtc(toDateValue(local.end), businessTimeZone),
    }
  }, [mode, anchor, businessTimeZone])

  /**
   * The calendar pane's own ordering, resolved once through the same function the
   * list uses, so "clock order" is defined in exactly one place.
   */
  const calendarOrder = useMemo(() => appointmentSortQuery(DEFAULT_CALENDAR_SORT), [])

  /**
   * How the timeline should read the rows it is given.
   *
   * Derived from the date window the filters already resolved rather than from a
   * separate control, so the feed always describes the same period the rest of the
   * screen is showing: one day opens its rows, a week groups by day, anything wider
   * groups by date with the days collapsed until asked for.
   */
  const timelineScope: TimelineScope = useMemo(() => {
    const active = resolveDateWindow(filters, new Date(), businessTimeZone)
    if (!active.from || !active.to) return 'month'
    const days = Math.max(
      1,
      Math.round((new Date(active.to).getTime() - new Date(active.from).getTime()) / 86_400_000),
    )
    if (days <= 1) return 'day'
    if (days <= 8) return 'week'
    return 'month'
  }, [filters, businessTimeZone])

  const rangeQuery = useAppointmentRange(
    {
      search: queryFilters.search.trim() || null,
      status: queryFilters.status,
      paymentStatus: queryFilters.payment === 'all' ? null : queryFilters.payment,
      staffIds: queryFilters.staffIds,
      serviceIds: queryFilters.serviceIds,
      customerIds: queryFilters.customerIds,
      from: window.start.toISOString(),
      to: window.end.toISOString(),
      // A time grid is read in clock order, so the pane names its own ordering rather
      // than inheriting whatever the list is sorted by (which now defaults to
      // "most recently created" and would mean nothing on a calendar).
      sortBy: calendarOrder.sortBy,
      sortDirection: calendarOrder.sortDirection,
    },
    enabled && view === 'calendar',
  )

  // The timeline walks its own page size (a growing block revealed by "Load more");
  // the table uses its own page and rows-per-page controls.
  const listPage = view === 'timeline' ? 1 : page
  const listPageSize = view === 'timeline' ? timelinePageSize : pageSize
  const pageQuery = useAppointmentPage(queryFilters, listPage, listPageSize, enabled && view !== 'calendar', businessTimeZone)

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
    setTimelinePageSize(TIMELINE_PAGE_SIZE)
    setSelected(new Set())
  }, [])

  const onFiltersChange = useCallback(
    (next: Filters) => {
      const { sort, ...rest } = next
      setFilterState(rest)
      // The order is a remembered preference, so it is written back rather than held in
      // the session's filter state.
      if (sort !== preferences.sort) updatePreferences({ sort })
      resetPaging()
    },
    [preferences.sort, resetPaging, updatePreferences],
  )

  const resetFilters = useCallback(() => {
    const { sort: _sort, ...rest } = DEFAULT_APPOINTMENT_FILTERS
    setFilterState(rest)
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

  /**
   * The dates on screen — the single source of truth for date navigation in every
   * view. The calendar's period follows its granularity and focus date; the table
   * and timeline follow the filter preset. Whichever view moved the period last,
   * the others inherit it, because they all read this one value.
   *
   * `null` means "all dates", which is a real state and cannot be stepped through.
   */
  const period = useMemo<Period | null>(() => {
    if (view === 'calendar') return calendarPeriod(mode, anchor)
    const unit = presetPeriodUnit(filters.preset)
    const active = resolveDateWindow(filters, new Date(), businessTimeZone)
    if (!unit || !active.from || !active.to) return null
    return { unit, from: new Date(active.from), to: new Date(active.to) }
  }, [view, mode, anchor, filters, businessTimeZone])

  const periodText = period ? periodLabel(period) : ALL_DATES_LABEL

  /**
   * Point the filter window at a period, so the timeline and the table describe the
   * same dates the calendar is showing. The calendar's own fetch window is derived
   * from `mode`/`anchor`, so writing the filters never disturbs the pane that moved.
   */
  const applyPeriod = useCallback(
    (next: Period) => {
      // Only a period that really IS today may carry the `today` preset: the drawer
      // renders the preset's own wording and highlights it as pressed, so labelling a
      // stepped day "Today" would tell the user the wrong date.
      const isToday = next.unit === 'day' && isSameDay(next.from, new Date())
      setFilterState((current) => ({
        ...current,
        preset: isToday ? 'today' : 'custom',
        from: toDateValue(next.from),
        to: toDateValue(next.to),
      }))
      resetPaging()
    },
    [resetPaging],
  )

  /** Previous / next period, by one day, week, month or range length. */
  const stepPeriod = useCallback(
    (direction: -1 | 1) => {
      if (!period) return
      const next = shiftPeriod(period, direction)
      setAnchor((current) => shiftPeriodAnchor(period, current, direction))
      applyPeriod(next)
    },
    [applyPeriod, period],
  )

  /** Jump to the current date without disturbing any other filter. */
  const goToToday = useCallback(() => {
    const today = new Date()
    setAnchor(today)
    const next = view === 'calendar' ? calendarPeriod(mode, today) : calendarPeriod('day', today)
    applyPeriod(next)
  }, [applyPeriod, mode, view])

  /**
   * Jump to an exact date from the picker.
   *
   * The calendar lands on that day (its own granularity still applies when the user
   * is in week/month), while the list views open that single day — the same rule the
   * filters drawer's "go to date" input follows, so both entry points agree.
   */
  const goToDate = useCallback(
    (value: string) => {
      const [year, month, day] = value.split('-').map(Number)
      if (!year || !month || !day) return
      const date = new Date(year, month - 1, day)
      setAnchor(date)
      const next = view === 'calendar' ? calendarPeriod(mode, date) : calendarPeriod('day', date)
      applyPeriod(next)
    },
    [applyPeriod, mode, view],
  )

  /**
   * Switch pane without losing the dates.
   *
   * The calendar describes its period through its granularity and its focus date; the
   * table and timeline describe theirs through the filter window. So the period is
   * handed over in whichever form the destination reads: switching never silently
   * changes which dates are on screen, in either direction.
   */
  const changeView = useCallback(
    (next: AppointmentView) => {
      if (!period) {
        // "All dates" is already the widest either pane can show; there is nothing to
        // hand over.
      } else if (next === 'calendar') {
        setAnchor(period.from)
      } else if (view === 'calendar') {
        applyPeriod(period)
      }
      updatePreferences({ view: next })
      resetPaging()
    },
    [applyPeriod, period, resetPaging, updatePreferences, view],
  )

  /**
   * Keyboard shortcuts from the reference design: `n` opens a new booking, `f`
   * opens the filters, and `1`/`2`/`3` switch calendar/table/timeline. The `/`
   * shortcut lives with the search box that owns it. Nothing fires while the
   * operator is typing or while a dialog/drawer is open.
   */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      const target = event.target as HTMLElement | null
      const tag = target?.tagName ?? ''
      if (/^(INPUT|SELECT|TEXTAREA)$/.test(tag) || target?.isContentEditable) return
      if (filtersOpen || booking || newBooking || pendingCancel || bulkCancelOpen) return
      if (document.querySelector('[role="dialog"]')) return

      switch (event.key.toLowerCase()) {
        case 'n':
          if (!canBook) return
          event.preventDefault()
          setNewBooking({})
          break
        case 'f':
          event.preventDefault()
          setFiltersOpen(true)
          break
        case '1':
          event.preventDefault()
          changeView('calendar')
          break
        case '2':
          event.preventDefault()
          changeView('table')
          break
        case '3':
          event.preventDefault()
          changeView('timeline')
          break
        default:
          break
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [canBook, filtersOpen, booking, newBooking, pendingCancel, bulkCancelOpen, changeView])

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
        onViewChange={changeView}
        todayCount={todayCount}
        onNewBooking={() => setNewBooking({})}
        canBook={canBook}
        busy={mutateBusy}
        navigation={{
          label: periodText,
          onPrevious: () => stepPeriod(-1),
          onNext: () => stepPeriod(1),
          onToday: goToToday,
          onPickDate: goToDate,
          // The picker shows the period's first day, so it always names a date the
          // screen is actually showing.
          dateValue: period ? toDateValue(period.from) : '',
          // "All dates" has no previous or next, so the arrows say so instead of
          // pretending to move somewhere.
          disabled: period === null,
        }}
      />

      <AppointmentsToolbar
        search={filters.search}
        onSearchChange={(value) => onFiltersChange({ ...filters, search: value })}
        filterCount={activeFilterCount(filters)}
        onOpenFilters={() => setFiltersOpen(true)}
        summary={`${
          view === 'calendar'
            ? pluralize(orderedRows.length, 'appointment')
            : formatNumber(pageQuery.data?.meta.totalCount ?? 0) + ' appointments'
        } · ${periodText}`}
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
            onNewBooking={canBook ? () => setNewBooking({}) : undefined}
          />
        </div>
      ) : view === 'calendar' ? (
        <AppointmentCalendar
          mode={mode}
          anchor={anchor}
          rows={orderedRows}
          staff={reference?.staff ?? []}
          hours={openingHours.data ?? null}
          timeZone={businessTimeZone}
          busy={busy}
          onSelect={(appointmentId) =>
            void navigate({
              to: '/dashboard/appointments/$appointmentId',
              params: { appointmentId },
            })
          }
          onSelectDate={(date) => {
            setAnchor(date)
            updatePreferences({ mode: 'day' })
          }}
          // The calendar's hierarchy: a month cell opens its week, a weekday header
          // opens its day, and the period trail widens back out. Every step keeps the
          // selected date — the anchor is the one source of truth for "which date is
          // selected", so filters, the toolbar label and the timeline all follow it.
          onOpenWeek={(date) => {
            setAnchor(date)
            updatePreferences({ mode: 'week' })
            resetPaging()
          }}
          onOpenDay={(date) => {
            setAnchor(date)
            updatePreferences({ mode: 'day' })
            resetPaging()
          }}
          onModeChange={(next) => {
            updatePreferences({ mode: next })
            resetPaging()
          }}
          onCreateAt={({ start }) =>
            setNewBooking({ date: toDateValue(start), slot: clockTime(start) })
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
        <AppointmentTimeline
          rows={orderedRows}
          scope={timelineScope}
          anchor={toDateValue(anchor)}
          step={TIMELINE_PAGE_SIZE}
          totalCount={pageQuery.data?.meta.totalCount}
          onShowMore={() => setTimelinePageSize((size) => size + TIMELINE_PAGE_SIZE)}
          hours={openingHours.data ?? null}
          timeZone={businessTimeZone}
          onOpenCalendarDay={(date) => {
            setAnchor(date)
            updatePreferences({ mode: 'day' })
            resetPaging()
          }}
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
        staffEnabled={staffModuleEnabled}
        services={reference?.services ?? []}
        resultCount={view === 'calendar' ? orderedRows.length : pageQuery.data?.meta.totalCount ?? 0}
        calendar={{
          mode,
          onModeChange: (next) => {
            updatePreferences({ mode: next })
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

      {newBooking ? (
        <BookingWizard
          open
          onClose={closeNewBooking}
          businessId={business.id}
          businessName={business.name}
          businessLogoUrl={business.logoUrl}
          paymentsEnabled={paymentsEnabled}
          services={reference?.services ?? []}
          prefill={newBooking}
          onBooked={() => toast.success('Booking created.')}
          onViewAppointment={(appointmentId) => {
            setNewBooking(null)
            void navigate({
              to: '/dashboard/appointments/$appointmentId',
              params: { appointmentId },
            })
          }}
        />
      ) : null}

      {booking ? (
        <AppointmentBookingForm
          open
          onClose={() => setBooking(null)}
          mode={booking.mode}
          businessId={business.id}
          services={reference?.services ?? []}
          staff={reference?.staff ?? []}
          staffModuleEnabled={staffModuleEnabled}
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
