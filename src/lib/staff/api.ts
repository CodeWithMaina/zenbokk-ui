import { apiGet, apiRequest } from '../api/client'
import type {
  Appointment,
  PaginatedResponse,
  StaffAnalytics,
  StaffBusiness,
} from '../api/types'

/**
 * Staff console reads. Every endpoint is gated server-side by
 * `MembershipPolicies.Staff` against the caller's active membership, so the
 * business is never named by the client — changing a hostname or query string
 * cannot move a staff member into another business.
 */
export const staffApi = {
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
}
