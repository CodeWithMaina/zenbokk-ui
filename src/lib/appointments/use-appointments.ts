import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { CreateAppointmentOnBehalfRequest, RescheduleAppointmentRequest } from '../api/types'
import { queryKeys } from '../api/query-client'
import { appointmentsApi, toAppointmentQuery } from './api'
import type { AppointmentRangeQuery } from './api'
import type { AppointmentFilters } from './types'

/**
 * Appointments module data access.
 *
 * Every read is keyed under the existing `['appointments', …]` prefix, so one
 * `invalidateQueries({ queryKey: ['appointments'] })` after a write refreshes
 * the list, the calendar pane, the detail screen, the activity feed and the
 * customer's history together — and nothing has to remember which of them it
 * touched.
 */

/** Paged list for the table and the cards view. Filtering is server-side. */
export function useAppointmentPage(
  filters: AppointmentFilters,
  page: number,
  pageSize: number,
  enabled = true,
) {
  const query = toAppointmentQuery(filters, page, pageSize)
  return useQuery({
    queryKey: queryKeys.ownerAppointments(query),
    queryFn: () => appointmentsApi.list(query),
    enabled,
    staleTime: 20_000,
  })
}

/**
 * A whole calendar pane (day, week or month).
 *
 * Deliberately a different query key from the paged list: the calendar walks
 * every page in the window, and sharing a key with the table's page 1 would
 * make the two views overwrite each other's cache entry.
 */
export function useAppointmentRange(query: AppointmentRangeQuery, enabled = true) {
  return useQuery({
    queryKey: queryKeys.appointmentRange(query),
    queryFn: () => appointmentsApi.listRange(query),
    enabled,
    staleTime: 20_000,
  })
}

/** One appointment, with every service line. */
export function useAppointment(appointmentId: string | null, enabled = true) {
  return useQuery({
    queryKey: queryKeys.appointmentDetail(appointmentId ?? ''),
    queryFn: () => appointmentsApi.get(appointmentId as string),
    enabled: enabled && Boolean(appointmentId),
    staleTime: 15_000,
  })
}

/** The appointment's persisted status history, newest first. */
export function useAppointmentActivity(appointmentId: string | null, enabled = true) {
  return useQuery({
    queryKey: queryKeys.appointmentActivity(appointmentId ?? ''),
    queryFn: () => appointmentsApi.activity(appointmentId as string),
    enabled: enabled && Boolean(appointmentId),
    staleTime: 15_000,
  })
}

/** One customer's appointment history inside this business. */
export function useCustomerAppointments(customerId: string | null, enabled = true) {
  return useQuery({
    queryKey: queryKeys.appointmentCustomerHistory(customerId ?? '', { pageSize: 50 }),
    queryFn: () =>
      appointmentsApi.list({
        customerId,
        sortBy: 'scheduledAt',
        sortDirection: 'desc',
        page: 1,
        pageSize: 50,
      }),
    enabled: enabled && Boolean(customerId),
    staleTime: 30_000,
  })
}

/** One staff member's appointments on a single day (the detail schedule strip). */
export function useStaffDay(staffId: string | null, day: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.appointmentStaffDay(staffId ?? '', { day }),
    queryFn: () =>
      appointmentsApi.list({
        staffId,
        from: new Date(`${day}T00:00:00`).toISOString(),
        to: new Date(`${day}T23:59:59.999`).toISOString(),
        sortBy: 'scheduledAt',
        sortDirection: 'asc',
        page: 1,
        pageSize: 100,
      }),
    enabled: enabled && Boolean(staffId) && Boolean(day),
    staleTime: 30_000,
  })
}

/**
 * Bookable slots for one service/staff/date combination.
 *
 * The booking drawer asks the server rather than deciding for itself, so the
 * times it offers are the times the API will actually accept.
 */
export function useAppointmentAvailability(
  input: {
    businessId: string
    serviceIds: readonly string[]
    staffId?: string | null
    date: string
  },
  enabled = true,
) {
  const params = {
    serviceIds: [...input.serviceIds],
    staffId: input.staffId ?? null,
    date: input.date,
  }
  return useQuery({
    queryKey: queryKeys.appointmentAvailability(input.businessId, params),
    queryFn: () =>
      appointmentsApi.availability({
        businessId: input.businessId,
        serviceIds: input.serviceIds,
        staffId: input.staffId ?? null,
        startDate: input.date,
        endDate: input.date,
      }),
    enabled:
      enabled && Boolean(input.businessId) && Boolean(input.date) && input.serviceIds.length > 0,
    staleTime: 15_000,
  })
}

/**
 * Every appointment write, with the cache invalidated once per mutation.
 *
 * `['appointments']` covers the list, the pane, the detail and the history;
 * `['payments']` is cleared too because completing or cancelling changes what
 * the appointment's payment summary can still do.
 */
export function useAppointmentMutations() {
  const queryClient = useQueryClient()
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['appointments'] })
    void queryClient.invalidateQueries({ queryKey: ['payments'] })
  }

  const create = useMutation({
    mutationFn: (payload: CreateAppointmentOnBehalfRequest) =>
      appointmentsApi.createOnBehalf(payload),
    onSuccess: invalidate,
  })

  const reschedule = useMutation({
    mutationFn: (input: { appointmentId: string; payload: RescheduleAppointmentRequest }) =>
      appointmentsApi.reschedule(input.appointmentId, input.payload),
    onSuccess: invalidate,
  })

  const cancel = useMutation({
    mutationFn: (input: { appointmentId: string; note?: string | null }) =>
      appointmentsApi.cancel(input.appointmentId, input.note ?? null),
    onSuccess: invalidate,
  })

  const confirm = useMutation({
    mutationFn: (appointmentId: string) => appointmentsApi.confirm(appointmentId),
    onSuccess: invalidate,
  })

  const complete = useMutation({
    mutationFn: (appointmentId: string) => appointmentsApi.complete(appointmentId),
    onSuccess: invalidate,
  })

  const markNoShow = useMutation({
    mutationFn: (appointmentId: string) => appointmentsApi.markNoShow(appointmentId),
    onSuccess: invalidate,
  })

  const updateNote = useMutation({
    mutationFn: (input: { appointmentId: string; note: string | null }) =>
      appointmentsApi.updateNote(input.appointmentId, input.note),
    onSuccess: invalidate,
  })

  return { create, reschedule, cancel, confirm, complete, markNoShow, updateNote }
}
