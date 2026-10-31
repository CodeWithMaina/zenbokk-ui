import { apiDownload, apiGet, apiRequest } from '../api/client'
import type {
  BusinessCustomer,
  CustomerActivityFeedResponse,
  CustomerDetailsResponse,
  CustomerOverview,
  LoyaltyActivityPage,
  ManualStampRequest,
  ManualStampResponse,
  PaginatedResponse,
  StampAdjustmentRequest,
  StampAdjustmentResponse,
} from '../api/types'

/**
 * Clients (customer management) reads and writes, as exposed by
 * `BusinessController.Customers.cs`, `StampController` and
 * `LoyaltyStampingController`.
 *
 * Every route below resolves the business from the caller's token — no caller
 * names its own business id — and each one is gated server-side by the module
 * that owns it (`customers`, `stamps`, `loyalty`), so callers check
 * entitlements before asking.
 */

const CUSTOMERS_PATH = '/v1/businesses/me/customers'

/**
 * The roster endpoint's `status` values.
 *
 * `null` is the endpoint's default: active enrollments only. Any value the
 * endpoint does not recognise disables the enrollment-status filter, which is
 * how the All view is requested (`ALL`) — `active` and `ready` are *engagement*
 * filters applied on top of that.
 */
export const ROSTER_STATUS = {
  /** Every enrollment status (active + left + blocked). */
  all: 'all',
  /** Active enrollments — the endpoint's default. */
  active: null,
  /** Active enrollments with a stamp in the trailing 7 days. */
  recent: 'active',
  /** Active enrollments whose card has reached the reward threshold. */
  rewardReady: 'ready',
  left: 'left',
  blocked: 'blocked',
} as const

export type ClientRosterFilters = {
  /** Matched server-side against name, email and phone number. */
  search?: string | null
  /** One of `ROSTER_STATUS`, or a raw value for a future server filter. */
  status?: string | null
  programId?: string | null
  enrolledFrom?: string | null
  enrolledTo?: string | null
  sortBy?: 'recent' | 'stamps' | 'name'
  sortDirection?: 'asc' | 'desc'
  page?: number
  pageSize?: number
}

export type ClientStatusCounts = {
  all: number
  active: number
  left: number
  blocked: number
}

export const clientsApi = {
  /** Paged, business-scoped roster with server-side search, filter and sort. */
  list(filters: ClientRosterFilters = {}): Promise<PaginatedResponse<BusinessCustomer>> {
    return apiGet<PaginatedResponse<BusinessCustomer>>(CUSTOMERS_PATH, filters)
  },

  /**
   * One roster row. Used by the details page as a cheap identity read, and by
   * the "find a client" step of the add-client flow.
   */
  get(customerId: string): Promise<BusinessCustomer> {
    return apiGet<BusinessCustomer>(`${CUSTOMERS_PATH}/${customerId}`)
  },

  /** Aggregated identity + status + metrics + loyalty summary for the Overview. */
  details(customerId: string): Promise<CustomerDetailsResponse> {
    return apiGet<CustomerDetailsResponse>(`${CUSTOMERS_PATH}/${customerId}/details`)
  },

  /** Paginated stamp + redemption feed for one customer. */
  activity(
    customerId: string,
    page = 1,
    pageSize = 10,
  ): Promise<CustomerActivityFeedResponse> {
    return apiGet<CustomerActivityFeedResponse>(`${CUSTOMERS_PATH}/${customerId}/activity`, {
      page,
      pageSize,
    })
  },

  /** Summary counts for the roster header and filter chips. */
  overview(): Promise<CustomerOverview> {
    return apiGet<CustomerOverview>(`${CUSTOMERS_PATH}/overview`)
  },

  /**
   * Counts per enrollment status. Each count is the server's own `totalCount`
   * for a one-row page, so the chips never disagree with the list.
   */
  async statusCounts(): Promise<ClientStatusCounts> {
    const count = async (status: string | null) => {
      const page = await clientsApi.list({ status, page: 1, pageSize: 1 })
      return page.totalCount
    }

    const [all, active, left, blocked] = await Promise.all([
      count(ROSTER_STATUS.all),
      count(ROSTER_STATUS.active),
      count(ROSTER_STATUS.left),
      count(ROSTER_STATUS.blocked),
    ])

    return { all, active, left, blocked }
  },

  /**
   * `GET …/customers/export` — the roster as CSV. The endpoint filters by the
   * search term only; status, sorting and selection are not part of its
   * contract.
   */
  exportCsv(search?: string | null): Promise<Blob> {
    return apiDownload(`${CUSTOMERS_PATH}/export`, { search })
  },

  /**
   * `POST /v1/stamps/adjust` — owner-only correction against a card, carrying a
   * reason code and an optional note. Requires the `stamps` module and the
   * `stamps.adjust` permission.
   */
  adjustStamps(payload: StampAdjustmentRequest): Promise<StampAdjustmentResponse> {
    return apiRequest<StampAdjustmentResponse>('/v1/stamps/adjust', {
      method: 'POST',
      body: payload,
    })
  },

  /**
   * `POST /v1/loyalty/stamps/manual` — ledger-backed manual award or correction
   * (source MANUAL for a credit, ADJUSTMENT for a debit). Requires the `loyalty`
   * module; the API requires a reason on every manual action.
   */
  awardManualStamps(payload: ManualStampRequest): Promise<ManualStampResponse> {
    return apiRequest<ManualStampResponse>('/v1/loyalty/stamps/manual', {
      method: 'POST',
      body: payload,
    })
  },

  /** The business's append-only loyalty ledger, filtered to one customer. */
  loyaltyLedger(
    customerId: string,
    page = 1,
    pageSize = 10,
  ): Promise<LoyaltyActivityPage> {
    return apiGet<LoyaltyActivityPage>('/v1/loyalty/stamps/activity', {
      customerId,
      page,
      pageSize,
    })
  },
}
