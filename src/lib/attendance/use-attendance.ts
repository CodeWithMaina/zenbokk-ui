import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../api/query-client'
import type { OwnerAttendanceClockRequest } from '../api/types'
import { attendanceApi } from './api'

/**
 * Attendance reads and the owner's manual clock actions.
 *
 * Every hook takes `enabled`, so a business without the attendance module never
 * issues a request it knows will be refused — the entitlement is the gate, and
 * a `MODULE_DISABLED` response would only be noise.
 */

/** Today's clock state for the whole team. */
export function useAttendanceOverview(date: string | null, enabled = true) {
  return useQuery({
    queryKey: queryKeys.attendanceOverview(date),
    queryFn: () => attendanceApi.overview(date),
    enabled,
    staleTime: 30_000,
  })
}

/** One member's clock events. */
export function useAttendanceHistory(
  staffId: string,
  filters: { from?: string | null; to?: string | null; page?: number; pageSize?: number },
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.attendanceStaffHistory(staffId, filters as Record<string, unknown>),
    queryFn: () => attendanceApi.staffHistory(staffId, filters),
    enabled: enabled && staffId.length > 0,
    staleTime: 30_000,
  })
}

/** Manual clock-in/out, invalidating both attendance and the staff roster. */
export function useAttendanceClock() {
  const queryClient = useQueryClient()

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['attendance'] })
    void queryClient.invalidateQueries({ queryKey: ['staff'] })
  }

  const clockIn = useMutation({
    mutationFn: (input: { staffId: string; payload?: OwnerAttendanceClockRequest }) =>
      attendanceApi.clockIn(input.staffId, input.payload ?? {}),
    onSuccess: invalidate,
  })

  const clockOut = useMutation({
    mutationFn: (input: { staffId: string; payload?: OwnerAttendanceClockRequest }) =>
      attendanceApi.clockOut(input.staffId, input.payload ?? {}),
    onSuccess: invalidate,
  })

  return { clockIn, clockOut }
}
