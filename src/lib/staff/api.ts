import { apiGet, apiRequest } from '../api/client'
import type {
  AddStaffTimeOffRequest,
  Appointment,
  PaginatedResponse,
  SetStaffAvailabilityRequest,
  SetStaffServicesRequest,
  StaffAnalytics,
  StaffAvailabilityDay,
  StaffBusiness,
  StaffDetail,
  StaffInvitation,
  StaffListResponse,
  StaffOverview,
  StaffPosition,
  StaffServiceLink,
  StaffStatusResponse,
  StaffTimeOff,
  UpdateStaffRequest,
} from '../api/types'

/**
 * Staff console reads and owner-side staff management writes.
 *
 * Every endpoint is gated server-side by `MembershipPolicies.Staff` /
 * `MembershipPolicies.Owner` against the caller's active membership, so the
 * business is never named by the client — changing a hostname or query string
 * cannot move a staff member into another business.
 *
 * The read routes (`/v1/businesses/staff/*`) belong to the staff console; the
 * management routes (`/v1/businesses/me/staff/*`) belong to the owner console
 * and are re-checked against the `staff` module and a business-scoped
 * permission inside the API.
 */
export const staffApi = {
  // ── Staff console (the signed-in member's own surface) ──────
  myBusiness(): Promise<StaffBusiness> {
    return apiGet<StaffBusiness>('/v1/businesses/staff/my-business')
  },

  appointments(
    filters: {
      status?: string | null
      search?: string | null
      from?: string | null
      to?: string | null
      sort?: string
      page?: number
      pageSize?: number
    } = {},
  ): Promise<PaginatedResponse<Appointment>> {
    return apiGet<PaginatedResponse<Appointment>>('/v1/businesses/staff/appointments', filters)
  },

  analytics(): Promise<StaffAnalytics> {
    return apiGet<StaffAnalytics>('/v1/businesses/staff/analytics')
  },

  confirm(id: string): Promise<Appointment> {
    return apiRequest<Appointment>(`/v1/businesses/staff/appointments/${id}/confirm`, {
      method: 'POST',
    })
  },

  complete(id: string): Promise<Appointment> {
    return apiRequest<Appointment>(`/v1/businesses/staff/appointments/${id}/complete`, {
      method: 'POST',
    })
  },

  markNoShow(id: string): Promise<Appointment> {
    return apiRequest<Appointment>(`/v1/businesses/staff/appointments/${id}/no-show`, {
      method: 'POST',
    })
  },

  cancel(id: string, note?: string): Promise<Appointment> {
    return apiRequest<Appointment>(`/v1/businesses/staff/appointments/${id}/cancel`, {
      method: 'POST',
      body: { note: note ?? null },
    })
  },

  // ── Owner console: the team roster ─────────────────────────
  /**
   * The team, with search, status/activity/goal filters, sorting and paging all
   * applied server-side.
   *
   * `status` is `active` (a stamp in the trailing week) or `inactive`; `activity`
   * is the finer alias (`today` | `week` | `idle`). Neither is a membership
   * lifecycle filter — the roster reports `membershipStatus` per row instead.
   */
  list(
    filters: {
      search?: string | null
      status?: string | null
      activity?: string | null
      goalStatus?: string | null
      sortBy?: StaffSort
      sortDirection?: 'asc' | 'desc'
      page?: number
      pageSize?: number
    } = {},
  ): Promise<StaffListResponse> {
    return apiGet<StaffListResponse>('/v1/businesses/me/staff', filters)
  },

  overview(): Promise<StaffOverview> {
    return apiGet<StaffOverview>('/v1/businesses/me/staff/overview')
  },

  /** One member's management profile. */
  detail(staffId: string): Promise<StaffDetail> {
    return apiGet<StaffDetail>(`/v1/businesses/me/staff/${staffId}`)
  },

  /** Partial update: an omitted field is never touched. */
  update(staffId: string, payload: UpdateStaffRequest): Promise<StaffDetail> {
    return apiRequest<StaffDetail>(`/v1/businesses/me/staff/${staffId}`, {
      method: 'PATCH',
      body: payload,
    })
  },

  /** Suspends the membership. History is kept; nothing is deleted. */
  deactivate(staffId: string): Promise<StaffStatusResponse> {
    return apiRequest<StaffStatusResponse>(`/v1/businesses/me/staff/${staffId}/deactivate`, {
      method: 'POST',
    })
  },

  activate(staffId: string): Promise<StaffStatusResponse> {
    return apiRequest<StaffStatusResponse>(`/v1/businesses/me/staff/${staffId}/activate`, {
      method: 'POST',
    })
  },

  // ── Services, working week and time off ────────────────────
  /** The services a member delivers. */
  services(staffId: string): Promise<StaffServiceLink[]> {
    return apiGet<StaffServiceLink[]>(`/v1/businesses/me/staff/${staffId}/services`)
  },

  /** Replaces the whole set — the array is the complete assignment list. */
  setServices(staffId: string, serviceIds: string[]): Promise<StaffServiceLink[]> {
    const body: SetStaffServicesRequest = { serviceIds }
    return apiRequest<StaffServiceLink[]>(`/v1/businesses/me/staff/${staffId}/services`, {
      method: 'PUT',
      body,
    })
  },

  /** The recurring working week (always seven weekdays). */
  availability(staffId: string): Promise<StaffAvailabilityDay[]> {
    return apiGet<StaffAvailabilityDay[]>(`/v1/businesses/me/staff/${staffId}/availability`)
  },

  setAvailability(
    staffId: string,
    payload: SetStaffAvailabilityRequest,
  ): Promise<StaffAvailabilityDay[]> {
    return apiRequest<StaffAvailabilityDay[]>(`/v1/businesses/me/staff/${staffId}/availability`, {
      method: 'PUT',
      body: payload,
    })
  },

  /** Drops the saved week so the member inherits their roster / business hours. */
  clearAvailability(staffId: string): Promise<StaffAvailabilityDay[]> {
    return apiRequest<StaffAvailabilityDay[]>(`/v1/businesses/me/staff/${staffId}/availability`, {
      method: 'DELETE',
    })
  },

  addTimeOff(staffId: string, payload: AddStaffTimeOffRequest): Promise<StaffTimeOff[]> {
    return apiRequest<StaffTimeOff[]>(`/v1/businesses/me/staff/${staffId}/time-off`, {
      method: 'POST',
      body: payload,
    })
  },

  removeTimeOff(staffId: string, date: string): Promise<StaffTimeOff[]> {
    return apiRequest<StaffTimeOff[]>(`/v1/businesses/me/staff/${staffId}/time-off/${date}`, {
      method: 'DELETE',
    })
  },

  /** Job titles of the caller's business, for the assignment pickers. */
  positions(includeInactive = true): Promise<StaffPosition[]> {
    return apiGet<StaffPosition[]>('/v1/businesses/me/staff/positions', { includeInactive })
  },

  // ── Invitations (onboarding) ───────────────────────────────
  invitations(): Promise<StaffInvitation[]> {
    return apiGet<StaffInvitation[]>('/v1/businesses/me/staff/invitations')
  },

  invite(email: string): Promise<StaffInvitation> {
    return apiRequest<StaffInvitation>('/v1/businesses/me/staff/invitations', {
      method: 'POST',
      body: { email },
    })
  },

  resendInvitation(id: string): Promise<StaffInvitation> {
    return apiRequest<StaffInvitation>(`/v1/businesses/me/staff/invitations/${id}/resend`, {
      method: 'POST',
    })
  },

  revokeInvitation(id: string): Promise<{ message: string }> {
    return apiRequest<{ message: string }>(`/v1/businesses/me/staff/invitations/${id}/revoke`, {
      method: 'POST',
    })
  },

  // ── Per-member reporting (owner view) ──────────────────────
  /** Stamp analytics for one member. `period` is `today` | `7d` | `30d` | `all`. */
  memberAnalytics(staffId: string, period: StaffAnalyticsPeriod = 'all'): Promise<StaffAnalytics> {
    return apiGet<StaffAnalytics>(`/v1/businesses/me/staff/${staffId}/analytics`, { period })
  },

  /** One member's activity timeline (stamps and redemptions). */
  memberActivity(
    staffId: string,
    filters: { activityType?: string; page?: number; pageSize?: number } = {},
  ): Promise<StaffActivityFeed> {
    return apiGet<StaffActivityFeed>(`/v1/businesses/me/staff/${staffId}/activity`, filters)
  },
}

/** Server-side sort keys the roster accepts. */
export const STAFF_SORT = {
  name: 'name',
  stamps: 'stamps',
  recent: 'recent',
  goal: 'goal',
  added: 'added',
} as const

export type StaffSort = (typeof STAFF_SORT)[keyof typeof STAFF_SORT]

export type StaffAnalyticsPeriod = 'today' | '7d' | '30d' | 'all'

/** One entry in a member's activity timeline. */
export type StaffActivityItem = {
  id: string
  activityType: string
  customerName: string | null
  description: string
  status: string | null
  occurredAt: string
}

export type StaffActivityFeed = {
  items: StaffActivityItem[]
  page: number
  pageSize: number
  totalCount: number
}

