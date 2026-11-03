import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { MailPlus, Plus, RefreshCw, UsersRound } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  StaffCard,
  StaffExportDrawer,
  StaffInviteDrawer,
  StaffProfileDrawer,
  StaffRosterFilters,
  StaffSelectionDock,
  StaffTable,
  StaffToolbar,
} from '../components/staff'
import type { StaffRow, StaffView } from '../components/staff'
import { Alert } from '../components/ui/alert'
import { Button } from '../components/ui/button'
import { Checkbox } from '../components/ui/checkbox'
import { ConfirmDialog } from '../components/ui/confirm-dialog'
import { EmptyState } from '../components/ui/empty-state'
import { MetricGrid } from '../components/ui/metric-tile'
import { PageHeader } from '../components/ui/page-header'
import { PaginationBar } from '../components/ui/pagination-bar'
import { SearchField } from '../components/ui/search-field'
import { SelectionBar } from '../components/ui/selection-bar'
import { Skeleton } from '../components/ui/skeleton'
import { errorMessage } from '../lib/api/client'
import type { StaffMember } from '../lib/api/types'
import { useAttendanceClock, useAttendanceOverview } from '../lib/attendance'
import { useDashboardContext } from '../lib/dashboard/dashboard-context'
import { MODULE } from '../lib/entitlements'
import { formatNumber, pluralize } from '../lib/format'
import { useDebouncedValue } from '../lib/hooks/use-debounced-value'
import {
  STAFF_ROSTER_FILTERS,
  STAFF_SORT,
  staffRosterFilterQuery,
  useStaffDetail,
  useStaffInvitations,
  useStaffMutations,
  useStaffOverview,
  useStaffRoster,
} from '../lib/staff'
import type { StaffRosterFilter, StaffSort } from '../lib/staff'

/** Every list control lives in the URL, so a refresh or a shared link keeps it. */
type StaffSearch = {
  q?: string
  filter?: StaffRosterFilter
  view?: StaffView
  sort?: StaffSort
  page?: number
  size?: number
}

const PAGE_SIZES = [8, 12, 24, 48] as const

function validateSearch(search: Record<string, unknown>): StaffSearch {
  const page = Number(search.page)
  const size = Number(search.size)
  const sortKeys = Object.keys(STAFF_SORT) as StaffSort[]

  return {
    q: typeof search.q === 'string' && search.q.trim() ? search.q : undefined,
    filter: (STAFF_ROSTER_FILTERS as readonly string[]).includes(String(search.filter))
      ? (search.filter as StaffRosterFilter)
      : 'all',
    view: search.view === 'table' ? 'table' : 'cards',
    sort: sortKeys.includes(search.sort as StaffSort) ? (search.sort as StaffSort) : 'name',
    page: Number.isFinite(page) && page > 0 ? Math.floor(page) : 1,
    size: (PAGE_SIZES as readonly number[]).includes(size) ? size : 12,
  }
}

export const Route = createFileRoute('/dashboard/staff/')({
  validateSearch,
  component: StaffRosterPage,
})

function StaffRosterPage() {
  const navigate = useNavigate({ from: Route.fullPath })
  const search = Route.useSearch()
  const { hasModule, hasPermission } = useDashboardContext()

  const enabled = hasModule(MODULE.staff)
  const canManage = hasPermission('staff.manage')
  const attendanceEnabled = hasModule(MODULE.attendance)

  const filter = search.filter ?? 'all'
  const view = search.view ?? 'cards'
  const sort = search.sort ?? 'name'
  const page = search.page ?? 1
  const size = search.size ?? 12
  const invited = filter === 'invited'

  const [term, setTerm] = useState(search.q ?? '')
  const debouncedTerm = useDebouncedValue(term, 300)
  const [selected, setSelected] = useState<Map<string, StaffMember>>(new Map())
  const [inviteOpen, setInviteOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [deactivating, setDeactivating] = useState<StaffMember | null>(null)

  // The box is local so typing never lags; the URL carries the committed term.
  useEffect(() => {
    if ((search.q ?? '') === debouncedTerm) return
    void navigate({
      search: (previous) => ({ ...previous, q: debouncedTerm || undefined, page: 1 }),
      replace: true,
    })
  }, [debouncedTerm, navigate, search.q])

  const query = staffRosterFilterQuery(filter)

  const roster = useStaffRoster(
    {
      search: search.q ?? null,
      status: query.status,
      activity: query.activity,
      sortBy: sort,
      sortDirection: sort === 'name' ? 'asc' : 'desc',
      page,
      pageSize: size,
    },
    enabled && !invited,
  )
  const overview = useStaffOverview(enabled)
  const invitations = useStaffInvitations(enabled && invited)
  const attendance = useAttendanceOverview(null, enabled && attendanceEnabled)
  const clock = useAttendanceClock()
  const { setActive, resendInvitation } = useStaffMutations()
  const editingDetail = useStaffDetail(editing ?? '', Boolean(editing))

  const attendanceByStaff = useMemo(() => {
    const map = new Map<string, string>()
    for (const item of attendance.data?.staff ?? []) map.set(item.staffUserId, item.state)
    return map
  }, [attendance.data])

  /**
   * Roster rows, or the pending invitations.
   *
   * `invited` is a lifecycle state the roster does not model — a pending
   * invitation is not a member yet — so that chip is answered by the invitation
   * list rather than by asking the roster for something it cannot filter.
   */
  const members = useMemo<StaffMember[]>(() => {
    if (!invited) return roster.data?.items ?? []

    return (invitations.data ?? [])
      .filter(
        (invitation) => !invitation.acceptedAt && !invitation.revokedAt && !invitation.isExpired,
      )
      .map((invitation) => ({
        userId: invitation.id,
        fullName: invitation.email,
        email: invitation.email,
        avatarUrl: null,
        stampsIssued: 0,
        dailyGoalOverride: null,
        dailyGoal: null,
        dailyGoalType: 'stamps',
        appointmentDailyGoalOverride: null,
        appointmentDailyGoal: null,
        appointmentsToday: 0,
        membershipStatus: 'Invited',
      }))
  }, [invited, invitations.data, roster.data])

  const rows = useMemo<StaffRow[]>(
    () =>
      members.map((member) => ({
        member,
        attendanceState: attendanceEnabled ? (attendanceByStaff.get(member.userId) ?? null) : null,
      })),
    [members, attendanceEnabled, attendanceByStaff],
  )

  const totalCount = invited ? members.length : (roster.data?.total ?? 0)
  const pageCount = invited ? 1 : (roster.data?.totalPages ?? 1)
  const loading = invited ? invitations.isPending : roster.isPending
  const failed = invited ? invitations.isError : roster.isError

  const patchSearch = (patch: Partial<StaffSearch>) => {
    void navigate({ search: (previous) => ({ ...previous, ...patch }), replace: true })
  }

  const selectedIds = new Set(selected.keys())
  const allOnPageSelected =
    members.length > 0 && members.every((member) => selectedIds.has(member.userId))
  const someOnPageSelected = members.some((member) => selectedIds.has(member.userId))

  const toggleRow = (id: string, isSelected: boolean) => {
    const member = members.find((item) => item.userId === id)
    setSelected((previous) => {
      const next = new Map(previous)
      if (isSelected && member) next.set(id, member)
      else next.delete(id)
      return next
    })
  }

  const togglePage = (isSelected: boolean) => {
    setSelected((previous) => {
      const next = new Map(previous)
      for (const member of members) {
        if (isSelected) next.set(member.userId, member)
        else next.delete(member.userId)
      }
      return next
    })
  }

  const openMember = (member: StaffMember) => {
    if (member.membershipStatus === 'Invited') {
      toast('This teammate has not accepted their invitation yet.')
      return
    }
    void navigate({ to: '/dashboard/staff/$staffId', params: { staffId: member.userId } })
  }

  const { toggleActive, clockMember, resend } = useRosterActions({
    attendanceByStaff,
    setActive,
    resendInvitation,
    clock,
    setDeactivating,
  })

  const filtered = Boolean(search.q) || filter !== 'all'
  const rangeStart = totalCount === 0 ? 0 : (page - 1) * size + 1
  const rangeEnd = Math.min(page * size, totalCount)

  const emptyState = (
    <EmptyState
      icon={<UsersRound className="size-5" />}
      title={filtered ? 'No teammates match those filters' : 'No staff yet'}
      description={
        filtered
          ? 'Try a different search term or filter.'
          : 'Invite your first teammate — they accept by email and appear here.'
      }
      action={
        filtered ? (
          <Button
            onClick={() => {
              setTerm('')
              patchSearch({ q: undefined, filter: 'all', page: 1 })
            }}
          >
            Clear search and filters
          </Button>
        ) : canManage ? (
          <Button variant="primary" onClick={() => setInviteOpen(true)}>
            <MailPlus className="size-4" aria-hidden="true" />
            Invite staff
          </Button>
        ) : null
      }
    />
  )

  const rosterProps = {
    onOpen: openMember,
    onEdit: (member: StaffMember) => setEditing(member.userId),
    onToggleActive: canManage ? toggleActive : undefined,
    onResendInvite: canManage ? resend : undefined,
    canManage,
  }

  return (
    <div>
      <PageHeader
        title="Staff"
        description={
          overview.data
            ? `${pluralize(overview.data.totalStaff, 'teammate')} · ${formatNumber(
                overview.data.activeStaff7d,
              )} active this week`
            : 'Manage your team and daily operations.'
        }
        actions={
          canManage ? (
            <Button variant="primary" onClick={() => setInviteOpen(true)}>
              <Plus className="size-4" aria-hidden="true" />
              Invite staff
            </Button>
          ) : null
        }
      />

      {!enabled ? (
        <Alert tone="info" title="Staff tools aren’t in this plan">
          The staff module lets teammates sign in, stamp cards and take bookings. Add it from
          settings to invite your team.
        </Alert>
      ) : (
        <>
          {overview.data ? (
            <MetricGrid
              className="mb-[0.6rem]"
              items={[
                { value: formatNumber(overview.data.totalStaff), label: 'Total staff' },
                { value: formatNumber(overview.data.activeStaff7d), label: 'Active this week' },
                { value: formatNumber(overview.data.inactiveStaff), label: 'Idle this week' },
                { value: formatNumber(overview.data.pendingInvitations), label: 'Invites pending' },
              ]}
            />
          ) : null}

          <StaffToolbar
            view={view}
            onViewChange={(next) => patchSearch({ view: next })}
            sort={sort}
            onSortChange={(next) => patchSearch({ sort: next, page: 1 })}
            onRefresh={() => void (invited ? invitations.refetch() : roster.refetch())}
            refreshing={loading}
          >
            <SearchField
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder="Search name, email or job title"
              label="Search staff"
              className="min-w-[13rem] flex-1"
              autoComplete="off"
            />
          </StaffToolbar>

          <StaffRosterFilters
            value={filter}
            onValueChange={(next) => patchSearch({ filter: next, page: 1 })}
            counts={{
              all: overview.data?.totalStaff,
              active: overview.data?.activeStaff7d,
              inactive: overview.data?.inactiveStaff,
              invited: overview.data?.pendingInvitations,
            }}
          />

          <div className="mb-[0.6rem] flex flex-wrap items-center gap-x-[0.7rem] gap-y-[0.4rem]">
            <Checkbox
              checked={allOnPageSelected}
              indeterminate={someOnPageSelected && !allOnPageSelected}
              onCheckedChange={() => togglePage(!allOnPageSelected)}
              label="Select all teammates on this page"
            />
            <SelectionBar
              selectedCount={selected.size}
              itemLabel="selected"
              onClear={() => setSelected(new Map())}
              className="mb-0 min-w-0 flex-1"
              actions={
                <span className="tabular">
                  {rangeStart}–{rangeEnd} of {formatNumber(totalCount)}
                </span>
              }
            />
          </div>
          {loading ? (
            view === 'table' ? (
              <div className="card flex flex-col gap-[0.6rem]" aria-busy="true" aria-label="Loading staff">
                {Array.from({ length: 5 }, (_, index) => (
                  <Skeleton key={index} className="h-9" />
                ))}
              </div>
            ) : (
              <div
                className="grid grid-cols-1 gap-[0.7rem] sm:grid-cols-[repeat(auto-fill,minmax(15rem,1fr))]"
                aria-busy="true"
                aria-label="Loading staff"
              >
                {Array.from({ length: 6 }, (_, index) => (
                  <Skeleton key={index} className="h-[7.4rem] rounded-card" />
                ))}
              </div>
            )
          ) : failed ? (
            <Alert tone="danger" title="Your team could not be loaded">
              <p>{errorMessage(invited ? invitations.error : roster.error)}</p>
              <Button
                size="sm"
                className="mt-[0.6rem]"
                onClick={() => void (invited ? invitations.refetch() : roster.refetch())}
                disabled={loading}
              >
                <RefreshCw className="size-3.5" aria-hidden="true" />
                Try again
              </Button>
            </Alert>
          ) : (
            <>
              {view === 'cards' ? (
                <div
                  role="list"
                  aria-label="Staff"
                  className="grid grid-cols-1 gap-[0.7rem] sm:grid-cols-[repeat(auto-fill,minmax(15rem,1fr))]"
                >
                  {rows.length === 0 ? (
                    <div className="card sm:col-span-full">{emptyState}</div>
                  ) : (
                    rows.map((row) => (
                      <div key={row.member.userId} role="listitem">
                        <StaffCard
                          row={row}
                          selected={selectedIds.has(row.member.userId)}
                          onSelectedChange={(isSelected) => toggleRow(row.member.userId, isSelected)}
                          onClock={attendanceEnabled && canManage ? clockMember : undefined}
                          {...rosterProps}
                        />
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <StaffTable
                  rows={rows}
                  selectedIds={selectedIds}
                  onSelectedChange={toggleRow}
                  onSelectAll={togglePage}
                  showAttendance={attendanceEnabled}
                  empty={emptyState}
                  {...rosterProps}
                />
              )}

              {pageCount > 1 ? (
                <div className="mt-[1.1rem]">
                  <PaginationBar
                    page={page}
                    pageCount={pageCount}
                    onPageChange={(nextPage) => patchSearch({ page: nextPage })}
                    pageSize={size}
                    pageSizeOptions={PAGE_SIZES}
                    onPageSizeChange={(nextSize) => patchSearch({ size: nextSize, page: 1 })}
                  />
                </div>
              ) : null}
            </>
          )}
        </>
      )}

      <StaffSelectionDock
        selectedCount={selected.size}
        onClear={() => setSelected(new Map())}
        onExport={() => setExportOpen(true)}
        onClockIn={
          attendanceEnabled && canManage
            ? () =>
                [...selected.values()].forEach((member) =>
                  clock.clockIn.mutate({
                    staffId: member.userId,
                    payload: { note: 'Bulk clock-in from the staff list' },
                  }),
                )
            : undefined
        }
        onClockOut={
          attendanceEnabled && canManage
            ? () =>
                [...selected.values()].forEach((member) =>
                  clock.clockOut.mutate({
                    staffId: member.userId,
                    payload: { note: 'Bulk clock-out from the staff list' },
                  }),
                )
            : undefined
        }
        busy={clock.clockIn.isPending || clock.clockOut.isPending}
      />

      <StaffInviteDrawer open={inviteOpen} onClose={() => setInviteOpen(false)} />

      <StaffExportDrawer
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        rows={[...selected.values()]}
        attendanceByStaff={attendanceByStaff}
      />

      {editing && editingDetail.data ? (
        <StaffProfileDrawer
          open
          onClose={() => setEditing(null)}
          detail={editingDetail.data}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(deactivating)}
        title={`Deactivate ${deactivating?.fullName ?? 'this teammate'}?`}
        description="They stop being offered for new bookings and new attendance. Their bookings, attendance and commission history are kept."
        confirmLabel="Deactivate"
        tone="danger"
        onCancel={() => setDeactivating(null)}
        onConfirm={() => {
          const member = deactivating
          setDeactivating(null)
          if (!member) return
          setActive.mutate(
            { staffId: member.userId, active: false },
            {
              onSuccess: (result) => toast.success(result.message),
              onError: (error) => toast.error(errorMessage(error)),
            },
          )
        }}
      />
    </div>
  )
}


/** Row actions and the page chrome, kept apart from the data plumbing above. */
function useRosterActions({
  attendanceByStaff,
  setActive,
  resendInvitation,
  clock,
  setDeactivating,
}: {
  attendanceByStaff: ReadonlyMap<string, string>
  setActive: ReturnType<typeof useStaffMutations>['setActive']
  resendInvitation: ReturnType<typeof useStaffMutations>['resendInvitation']
  clock: ReturnType<typeof useAttendanceClock>
  setDeactivating: (member: StaffMember) => void
}) {
  const toggleActive = (member: StaffMember) => {
    const inactive = member.membershipStatus === 'Suspended' || member.membershipStatus === 'Left'
    if (!inactive) {
      setDeactivating(member)
      return
    }
    setActive.mutate(
      { staffId: member.userId, active: true },
      {
        onSuccess: () => toast.success(`${member.fullName} can take bookings again.`),
        onError: (error) => toast.error(errorMessage(error)),
      },
    )
  }

  const clockMember = (member: StaffMember) => {
    const clockedIn = attendanceByStaff.get(member.userId) === 'clocked_in'
    const mutation = clockedIn ? clock.clockOut : clock.clockIn
    mutation.mutate(
      { staffId: member.userId, payload: { note: 'Recorded from the staff list' } },
      {
        onSuccess: () => toast.success(`${member.fullName} clocked ${clockedIn ? 'out' : 'in'}.`),
        onError: (error) => toast.error(errorMessage(error)),
      },
    )
  }

  const resend = (member: StaffMember) => {
    resendInvitation.mutate(member.userId, {
      onSuccess: () => toast.success(`Invitation resent to ${member.email}.`),
      onError: (error) => toast.error(errorMessage(error)),
    })
  }

  return { toggleActive, clockMember, resend }
}

