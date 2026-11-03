import { apiGet, apiRequest } from '../api/client'
import type {
  AttendanceHistoryItem,
  AttendanceOverview,
  OwnerAttendanceClockRequest,
  OwnerAttendanceClockResponse,
  PaginatedResponse,
} from '../api/types'

/**
 * Attendance module client (`BusinessController.Attendance.cs`).
 *
 * Only the owner-side surface the Staff module needs: who is clocked in today,
 * one member's clock history, and the manual clock-in/out an owner records when
 * someone forgot to scan.
 *
 * Every route is gated server-side by the `attendance` module, so a business
 * without it receives `MODULE_DISABLED` — which is why callers check the
 * entitlement *before* asking rather than treating a failure as empty data.
 */
export const attendanceApi = {
  /** Who is clocked in right now (defaults to today in the business time zone). */
  overview(date?: string | null): Promise<AttendanceOverview> {
    return apiGet<AttendanceOverview>('/v1/businesses/me/attendance/overview', { date })
  },

  /** One member's clock events, newest first. */
  staffHistory(
    staffId: string,
    filters: {
      from?: string | null
      to?: string | null
      eventType?: string | null
      page?: number
      pageSize?: number
    } = {},
  ): Promise<PaginatedResponse<AttendanceHistoryItem>> {
    return apiGet<PaginatedResponse<AttendanceHistoryItem>>(
      `/v1/businesses/me/attendance/staff/${staffId}/history`,
      filters,
    )
  },

  /** Records a shift manually. The owner is the trust anchor; a note explains why. */
  clockIn(staffId: string, payload: OwnerAttendanceClockRequest = {}): Promise<OwnerAttendanceClockResponse> {
    return apiRequest<OwnerAttendanceClockResponse>(
      `/v1/businesses/me/attendance/staff/${staffId}/clock-in`,
      { method: 'POST', body: payload },
    )
  },

  /** Closes an open shift manually. No open session is answered with `NOT_CLOCKED_IN`. */
  clockOut(staffId: string, payload: OwnerAttendanceClockRequest = {}): Promise<OwnerAttendanceClockResponse> {
    return apiRequest<OwnerAttendanceClockResponse>(
      `/v1/businesses/me/attendance/staff/${staffId}/clock-out`,
      { method: 'POST', body: payload },
    )
  },
}
