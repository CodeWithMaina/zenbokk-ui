import { apiGet, apiRequest } from '../api/client'
import { toDateInputValue } from '../format'
import type {
  Appointment,
  AvailabilityCalendar,
  CancelAppointmentRequest,
  CreateAppointmentRequest,
  EligibleStaff,
  GuestBookingStartRequest,
  GuestBookingStartResponse,
  GuestBookingVerifyRequest,
  GuestBookingVerifyResponse,
  PaginatedResponse,
  PublicGallery,
  PublicLandingPage,
  PublicOpeningHours,
  PublicReview,
  RescheduleAppointmentRequest,
  ReviewSummary,
  ServiceCatalogItem,
  StorefrontBootstrap,
  StorefrontEnquiryRequest,
  StorefrontEnquiryResponse,
  StorefrontSearchResponse,
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

  /**
   * One service from the public catalogue.
   *
   * Used by the service detail page. The list endpoint already carries every
   * field this returns, so the detail query normally resolves from cache — the
   * request only happens on a cold deep link into `…/services/{id}`.
   */
  service(businessId: string, serviceId: string): Promise<ServiceCatalogItem> {
    return apiGet<ServiceCatalogItem>(`/v1/services/${businessId}/${serviceId}`)
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

  /**
   * Send a storefront enquiry.
   *
   * Anonymous by design — the visitor is not asked to create an account to ask
   * a question. The response is the server's own reference; the client never
   * invents one, and a failure is surfaced rather than dressed up as success.
   */
  sendEnquiry(
    businessId: string,
    body: StorefrontEnquiryRequest,
  ): Promise<StorefrontEnquiryResponse> {
    return apiRequest<StorefrontEnquiryResponse>(`/v1/businesses/${businessId}/enquiries`, {
      method: 'POST',
      body,
    })
  },

  /**
   * The business's published photo gallery.
   *
   * Anonymous and business-scoped: the server resolves the business's ordered
   * gallery media into ready image variants. The browser never builds a storage
   * URL, and an image the owner uploaded but never attached is unreachable here.
   */
  gallery(businessId: string): Promise<PublicGallery> {
    return apiGet<PublicGallery>(`/v1/businesses/${businessId}/gallery`)
  },

  /**
   * The business's opening hours, business-local, derived from the same
   * scheduling data the availability engine reads.
   */
  openingHours(businessId: string): Promise<PublicOpeningHours> {
    return apiGet<PublicOpeningHours>(`/v1/businesses/${businessId}/opening-hours`)
  },

  /**
   * Server-side search across the business's published services and public
   * roster. `type` narrows to `services` or `team`.
   */
  search(
    businessId: string,
    params: { q: string; type?: string; page?: number; pageSize?: number },
  ): Promise<StorefrontSearchResponse> {
    return apiGet<StorefrontSearchResponse>(`/v1/businesses/${businessId}/search`, {
      q: params.q,
      type: params.type ?? null,
      page: params.page ?? null,
      pageSize: params.pageSize ?? null,
    })
  },
}

/** Booking. `POST /v1/appointments` requires an authenticated Customer. */
export const bookingApi = {
  /**
   * Create an appointment.
   *
   * `guestToken` is the short-lived customer token a verified guest holds. It is
   * sent as the bearer for this call only — the guest is never written into the
   * app's session, because they do not have a profile to hydrate one with.
   */
  create(body: CreateAppointmentRequest, guestToken?: string | null): Promise<Appointment> {
    return apiRequest<Appointment>('/v1/appointments', {
      method: 'POST',
      body,
      headers: guestToken ? { Authorization: `Bearer ${guestToken}` } : undefined,
    })
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
    guestToken?: string | null,
  ): Promise<PaginatedResponse<Appointment>> {
    return apiGet<PaginatedResponse<Appointment>>('/v1/appointments', params, {
      headers: guestToken ? { Authorization: `Bearer ${guestToken}` } : undefined,
    })
  },

  /** The API binds the cancellation reason as `note` (nullable). */
  cancel(id: string, note?: string | null, guestToken?: string | null): Promise<Appointment> {
    const body: CancelAppointmentRequest = { note: note ?? null }
    return apiRequest<Appointment>(`/v1/appointments/${id}/cancel`, {
      method: 'POST',
      body,
      headers: guestToken ? { Authorization: `Bearer ${guestToken}` } : undefined,
    })
  },

  /** Customer self-service reschedule; omitted fields keep the current booking. */
  reschedule(
    id: string,
    body: RescheduleAppointmentRequest,
    guestToken?: string | null,
  ): Promise<Appointment> {
    return apiRequest<Appointment>(`/v1/appointments/${id}/reschedule`, {
      method: 'POST',
      body,
      headers: guestToken ? { Authorization: `Bearer ${guestToken}` } : undefined,
    })
  },
}

/**
 * Booking without an account.
 *
 * Two steps: ask for a one-time code to be sent to the visitor's email, then
 * exchange the code for a short-lived customer token. The booking itself is then
 * made through `bookingApi.create` with that token, so every existing booking
 * rule applies unchanged.
 */
export const guestBookingApi = {
  start(businessId: string, body: GuestBookingStartRequest): Promise<GuestBookingStartResponse> {
    return apiRequest<GuestBookingStartResponse>(
      `/v1/businesses/${businessId}/guest-booking/start`,
      { method: 'POST', body },
    )
  },

  verify(businessId: string, body: GuestBookingVerifyRequest): Promise<GuestBookingVerifyResponse> {
    return apiRequest<GuestBookingVerifyResponse>(
      `/v1/businesses/${businessId}/guest-booking/verify`,
      { method: 'POST', body },
    )
  },
}
