import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { QueryClient } from '@tanstack/react-query'
import { apiGet, apiRequest } from '../api/client'
// The claim *is* a payment claim, so its shape lives with the payment contract and is
// imported here rather than re-declared. One type, one truth.
import type {
  Payment,
  PaymentVerificationFilters,
  PaymentVerificationItem,
  PaymentVerificationQueue,
} from '../payments/api'

/**
 * Finance > Reconciliation — the M-PESA claim verification board.
 *
 * These hit `/v1/finances/reconciliation/claims*`, the Finance module's door onto the same
 * `IPaymentService` the payments routes use. Nothing here decides money: every function is
 * a request for a decision the server makes, transactionally and idempotently.
 *
 * The rule the whole board rests on: a customer pasting an M-PESA message is a *claim*,
 * never a payment. Only `verify` settles anything.
 */

export type FinanceClaimFilters = PaymentVerificationFilters

/** What the owner states when confirming a claim. All optional except the id. */
export type VerifyClaimInput = {
  paymentId: string
  note?: string | null
  /** What the owner actually saw credited, when it differs from the claim. */
  receivedAmount?: number | null
  /** The receipt the owner read off their own statement, when they corrected it. */
  transactionReference?: string | null
  transactionExists?: boolean
  amountMatches?: boolean
  codeMatches?: boolean
  belongsToBusiness?: boolean
}

export const financeClaimKeys = {
  root: ['finances', 'reconciliation'] as const,
  list: (filters: FinanceClaimFilters) =>
    [
      ...financeClaimKeys.root,
      'claims',
      filters.status ?? 'awaiting',
      filters.search ?? '',
      filters.from ?? '',
      filters.to ?? '',
      filters.transactionFrom ?? '',
      filters.transactionTo ?? '',
      filters.minAmount ?? '',
      filters.maxAmount ?? '',
      filters.page ?? 1,
      filters.pageSize ?? 25,
    ] as const,
  detail: (paymentId: string) => [...financeClaimKeys.root, 'claim', paymentId] as const,
}

function toParams(filters: FinanceClaimFilters): Record<string, string | number | null> {
  return {
    status: filters.status ?? null,
    search: filters.search?.trim() || null,
    from: filters.from ?? null,
    to: filters.to ?? null,
    transactionFrom: filters.transactionFrom ?? null,
    transactionTo: filters.transactionTo ?? null,
    minAmount: filters.minAmount ?? null,
    maxAmount: filters.maxAmount ?? null,
    page: filters.page ?? null,
    pageSize: filters.pageSize ?? null,
  }
}

export const financeClaimsApi = {
  /** The claim queue with per-status counts. */
  list(filters: FinanceClaimFilters = {}): Promise<PaymentVerificationQueue> {
    return apiGet<PaymentVerificationQueue>('/v1/finances/reconciliation/claims', toParams(filters))
  },

  /** One claim in full, for the verification workspace. */
  get(paymentId: string): Promise<PaymentVerificationItem> {
    return apiGet<PaymentVerificationItem>(`/v1/finances/reconciliation/claims/${paymentId}`)
  },

  /** Confirm the money arrived. The only path from a pasted message to a settled payment. */
  verify(input: VerifyClaimInput): Promise<Payment> {
    const { paymentId, ...body } = input
    return apiRequest<Payment>(`/v1/finances/reconciliation/claims/${paymentId}/verify`, {
      method: 'POST',
      body,
    })
  },

  /** Refuse a claim. The reason is mandatory and is shown to the customer. */
  reject(paymentId: string, reason: string): Promise<Payment> {
    return apiRequest<Payment>(`/v1/finances/reconciliation/claims/${paymentId}/reject`, {
      method: 'POST',
      body: { reason },
    })
  },

  /** Set a claim aside for a second look. Non-terminal; the note stays internal. */
  flag(paymentId: string, note: string): Promise<Payment> {
    return apiRequest<Payment>(`/v1/finances/reconciliation/claims/${paymentId}/flag`, {
      method: 'POST',
      body: { note },
    })
  },

  /** Clear a flag and return the claim to an ordinary open review. */
  clearFlag(paymentId: string): Promise<Payment> {
    return apiRequest<Payment>(`/v1/finances/reconciliation/claims/${paymentId}/under-review`, {
      method: 'POST',
    })
  },
}

/**
 * Invalidate everything a claim decision can move: the queue, the claim, the Cashbook
 * figures it lands in and the appointment it belongs to. One helper, so a decision can
 * never leave a stale counter on screen.
 */
export function refreshClaims(queryClient: QueryClient, paymentId?: string) {
  void queryClient.invalidateQueries({ queryKey: financeClaimKeys.root })
  if (paymentId) void queryClient.invalidateQueries({ queryKey: financeClaimKeys.detail(paymentId) })
  // The ledger, the summary cards and the appointment's payment state all read the same money.
  void queryClient.invalidateQueries({ queryKey: ['finances'] })
  void queryClient.invalidateQueries({ queryKey: ['payments'] })
  void queryClient.invalidateQueries({ queryKey: ['appointments'] })
}

/** The claim queue, tenant-scoped by the server. */
export function useFinanceClaims(filters: FinanceClaimFilters, enabled = true) {
  return useQuery({
    queryKey: financeClaimKeys.list(filters),
    queryFn: () => financeClaimsApi.list(filters),
    enabled,
    placeholderData: (previous) => previous,
  })
}

/** One claim, for the detail workspace. */
/**
 * One claim, for the detail workspace.
 *
 * <para><b>Two deliberate choices.</b> There is no <c>placeholderData</c>: a claim is money, and
 * showing the previously-opened claim's details while a new one loads would put somebody else's
 * amount on screen under this claim's heading. And <c>retry</c> is limited, because a claim that
 * cannot be loaded should say so quickly rather than spin.</para>
 *
 * <para><b>Why callers must not use <c>isPending</c> for a loading flag.</b> While no claim is
 * selected the query is disabled, and a disabled query in TanStack Query v5 reports
 * <c>status: 'pending'</c> — so <c>isPending</c> is permanently true. Use
 * <c>isFetching</c> (or <c>isLoading</c>) for "a request is in flight" and the presence of a
 * selected id for "the drawer is open".</para>
 */
export function useFinanceClaim(paymentId: string | null, enabled = true) {
  return useQuery({
    queryKey: financeClaimKeys.detail(paymentId ?? ''),
    queryFn: () => financeClaimsApi.get(paymentId as string),
    enabled: enabled && Boolean(paymentId),
    retry: 1,
    staleTime: 5_000,
  })
}

/** Verify / reject / flag / clear-flag. */
export function useClaimDecisions() {
  const queryClient = useQueryClient()

  const verify = useMutation({
    mutationFn: (input: VerifyClaimInput) => financeClaimsApi.verify(input),
    onSuccess: (_payment, input) => refreshClaims(queryClient, input.paymentId),
  })

  const reject = useMutation({
    mutationFn: (input: { paymentId: string; reason: string }) =>
      financeClaimsApi.reject(input.paymentId, input.reason),
    onSuccess: (_payment, input) => refreshClaims(queryClient, input.paymentId),
  })

  const flag = useMutation({
    mutationFn: (input: { paymentId: string; note: string }) =>
      financeClaimsApi.flag(input.paymentId, input.note),
    onSuccess: (_payment, input) => refreshClaims(queryClient, input.paymentId),
  })

  const clearFlag = useMutation({
    mutationFn: (paymentId: string) => financeClaimsApi.clearFlag(paymentId),
    onSuccess: (_payment, paymentId) => refreshClaims(queryClient, paymentId),
  })

  return { verify, reject, flag, clearFlag }
}
