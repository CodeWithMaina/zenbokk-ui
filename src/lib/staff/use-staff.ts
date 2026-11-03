import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../api/query-client'
import type {
  AddStaffTimeOffRequest,
  SetStaffAvailabilityRequest,
  UpdateStaffRequest,
} from '../api/types'
import { staffApi } from './api'
import type { StaffAnalyticsPeriod } from './api'

/**
 * Staff module data access.
 *
 * The business is never named by the client: `/v1/businesses/staff/*` and
 * `/v1/businesses/me/staff/*` resolve it from the caller's active membership
 * server-side, so a staff member cannot reach another business by changing a
 * hostname or a query string.
 *
 * Which business the console is acting in is resolved once by
 * `useBusinessDashboard('dashboard')` — not here — so there is a single answer
 * for the shell and its pages.
 *
 * Reads are keyed under the existing `['staff', …]` prefix, so one
 * `invalidateQueries({ queryKey: ['staff'] })` after a mutation refreshes the
 * roster, the overview, the profile, the working week and the invitations
 * together.
 */

/** Paged roster. Search, status, activity, goal, sort and paging are server-side. */
export function useStaffRoster(filters: Parameters<typeof staffApi.list>[0], enabled = true) {
  return useQuery({
    queryKey: queryKeys.ownerStaff((filters ?? {}) as Record<string, unknown>),
    queryFn: () => staffApi.list(filters),
    enabled,
    staleTime: 30_000,
  })
}

/** Header counters and the performance snapshots. */
export function useStaffOverview(enabled = true) {
  return useQuery({
    queryKey: queryKeys.staffOverview(),
    queryFn: staffApi.overview,
    enabled,
    staleTime: 60_000,
  })
}

/** One member's management profile. */
export function useStaffDetail(staffId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.ownerStaffDetail(staffId),
    queryFn: () => staffApi.detail(staffId),
    enabled: enabled && staffId.length > 0,
    staleTime: 30_000,
  })
}

/** The services a member delivers. */
export function useStaffServices(staffId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.staffServices(staffId),
    queryFn: () => staffApi.services(staffId),
    enabled: enabled && staffId.length > 0,
    staleTime: 30_000,
  })
}

/** The recurring working week. */
export function useStaffAvailability(staffId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.staffAvailability(staffId),
    queryFn: () => staffApi.availability(staffId),
    enabled: enabled && staffId.length > 0,
    staleTime: 30_000,
  })
}

/** Job titles for the assignment pickers. */
export function useStaffPositions(enabled = true) {
  return useQuery({
    queryKey: queryKeys.staffPositions(),
    queryFn: () => staffApi.positions(true),
    enabled,
    staleTime: 5 * 60_000,
  })
}

/** Pending and historical invitations. */
export function useStaffInvitations(enabled = true) {
  return useQuery({
    queryKey: queryKeys.staffInvitations(),
    queryFn: staffApi.invitations,
    enabled,
    staleTime: 30_000,
  })
}

/** Stamp analytics for one member. */
export function useStaffMemberAnalytics(
  staffId: string,
  period: StaffAnalyticsPeriod,
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.staffMemberAnalytics(staffId, period),
    queryFn: () => staffApi.memberAnalytics(staffId, period),
    enabled: enabled && staffId.length > 0,
    staleTime: 60_000,
  })
}

/** One member's activity timeline. */
export function useStaffMemberActivity(
  staffId: string,
  filters: { page: number; pageSize: number },
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.staffMemberActivity(staffId, filters),
    queryFn: () => staffApi.memberActivity(staffId, filters),
    enabled: enabled && staffId.length > 0,
    staleTime: 30_000,
  })
}
/**
 * Every staff write, each invalidating the whole `['staff', …]` bucket so the
 * roster, the overview and the open profile agree after one action.
 *
 * The mutations are separate (rather than one "save everything" call) because
 * the API treats them as separate concerns: a working week is not a profile,
 * and a service assignment is neither.
 */
export function useStaffMutations() {
  const queryClient = useQueryClient()
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['staff'] })

  const update = useMutation({
    mutationFn: (input: { staffId: string; payload: UpdateStaffRequest }) =>
      staffApi.update(input.staffId, input.payload),
    onSuccess: invalidate,
  })

  const setActive = useMutation({
    mutationFn: (input: { staffId: string; active: boolean }) =>
      input.active ? staffApi.activate(input.staffId) : staffApi.deactivate(input.staffId),
    onSuccess: invalidate,
  })

  const setServices = useMutation({
    mutationFn: (input: { staffId: string; serviceIds: string[] }) =>
      staffApi.setServices(input.staffId, input.serviceIds),
    onSuccess: invalidate,
  })

  const setAvailability = useMutation({
    mutationFn: (input: { staffId: string; payload: SetStaffAvailabilityRequest }) =>
      staffApi.setAvailability(input.staffId, input.payload),
    onSuccess: invalidate,
  })

  const clearAvailability = useMutation({
    mutationFn: (staffId: string) => staffApi.clearAvailability(staffId),
    onSuccess: invalidate,
  })

  const addTimeOff = useMutation({
    mutationFn: (input: { staffId: string; payload: AddStaffTimeOffRequest }) =>
      staffApi.addTimeOff(input.staffId, input.payload),
    onSuccess: invalidate,
  })

  const removeTimeOff = useMutation({
    mutationFn: (input: { staffId: string; date: string }) =>
      staffApi.removeTimeOff(input.staffId, input.date),
    onSuccess: invalidate,
  })

  const invite = useMutation({
    mutationFn: (email: string) => staffApi.invite(email),
    onSuccess: invalidate,
  })

  const resendInvitation = useMutation({
    mutationFn: (id: string) => staffApi.resendInvitation(id),
    onSuccess: invalidate,
  })

  const revokeInvitation = useMutation({
    mutationFn: (id: string) => staffApi.revokeInvitation(id),
    onSuccess: invalidate,
  })

  return {
    update,
    setActive,
    setServices,
    setAvailability,
    clearAvailability,
    addTimeOff,
    removeTimeOff,
    invite,
    resendInvitation,
    revokeInvitation,
  }
}

// ── Staff console (the signed-in member's own surface) ───────

export function useStaffAnalytics() {
  return useQuery({
    queryKey: queryKeys.staffAnalytics(),
    queryFn: staffApi.analytics,
    staleTime: 60_000,
    retry: false,
  })
}

export function useStaffConsoleAppointments(
  filters: Parameters<typeof staffApi.appointments>[0],
) {
  return useQuery({
    queryKey: queryKeys.staffConsoleAppointments(filters ?? {}),
    queryFn: () => staffApi.appointments(filters),
    staleTime: 30_000,
  })
}


