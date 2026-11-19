import { usePaymentsDashboard } from '../payments/api'

/**
 * The outstanding-verification count, from the one place that owns it.
 *
 * `GET /v1/payments/dashboard` aggregates `awaitingVerificationCount` server-side
 * for the caller's selected business, so the Finance navigation item, the Payments
 * section and the "Needs verification" tab all read the same number from the same
 * cached query — they cannot drift apart, and one request serves all three.
 *
 * Hooks that decide a claim (`useClaimDecisions`, `useBulkVerifyClaims`,
 * `useTransactionDecisions`) invalidate the `['payments']` prefix, which includes
 * this dashboard query, so the badges refresh after verify/reject/bulk-verify.
 */
export function useVerificationBadgeCount(enabled = true) {
  const query = usePaymentsDashboard(enabled)
  const raw = query.data?.awaitingVerificationCount
  const count = typeof raw === 'number' && Number.isFinite(raw) && raw > 0 ? raw : 0

  return {
    count,
    isLoading: query.isPending,
    isError: query.isError,
  }
}
