import { useQuery } from '@tanstack/react-query'
import { apiGet, apiRequest } from '../api/client'
import { queryKeys } from '../api/query-client'
import type { AppointmentPaymentSummary } from '../api/types'

/**
 * A payment attempt against an appointment.
 *
 * `amount` is always computed by the server from the appointment's services — a
 * client never sends a money value, and never decides what is owed.
 */
export type Payment = {
  id: string
  businessId: string
  customerId: string | null
  appointmentId: string | null
  type: string
  method: string
  provider: string
  /** `pending` | `completed` | `failed` | `cancelled` | `reversed`. */
  status: string
  amount: number
  currency: string
  reference: string
  externalReference: string | null
  phoneNumber: string | null
  createdAt: string
  completedAt: string | null
  attempts: {
    attemptNumber: number
    provider: string
    status: string
    checkoutRequestId: string | null
    providerReference: string | null
    errorCode: string | null
    errorMessage: string | null
    createdAt: string
    completedAt: string | null
  }[]
}

export type CreatePaymentRequest = {
  appointmentId: string
  /** `cash` or `mpesa`. */
  method: string
  /** `full_payment` | `booking_fee` | `balance_payment`. */
  type: string
  /** Required for `mpesa`. */
  phoneNumber?: string | null
  /** Client-generated, so a double-tap cannot open two STK prompts. */
  idempotencyKey?: string | null
}

/**
 * Payments module read used by the Clients module and the storefront checkout.
 *
 * The appointments list carries no payment columns, so a payment summary is
 * fetched only when a caller asks for it — one request for one appointment,
 * never a fan-out across a page of rows.
 */
export const paymentsApi = {
  appointmentSummary(appointmentId: string): Promise<AppointmentPaymentSummary> {
    return apiGet<AppointmentPaymentSummary>(`/v1/payments/appointment/${appointmentId}`)
  },

  /**
   * Start a payment for an appointment.
   *
   * For `method: 'mpesa'` the API triggers a Daraja STK push and returns the
   * attempt in `pending`; the customer confirms on their handset and the trusted
   * webhook settles it. Nothing in the browser can mark a payment paid.
   */
  create(body: CreatePaymentRequest): Promise<Payment> {
    return apiRequest<Payment>('/v1/payments', { method: 'POST', body })
  },

  get(paymentId: string): Promise<Payment> {
    return apiGet<Payment>(`/v1/payments/${paymentId}`)
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

/**
 * Poll one payment until the provider settles it.
 *
 * The browser never decides the outcome, so the only honest thing it can do is
 * ask again. Polling stops as soon as the status leaves `pending`, and the
 * caller renders whatever the server last said.
 */
export function usePaymentStatus(paymentId: string | null) {
  return useQuery({
    queryKey: ['payments', 'payment', paymentId] as const,
    queryFn: () => paymentsApi.get(paymentId as string),
    enabled: Boolean(paymentId),
    refetchInterval: (query) => (query.state.data?.status === 'pending' ? 4000 : false),
    retry: false,
  })
}

