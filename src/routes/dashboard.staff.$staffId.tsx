import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { RefreshCw } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  StaffAttendanceTab,
  StaffBookingsTab,
  StaffCommissionTab,
  StaffDetailsHeader,
  StaffOverviewTab,
  StaffProfileDrawer,
  StaffProfileTab,
  StaffScheduleTab,
  StaffServicesTab,
} from '../components/staff'
import { Alert } from '../components/ui/alert'
import { Button } from '../components/ui/button'
import { DetailTabs } from '../components/ui/detail-tabs'
import { Skeleton } from '../components/ui/skeleton'
import { errorMessage } from '../lib/api/client'
import type { StaffAvailabilityDay } from '../lib/api/types'
import { useAttendanceClock, useAttendanceHistory, useAttendanceOverview } from '../lib/attendance'
import { useCommissionBalance } from '../lib/commission'
import { useDashboardContext } from '../lib/dashboard/dashboard-context'
import { useOwnerAppointments, useOwnerServices } from '../lib/dashboard/use-owner-dashboard'
import { MODULE } from '../lib/entitlements'
import { useStaffDetail, useStaffMutations } from '../lib/staff'

const STAFF_TABS = [
  'overview',
  'bookings',
  'attendance',
  'commission',
  'services',
  'schedule',
  'profile',
] as const

type StaffTab = (typeof STAFF_TABS)[number]

/** The open tab lives in the URL, so a profile view is a link someone can share. */
function validateSearch(search: Record<string, unknown>): { tab?: StaffTab } {
  return {
    tab: (STAFF_TABS as readonly string[]).includes(String(search.tab))
      ? (search.tab as StaffTab)
      : 'overview',
  }
}

export const Route = createFileRoute('/dashboard/staff/$staffId')({
  validateSearch,
  component: StaffProfilePage,
})

function StaffProfilePage() {
  const { staffId } = Route.useParams()
  const { tab: tabParam } = Route.useSearch()
  const tab = tabParam ?? 'overview'
  const navigate = useNavigate({ from: Route.fullPath })
  const { hasModule, hasPermission } = useDashboardContext()

  const enabled = hasModule(MODULE.staff)
  const canManage = hasPermission('staff.manage')
  const attendanceEnabled = hasModule(MODULE.attendance)
  const appointmentsEnabled = hasModule(MODULE.appointments)
  const servicesEnabled = hasModule(MODULE.serviceCatalog)
  const commissionsEnabled = hasModule(MODULE.commissions)

  const detail = useStaffDetail(staffId, enabled)
  const [profileOpen, setProfileOpen] = useState(false)

  const {
    update,
    setActive,
    setServices,
    setAvailability,
    clearAvailability,
    addTimeOff,
    removeTimeOff,
  } = useStaffMutations()

  const appointments = useOwnerAppointments(
    { staffId, page: 1, pageSize: 25, sortBy: 'scheduledAt', sortDirection: 'desc' },
    enabled && appointmentsEnabled && tab === 'bookings',
  )
  const catalogue = useOwnerServices(enabled && servicesEnabled && tab === 'services')
  const attendance = useAttendanceOverview(null, enabled && attendanceEnabled)
  const history = useAttendanceHistory(
    staffId,
    { page: 1, pageSize: 25 },
    enabled && attendanceEnabled && tab === 'attendance',
  )
  const clock = useAttendanceClock()
  const commission = useCommissionBalance(
    staffId,
    enabled && commissionsEnabled && tab === 'commission',
  )

  const attendanceState = useMemo(
    () =>
      (attendance.data?.staff ?? []).find((item) => item.staffUserId === staffId)?.state ?? null,
    [attendance.data, staffId],
  )

  const setTab = (next: StaffTab) => {
    void navigate({ search: { tab: next }, replace: true })
  }

  const reportError = (error: unknown) => toast.error(errorMessage(error))

  const member = detail.data


  if (!enabled) {
    return (
      <Alert tone="info" title="Staff tools aren’t in this plan">
        The staff module unlocks team profiles, service assignments and working hours. Add it from
        settings to manage your team.
      </Alert>
    )
  }

  if (detail.isPending) {
    return (
      <div className="space-y-[0.8rem]" aria-busy="true" aria-label="Loading profile">
        <Skeleton className="h-[4.4rem] rounded-card" />
        <Skeleton className="h-[2.7rem] rounded-md" />
        <Skeleton className="h-[14rem] rounded-card" />
      </div>
    )
  }

  if (detail.isError || !member) {
    return (
      <Alert tone="danger" title="That teammate could not be loaded">
        <p>{errorMessage(detail.error, 'They may have been removed, or the link is wrong.')}</p>
        <Button size="sm" className="mt-[0.6rem]" onClick={() => void detail.refetch()}>
          <RefreshCw className="size-3.5" aria-hidden="true" />
          Try again
        </Button>
      </Alert>
    )
  }

  const toggleService = (serviceId: string, assigned: boolean) => {
    const current = member.services.map((service) => service.serviceId)
    setServices.mutate(
      { staffId, serviceIds: assigned ? [...current, serviceId] : current.filter((id) => id !== serviceId) },
      { onSuccess: () => toast.success('Services updated.'), onError: reportError },
    )
  }

  return (
    <div>
      <StaffDetailsHeader
        detail={member}
        attendanceState={attendanceEnabled ? attendanceState : null}
        attendanceEnabled={attendanceEnabled}
        canManage={canManage}
        clocking={clock.clockIn.isPending || clock.clockOut.isPending}
        onEdit={() => setProfileOpen(true)}
        onToggleActive={() =>
          setActive.mutate(
            { staffId, active: !member.isActive },
            { onSuccess: (result) => toast.success(result.message), onError: reportError },
          )
        }
        onClock={() => {
          const clockedIn = attendanceState === 'clocked_in'
          const mutation = clockedIn ? clock.clockOut : clock.clockIn
          mutation.mutate(
            { staffId, payload: { note: 'Recorded from the staff profile' } },
            {
              onSuccess: () => toast.success(`Clocked ${clockedIn ? 'out' : 'in'}.`),
              onError: reportError,
            },
          )
        }}
      />

      <DetailTabs
        items={[
          { value: 'overview', label: 'Overview' },
          { value: 'bookings', label: 'Bookings' },
          { value: 'attendance', label: 'Attendance' },
          { value: 'commission', label: 'Commission' },
          { value: 'services', label: 'Services' },
          { value: 'schedule', label: 'Schedule' },
          { value: 'profile', label: 'Profile' },
        ]}
        value={tab}
        onValueChange={setTab}
        label="Staff sections"
        sticky
      >
        {tab === 'overview' ? (
          <StaffOverviewTab
            detail={member}
            attendanceEnabled={attendanceEnabled}
            clockedIn={attendanceState === 'clocked_in'}
          />
        ) : null}

        {tab === 'bookings' ? (
          <StaffBookingsTab
            appointments={appointments.data?.appointments ?? []}
            enabled={appointmentsEnabled}
            loading={appointments.isPending}
          />
        ) : null}

        {tab === 'attendance' ? (
          <StaffAttendanceTab
            enabled={attendanceEnabled}
            canManage={canManage}
            clocking={clock.clockIn.isPending || clock.clockOut.isPending}
            state={attendanceState}
            history={history.data?.items ?? []}
            loading={history.isPending}
            onClockIn={() =>
              clock.clockIn.mutate(
                { staffId, payload: { note: 'Recorded from the staff profile' } },
                { onSuccess: () => toast.success('Clocked in.'), onError: reportError },
              )
            }
            onClockOut={() =>
              clock.clockOut.mutate(
                { staffId, payload: { note: 'Recorded from the staff profile' } },
                { onSuccess: () => toast.success('Clocked out.'), onError: reportError },
              )
            }
          />
        ) : null}

        {tab === 'commission' ? (
          <StaffCommissionTab
            enabled={commissionsEnabled}
            loading={commission.isPending}
            balance={commission.data ?? null}
          />
        ) : null}

        {tab === 'services' ? (
          <StaffServicesTab
            detail={member}
            enabled={servicesEnabled}
            canManage={canManage}
            saving={setServices.isPending}
            services={(catalogue.data ?? [])
              .filter((service) => service.isActive)
              .map((service) => ({
                id: service.id,
                name: service.name,
                durationMinutes: service.durationMinutes,
                price: service.price,
              }))}
            onToggleService={toggleService}
          />
        ) : null}

        {tab === 'schedule' ? (
          <StaffScheduleTab
            detail={member}
            canManage={canManage}
            saving={setAvailability.isPending || clearAvailability.isPending || addTimeOff.isPending}
            onSaveWeek={(days: StaffAvailabilityDay[]) =>
              setAvailability.mutate(
                { staffId, payload: { days } },
                { onSuccess: () => toast.success('Working hours saved.'), onError: reportError },
              )
            }
            onClearWeek={() =>
              clearAvailability.mutate(staffId, {
                onSuccess: () => toast.success('Working week cleared.'),
                onError: reportError,
              })
            }
            onAddTimeOff={(input) =>
              addTimeOff.mutate(
                { staffId, payload: input },
                { onSuccess: () => toast.success('Time off added.'), onError: reportError },
              )
            }
            onRemoveTimeOff={(date) =>
              removeTimeOff.mutate(
                { staffId, date },
                { onSuccess: () => toast.success('Time off removed.'), onError: reportError },
              )
            }
          />
        ) : null}

        {tab === 'profile' ? (
          <StaffProfileTab
            detail={member}
            canManage={canManage}
            saving={update.isPending}
            onEdit={() => setProfileOpen(true)}
            onToggle={(field, value) =>
              update.mutate(
                { staffId, payload: { [field]: value } },
                {
                  onSuccess: () =>
                    toast.success(
                      field === 'isBookable'
                        ? value
                          ? 'They can be booked again.'
                          : 'They are no longer offered for booking.'
                        : value
                          ? 'Listed on the storefront.'
                          : 'Hidden from the storefront.',
                    ),
                  onError: reportError,
                },
              )
            }
          />
        ) : null}
      </DetailTabs>

      {profileOpen ? (
        <StaffProfileDrawer open onClose={() => setProfileOpen(false)} detail={member} />
      ) : null}
    </div>
  )
}
