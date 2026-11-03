import { apiGet, apiRequest } from '../api/client'
import type {
  Appointment,
  AppointmentDashboard,
  AvailabilitySlot,
  CreateAppointmentOnBehalfRequest,
  RescheduleAppointmentRequest,
} from '../api/types'
import type { AppointmentFilters, AppointmentSort } from './types'
import { isClientSort, resolveDateWindow } from './types'

/**
 * Appointments module client.
 *
 * Every route resolves the business from the caller's token — the client never
 * names its own business id — and each one is gated server-side by the
 * `appointments` module plus the owner/staff policy, so callers check
 * entitlements before asking.
 *
 * The list is the owner dashboard endpoint: it returns the requested page plus
 * the customers/staff/services buckets the filter drawer needs, in one round
 * trip, so the drawer never fans out.
 */

const APPOINTMENTS_PATH = '/v1/businesses/me/appointments'

/** What the list endpoint receives. Scalars only, matching the controller. */
export type AppointmentQuery = {
  search?: string | null
  status?: string | null
  from?: string | null
  to?: string | null
  staffId?: string | null
  customerId?: string | null
  serviceId?: string | null
  sortBy?: string
  sortDirection?: 'asc' | 'desc'
  page?: number
  pageSize?: number
}

/** One entry of the appointment's persisted status history. */
export type AppointmentActivityEntry = {
  id: string
  status: string
  changedAt: string
  changedByUserId: string | null
  changedByName: string | null
  note: string | null
}

/**
 * Turn the screens' filter set into the endpoint's query.
 *
 * The date preset is resolved here so every caller sends the same window, and
 * the sort maps onto the two orderings the database actually performs; a
 * non-date sort leaves the API on `scheduledAt` and is applied to the page by
 * `sortAppointments`.
 */
export function toAppointmentQuery(
  filters: AppointmentFilters,
  page: number,
  pageSize: number,
  now: Date = new Date(),
): AppointmentQuery {
  const window = resolveDateWindow(filters, now)
  const serverSort: AppointmentSort = isClientSort(filters.sort) ? 'when-asc' : filters.sort

  return {
    search: filters.search.trim() || null,
    status: filters.status,
    staffId: filters.staffId,
    serviceId: filters.serviceId,
    from: window.from,
    to: window.to,
    sortBy: 'scheduledAt',
    sortDirection: serverSort === 'when-desc' ? 'desc' : 'asc',
    page,
    pageSize,
  }
}

/** A window query for the calendar, which shows a whole pane rather than a page. */
export type AppointmentRangeQuery = {
  search?: string | null
  status?: string | null
  staffId?: string | null
  serviceId?: string | null
  from: string
  to: string
  sortDirection?: 'asc' | 'desc'
}


export const appointmentsApi = {
  /** DB-first filtered, sorted and paginated page, plus the reference buckets. */
  list(query: AppointmentQuery): Promise<AppointmentDashboard> {
    return apiGet<AppointmentDashboard>(APPOINTMENTS_PATH, query)
  },

  /**
   * Every appointment inside a window, walking pages until the server says it
   * is done (or the cap is reached). Used by the calendar, which must render the
   * whole pane — a page of 20 would leave holes in a day column.
   */
  async listRange(query: AppointmentRangeQuery): Promise<AppointmentDashboard> {
    const first = await appointmentsApi.list({
      ...query,
      sortBy: 'scheduledAt',
      sortDirection: query.sortDirection ?? 'asc',
      page: 1,
      pageSize: CALENDAR_PAGE_SIZE,
    })

    const pages = Math.min(first.meta.totalPages, CALENDAR_MAX_PAGES)
    if (pages <= 1) return first

    const rest = await Promise.all(
      Array.from({ length: pages - 1 }, (_, index) =>
        appointmentsApi.list({
          ...query,
          sortBy: 'scheduledAt',
          sortDirection: query.sortDirection ?? 'asc',
          page: index + 2,
          pageSize: CALENDAR_PAGE_SIZE,
        }),
      ),
    )

    return {
      meta: first.meta,
      appointments: [first, ...rest].flatMap((page) => page.appointments),
      // Reference buckets are identical on every page; take the first response's.
      customers: first.customers,
      staff: first.staff,
      services: first.services,
    }
  },

  /** One appointment, with every service line and any pending reschedule. */
  get(appointmentId: string): Promise<Appointment> {
    return apiGet<Appointment>(`${APPOINTMENTS_PATH}/${appointmentId}`)
  },

  /** The appointment's persisted status history, newest first. */
  activity(appointmentId: string): Promise<AppointmentActivityEntry[]> {
    return apiGet<AppointmentActivityEntry[]>(`${APPOINTMENTS_PATH}/${appointmentId}/activity`)
  },

  /** Owner books on behalf of an enrolled customer. */
  createOnBehalf(payload: CreateAppointmentOnBehalfRequest): Promise<Appointment> {
    return apiRequest<Appointment>(APPOINTMENTS_PATH, { method: 'POST', body: payload })
  },

  reschedule(appointmentId: string, payload: RescheduleAppointmentRequest): Promise<Appointment> {
    return apiRequest<Appointment>(`${APPOINTMENTS_PATH}/${appointmentId}/reschedule`, {
      method: 'POST',
      body: payload,
    })
  },

  /** The owner route binds the reason as `note`, not `reason`. */
  cancel(appointmentId: string, note?: string | null): Promise<Appointment> {
    return apiRequest<Appointment>(`${APPOINTMENTS_PATH}/${appointmentId}/cancel`, {
      method: 'POST',
      body: { note: note ?? null },
    })
  },

  confirm(appointmentId: string): Promise<Appointment> {
    return apiRequest<Appointment>(`${APPOINTMENTS_PATH}/${appointmentId}/confirm`, {
      method: 'POST',
    })
  },

  complete(appointmentId: string): Promise<Appointment> {
    return apiRequest<Appointment>(`${APPOINTMENTS_PATH}/${appointmentId}/complete`, {
      method: 'POST',
    })
  },

  markNoShow(appointmentId: string): Promise<Appointment> {
    return apiRequest<Appointment>(`${APPOINTMENTS_PATH}/${appointmentId}/no-show`, {
      method: 'POST',
    })
  },

  /** Replaces the business's working note (empty clears it). */
  updateNote(appointmentId: string, note: string | null): Promise<Appointment> {
    return apiRequest<Appointment>(`${APPOINTMENTS_PATH}/${appointmentId}/note`, {
      method: 'PATCH',
      body: { note },
    })
  },

  /**
   * Bookable slots for a business across a date range.
   *
   * The route is public, but it still needs the business id and the service ids
   * being booked, so the caller passes what the dashboard context already
   * resolved rather than guessing.
   */
  availability(input: {
    businessId: string
    serviceIds: readonly string[]
    staffId?: string | null
    startDate: string
    endDate: string
  }): Promise<AvailabilitySlot[]> {
    return apiGet<AvailabilitySlot[]>(`/v1/businesses/${input.businessId}/availability`, {
      serviceIds: [...input.serviceIds],
      staffId: input.staffId ?? null,
      startDate: input.startDate,
      endDate: input.endDate,
    })
  },
}

/**
 * Hard ceiling on how many pages the calendar will walk.
 *
 * A busy month at 100 rows a page is still comfortably inside this, and the cap
 * keeps a pathological range ("all dates" on a decade-old tenant) from turning
 * one screen into hundreds of requests.
 */
export const CALENDAR_PAGE_SIZE = 100
export const CALENDAR_MAX_PAGES = 6
