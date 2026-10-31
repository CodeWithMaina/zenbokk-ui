import { apiGet, apiRequest } from '../api/client'
import type {
  Appointment,
  AppointmentDashboard,
  BusinessCustomer,
  BusinessDashboard,
  CancelAppointmentRequest,
  CreateServiceRequest,
  CustomerOverview,
  CreateAppointmentOnBehalfRequest,
  DashboardBootstrap,
  DashboardBusiness,
  PaginatedResponse,
  RescheduleAppointmentRequest,
  ServiceCatalogItem,
  StaffInvitation,
  StaffListResponse,
  StaffOverview,
  UpdateBusinessRequest,
  UpdateServiceRequest,
} from '../api/types'

/**
 * Owner console reads. Every payload is resolved from the caller's JWT — the
 * client never names its own business — and each endpoint is gated server-side
 * by the owning module, so callers must check entitlements before asking.
 */
export const ownerApi = {
  /** Identity + entitlements + permissions + plan, in one round trip. */
  bootstrap(): Promise<DashboardBootstrap> {
    return apiGet<DashboardBootstrap>('/v1/businesses/me/dashboard/bootstrap')
  },

  /** Card/stamp/redemption counters (analytics module). */
  stats(): Promise<BusinessDashboard> {
    return apiGet<BusinessDashboard>('/v1/businesses/me/dashboard')
  },

  /** Appointments plus the filter buckets (customers, staff, services). */
  appointments(
    filters: {
      status?: string | null
      search?: string | null
      from?: string | null
      to?: string | null
      staffId?: string | null
      customerId?: string | null
      serviceId?: string | null
      sortBy?: string
      sortDirection?: 'asc' | 'desc'
      page?: number
      pageSize?: number
    } = {},
  ): Promise<AppointmentDashboard> {
    return apiGet<AppointmentDashboard>('/v1/businesses/me/appointments', filters)
  },

  services(): Promise<ServiceCatalogItem[]> {
    return apiGet<ServiceCatalogItem[]>('/v1/services/me')
  },

  staff(
    filters: { search?: string | null; page?: number; pageSize?: number } = {},
  ): Promise<StaffListResponse> {
    return apiGet<StaffListResponse>('/v1/businesses/me/staff', filters)
  },

  staffOverview(): Promise<StaffOverview> {
    return apiGet<StaffOverview>('/v1/businesses/me/staff/overview')
  },

  customers(
    filters: { search?: string | null; status?: string | null; page?: number; pageSize?: number } = {},
  ): Promise<PaginatedResponse<BusinessCustomer>> {
    return apiGet<PaginatedResponse<BusinessCustomer>>('/v1/businesses/me/customers', filters)
  },

  customerOverview(): Promise<CustomerOverview> {
    return apiGet<CustomerOverview>('/v1/businesses/me/customers/overview')
  },

  // ── Appointments: state transitions ─────────────────────────────
  /** Owner books on behalf of an enrolled customer. */
  createAppointmentOnBehalf(payload: CreateAppointmentOnBehalfRequest): Promise<Appointment> {
    return apiRequest<Appointment>('/v1/businesses/me/appointments', {
      method: 'POST',
      body: payload,
    })
  },

  confirmAppointment(id: string): Promise<Appointment> {
    return apiRequest<Appointment>(`/v1/businesses/me/appointments/${id}/confirm`, {
      method: 'POST',
    })
  },

  completeAppointment(id: string): Promise<Appointment> {
    return apiRequest<Appointment>(`/v1/businesses/me/appointments/${id}/complete`, {
      method: 'POST',
    })
  },

  markAppointmentNoShow(id: string): Promise<Appointment> {
    return apiRequest<Appointment>(`/v1/businesses/me/appointments/${id}/no-show`, {
      method: 'POST',
    })
  },

  /** The owner route binds the reason as `note`, not `reason`. */
  cancelAppointment(id: string, note?: string): Promise<Appointment> {
    const body: CancelAppointmentRequest = { note: note ?? null }
    return apiRequest<Appointment>(`/v1/businesses/me/appointments/${id}/cancel`, {
      method: 'POST',
      body,
    })
  },

  rescheduleAppointment(
    id: string,
    payload: RescheduleAppointmentRequest,
  ): Promise<Appointment> {
    return apiRequest<Appointment>(`/v1/businesses/me/appointments/${id}/reschedule`, {
      method: 'POST',
      body: payload,
    })
  },

  // ── Service catalog writes ──────────────────────────────────────
  createService(payload: CreateServiceRequest): Promise<ServiceCatalogItem> {
    return apiRequest<ServiceCatalogItem>('/v1/services/me', {
      method: 'POST',
      body: payload,
    })
  },

  /**
   * `ServiceCatalogController` exposes this as PATCH (`me/{id}`) — a partial
   * update, not a replacement. Using PUT here returned 405 on every service edit.
   */
  updateService(id: string, payload: UpdateServiceRequest): Promise<ServiceCatalogItem> {
    return apiRequest<ServiceCatalogItem>(`/v1/services/me/${id}`, {
      method: 'PATCH',
      body: payload,
    })
  },

  deleteService(id: string): Promise<boolean> {
    return apiRequest<boolean>(`/v1/services/me/${id}`, { method: 'DELETE' })
  },

  // ── Business profile + address ──────────────────────────────────
  updateBusiness(payload: UpdateBusinessRequest): Promise<DashboardBusiness> {
    return apiRequest<DashboardBusiness>('/v1/businesses/me', {
      method: 'PATCH',
      body: payload,
    })
  },

  updateSlug(slug: string): Promise<DashboardBusiness> {
    return apiRequest<DashboardBusiness>('/v1/businesses/me/slug', {
      method: 'PUT',
      body: { slug },
    })
  },

  // ── Staff invitations ───────────────────────────────────────────
  invitations(): Promise<StaffInvitation[]> {
    return apiGet<StaffInvitation[]>('/v1/businesses/me/staff/invitations')
  },

  inviteStaff(email: string): Promise<StaffInvitation> {
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
}
