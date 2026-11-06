import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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
  /**
   * `created` (pending) | `awaiting_customer` | `processing` | `submitted` |
   * `under_review` | `verified` | `success` | `rejected` | `failed` | `expired` |
   * `cancelled` | `reversed` | `refunded`.
   */
  status: string
  amount: number
  currency: string
  reference: string
  externalReference: string | null
  phoneNumber: string | null
  createdAt: string
  completedAt: string | null
  /** The confirmation SMS exactly as the customer pasted it. */
  submittedMessage: string | null
  submittedAt: string | null
  /** Server-parsed M-PESA receipt code — never a client value. */
  parsedTransactionCode: string | null
  parsedAmount: number | null
  parsedTransactionAt: string | null
  parsedRecipient: string | null
  verifiedAt: string | null
  verifiedByUserId: string | null
  rejectedAt: string | null
  rejectedByUserId: string | null
  rejectionReason: string | null
  /** Append-only trail of submissions and decisions, oldest first. */
  verificationEvents: PaymentVerificationEvent[]
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

/** One entry of a manual M-PESA payment's verification trail. */
export type PaymentVerificationEvent = {
  id: string
  /** `submitted` | `under_review` | `verified` | `rejected` | `expired`. */
  kind: string
  actorUserId: string | null
  actorName: string | null
  amount: number | null
  transactionCode: string | null
  message: string | null
  reason: string | null
  createdAt: string
}

export type CreatePaymentRequest = {
  appointmentId: string
  /** `cash` or `mpesa`. */
  method: string
  /** `full_payment` | `booking_fee` | `balance_payment`. */
  type: string
  /** Required for `mpesa` only when the platform drives the handset (an STK push). */
  phoneNumber?: string | null
  /** Client-generated, so a double-tap cannot open two STK prompts. */
  idempotencyKey?: string | null
}

/**
 * What the storefront is told about paying a business.
 *
 * `enabled` false means the manual channel is off or half-configured, in which
 * case no numbers are returned at all — the UI must not render an instruction the
 * customer cannot follow.
 */
export type PublicPaymentDetails = {
  businessId: string
  businessName: string
  currency: string
  enabled: boolean
  /** `paybill` | `till` | null. */
  accountType: string | null
  paybillNumber: string | null
  paybillAccount: string | null
  tillNumber: string | null
  payeeName: string | null
  instructions: string | null
  bookingFeePercentage: number
  cashEnabled: boolean
}

/** One row of the owner's payment-verification queue. */
export type PaymentVerificationItem = {
  paymentId: string
  appointmentId: string | null
  appointmentStatus: string | null
  scheduledAt: string | null
  customerId: string | null
  customerName: string | null
  customerPhone: string | null
  serviceNames: string[]
  /** What the business is owed for this payment. */
  expectedAmount: number
  /** What the pasted message says was paid. */
  submittedAmount: number | null
  currency: string
  status: string
  reference: string
  transactionCode: string | null
  transactionAt: string | null
  recipient: string | null
  payer: string | null
  submittedMessage: string | null
  submittedAt: string | null
  /** The parsed amount differs from what is owed. */
  amountMismatch: boolean
  /** Set when this receipt has been used on another payment. */
  duplicateOfPaymentId: string | null
  verificationEvents: PaymentVerificationEvent[]
}

export type PaymentVerificationQueue = {
  items: PaymentVerificationItem[]
  page: number
  pageSize: number
  totalCount: number
  awaitingCount: number
  awaitingAmount: number
  verifiedCount: number
  rejectedCount: number
}

export type PaymentVerificationFilters = {
  /** `awaiting` (default) | `submitted` | `under_review` | `verified` | `rejected` | `all`. */
  status?: string
  search?: string
  page?: number
  pageSize?: number
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
   * For `method: 'mpesa'` the API either triggers a Daraja STK push (and returns the
   * attempt in `pending`) or — when the business collects manually — records a
   * booking-fee payment awaiting a pasted confirmation. Either way, nothing in the
   * browser can mark a payment paid.
   *
   * `guestToken` is the short-lived customer token a verified guest holds. It is sent
   * as the bearer for this call only, exactly as `bookingApi.create` does, because a
   * guest has no session to hydrate.
   */
  create(body: CreatePaymentRequest, guestToken?: string | null): Promise<Payment> {
    return apiRequest<Payment>('/v1/payments', {
      method: 'POST',
      body,
      headers: guestToken ? { Authorization: `Bearer ${guestToken}` } : undefined,
    })
  },

  get(paymentId: string): Promise<Payment> {
    return apiGet<Payment>(`/v1/payments/${paymentId}`)
  },

  /**
   * The business's manual M-PESA details and booking-fee percentage.
   *
   * Anonymous on purpose: a visitor has to be able to read the payment
   * instructions before committing to a booking. `enabled: false` means the
   * business has not configured the channel, and no numbers come back.
   */
  publicDetails(businessId: string): Promise<PublicPaymentDetails> {
    return apiGet<PublicPaymentDetails>(`/v1/businesses/${businessId}/payment-details`)
  },

  /**
   * Submit the M-PESA confirmation SMS the customer received.
   *
   * There is no amount field: the server parses the amount out of the message and
   * compares it against what is owed. A valid submission does NOT settle the
   * payment — it queues it for the business to verify.
   */
  submitMpesaMessage(paymentId: string, message: string, guestToken?: string | null): Promise<Payment> {
    return apiRequest<Payment>(`/v1/payments/${paymentId}/mpesa-message`, {
      method: 'POST',
      body: { message },
      headers: guestToken ? { Authorization: `Bearer ${guestToken}` } : undefined,
    })
  },

  /** The owner's verification queue and history, tenant-scoped. */
  verificationQueue(filters: PaymentVerificationFilters = {}): Promise<PaymentVerificationQueue> {
    return apiGet<PaymentVerificationQueue>('/v1/payments/verification', {
      status: filters.status ?? null,
      search: filters.search?.trim() || null,
      page: filters.page ?? null,
      pageSize: filters.pageSize ?? null,
    })
  },

  /** Mark a submission as being reviewed (non-terminal, idempotent). */
  markUnderReview(paymentId: string): Promise<Payment> {
    return apiRequest<Payment>(`/v1/payments/${paymentId}/verification/under-review`, { method: 'POST' })
  },

  /** Confirm the money arrived. The only path from a pasted SMS to a settled payment. */
  approve(paymentId: string, note?: string | null): Promise<Payment> {
    return apiRequest<Payment>(`/v1/payments/${paymentId}/verification/approve`, {
      method: 'POST',
      body: { note: note ?? null },
    })
  },

  /** Refuse a submission. The reason is mandatory and is shown to the customer. */
  reject(paymentId: string, reason: string): Promise<Payment> {
    return apiRequest<Payment>(`/v1/payments/${paymentId}/verification/reject`, {
      method: 'POST',
      body: { reason },
    })
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

/** The business's public manual M-PESA details. Cached per business. */
export function usePublicPaymentDetails(businessId: string, enabled = true) {
  return useQuery({
    queryKey: ['payments', 'public-details', businessId] as const,
    queryFn: () => paymentsApi.publicDetails(businessId),
    enabled: enabled && businessId.length > 0,
    // Payment details change only when the owner edits them.
    staleTime: 5 * 60_000,
  })
}

/** The owner's verification queue. */
export function usePaymentVerificationQueue(
  filters: PaymentVerificationFilters,
  enabled = true,
) {
  return useQuery({
    queryKey: [
      'payments',
      'verification',
      filters.status ?? 'awaiting',
      filters.search ?? '',
      filters.page ?? 1,
      filters.pageSize ?? 25,
    ] as const,
    queryFn: () => paymentsApi.verificationQueue(filters),
    enabled,
    placeholderData: (previous) => previous,
  })
}

/**
 * Owner decisions on a submitted payment.
 *
 * Each mutation invalidates the queue and the payment itself, so the row the owner
 * just acted on can never keep showing the old decision while the counters move.
 */
export function usePaymentVerificationActions() {
  const queryClient = useQueryClient()

  const refresh = (paymentId?: string) => {
    void queryClient.invalidateQueries({ queryKey: ['payments'] })
    if (paymentId) {
      void queryClient.invalidateQueries({ queryKey: ['payments', 'payment', paymentId] })
    }
    void queryClient.invalidateQueries({ queryKey: ['appointments'] })
  }

  const markUnderReview = useMutation({
    mutationFn: (paymentId: string) => paymentsApi.markUnderReview(paymentId),
    onSuccess: (_data, paymentId) => refresh(paymentId),
  })

  const approve = useMutation({
    mutationFn: (input: { paymentId: string; note?: string | null }) =>
      paymentsApi.approve(input.paymentId, input.note),
    onSuccess: (_data, input) => refresh(input.paymentId),
  })

  const reject = useMutation({
    mutationFn: (input: { paymentId: string; reason: string }) =>
      paymentsApi.reject(input.paymentId, input.reason),
    onSuccess: (_data, input) => refresh(input.paymentId),
  })

  return { markUnderReview, approve, reject }
}

/**
 * Submit a pasted M-PESA confirmation.
 *
 * Deliberately does NOT treat the response as "paid": the server returns the
 * payment in `submitted`, and the UI reports that a person will review it.
 */
export function useSubmitMpesaMessage(guestToken?: string | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: { paymentId: string; message: string }) =>
      paymentsApi.submitMpesaMessage(input.paymentId, input.message, guestToken),
    onSuccess: (payment) => {
      queryClient.setQueryData(['payments', 'payment', payment.id], payment)
      void queryClient.invalidateQueries({
        queryKey: ['payments', 'appointment', payment.appointmentId ?? ''],
      })
    },
  })
}

