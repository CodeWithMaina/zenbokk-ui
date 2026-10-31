import { apiGet, apiRequest } from '../api/client'
import { toDateInputValue } from '../format'
import type {
  Appointment,
  AvailabilityCalendar,
  CancelAppointmentRequest,
  CreateAppointmentRequest,
  EligibleStaff,
  PaginatedResponse,
  PublicLandingPage,
  PublicReview,
  RescheduleAppointmentRequest,
  ReviewSummary,
  ServiceCatalogItem,
  StorefrontBootstrap,
} from '../api/types'

/** The booking wizard shows two weeks; the server clamps longer windows. */
const AVAILABILITY_WINDOW_DAYS = 14

/**
 * The calendar endpoint requires an explicit date range. Resolve the default
 * window here rather than inside a React render/query closure so the component
 * stays pure.
 */
function availabilityWindow(): { startDate: string; endDate: string } {
  const today = new Date()
  const end = new Date(today)
  end.setDate(end.getDate() + AVAILABILITY_WINDOW_DAYS - 1)
  return { startDate: toDateInputValue(today), endDate: toDateInputValue(end) }
}

/** Public storefront reads. Anonymous unless a session happens to exist. */
export const storefrontApi = {
  /** Identity + profile + landing page in one round trip. */
  bootstrap(slug: string): Promise<StorefrontBootstrap> {
    return apiGet<StorefrontBootstrap>(
      `/v1/businesses/by-slug/${encodeURIComponent(slug)}/bootstrap`,
      {},
      { tenantSlug: slug },
    )
  },

  landingPage(businessId: string): Promise<PublicLandingPage> {
    return apiGet<PublicLandingPage>(`/v1/businesses/public/${businessId}/landing-page`)
  },

  services(businessId: string): Promise<ServiceCatalogItem[]> {
    return apiGet<ServiceCatalogItem[]>(`/v1/services/${businessId}`)
  },

  eligibleStaff(businessId: string, serviceIds: string[]): Promise<EligibleStaff[]> {
    // The API binds this one as a comma-separated string, not a repeated key.
    return apiGet<EligibleStaff[]>(`/v1/services/${businessId}/staff`, {
      serviceIds: serviceIds.length > 0 ? serviceIds.join(',') : null,
    })
  },

  availability(
    businessId: string,
    params: { serviceIds: string[]; staffId?: string | null; startDate?: string; endDate?: string },
  ): Promise<AvailabilityCalendar> {
    const window = availabilityWindow()
    return apiGet<AvailabilityCalendar>(
      `/v1/businesses/${businessId}/availability/calendar`,
      {
        serviceIds: params.serviceIds,
        staffId: params.staffId ?? null,
        startDate: params.startDate ?? window.startDate,
        endDate: params.endDate ?? window.endDate,
      },
    )
  },

  /**
   * Published reviews for a business, newest first.
   *
   * The route lives on `ReviewController`, whose class route is `v1` — so the
   * public review endpoints sit under the business, not under a `/reviews`
   * prefix.
   */
  reviews(businessId: string, page = 1, pageSize = 6): Promise<PaginatedResponse<PublicReview>> {
    return apiGet<PaginatedResponse<PublicReview>>(`/v1/businesses/${businessId}/reviews`, {
      page,
      pageSize,
    })
  },

  /** Average rating and the per-star counts behind it. */
  reviewSummary(businessId: string): Promise<ReviewSummary> {
    return apiGet<ReviewSummary>(`/v1/businesses/${businessId}/reviews/summary`)
  },
}

/** Booking. `POST /v1/appointments` requires an authenticated Customer. */
export const bookingApi = {
  create(body: CreateAppointmentRequest): Promise<Appointment> {
    return apiRequest<Appointment>('/v1/appointments', { method: 'POST', body })
  },

  mine(
    params: {
      page?: number
      pageSize?: number
      businessId?: string
      status?: string | null
      from?: string
      to?: string
      sortBy?: 'newest' | 'oldest' | 'upcoming'
    } = {},
  ): Promise<PaginatedResponse<Appointment>> {
    return apiGet<PaginatedResponse<Appointment>>('/v1/appointments', params)
  },

  /** The API binds the cancellation reason as `note` (nullable). */
  cancel(id: string, note?: string | null): Promise<Appointment> {
    const body: CancelAppointmentRequest = { note: note ?? null }
    return apiRequest<Appointment>(`/v1/appointments/${id}/cancel`, {
      method: 'POST',
      body,
    })
  },

  /** Customer self-service reschedule; omitted fields keep the current booking. */
  reschedule(id: string, body: RescheduleAppointmentRequest): Promise<Appointment> {
    return apiRequest<Appointment>(`/v1/appointments/${id}/reschedule`, {
      method: 'POST',
      body,
    })
  },
}
