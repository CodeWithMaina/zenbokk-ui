import { useQuery } from '@tanstack/react-query'
import { apiGet } from '../api/client'
import { queryKeys } from '../api/query-client'
import type { AppointmentPaymentSummary } from '../api/types'

/**
 * Payments module read used by the Clients module.
 *
 * The appointments list carries no payment columns, so a payment summary is
 * fetched only when a caller asks for it — one request for one appointment,
 * never a fan-out across a page of rows.
 */
export const paymentsApi = {
  appointmentSummary(appointmentId: string): Promise<AppointmentPaymentSummary> {
    return apiGet<AppointmentPaymentSummary>(`/v1/payments/appointment/${appointmentId}`)
  },
}

export function useAppointmentPaymentSummary(appointmentId: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.appointmentPayment(appointmentId),
    queryFn: () => paymentsApi.appointmentSummary(appointmentId),
    enabled: enabled && appointmentId.length > 0,
    staleTime: 30_000,
  })
}
