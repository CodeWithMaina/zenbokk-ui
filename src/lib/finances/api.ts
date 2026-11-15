import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiRequest } from '../api/client'

/**
 * Financial management API — the business's own books.
 *
 * Two things here are worth reading before using this module:
 *
 *  - **Amounts are numbers the server computed.** The ledger is the authority; nothing in this
 *    client decides what a business earned or spent.
 *  - **Verification and reconciliation are separate axes.** A row can be `verified` (the money is
 *    confirmed) and still `unreconciled` (nobody has compared it with the M-Pesa statement yet), or
 *    vice versa. Code that treats them as one flag will get money wrong.
 */

/** `income` | `expense` | `refund` | `adjustment`. */
export type FinancialTransactionType = 'income' | 'expense' | 'refund' | 'adjustment'

/** `punched_booking` | `walk_in` | `product_sale` | `manual_income` | `other`. */
export type TransactionSource = 'punched_booking' | 'walk_in' | 'product_sale' | 'manual_income' | 'other'

/** `mpesa_till` | `mpesa_paybill` | `mpesa_send_money` | `cash` | `bank_transfer` | `card` | `other`. */
export type FinancialPaymentMethod =
  | 'mpesa_till'
  | 'mpesa_paybill'
  | 'mpesa_send_money'
  | 'cash'
  | 'bank_transfer'
  | 'card'
  | 'other'

/** `pending` | `verified` | `rejected`. Only `verified` is revenue. */
export type FinancialVerificationStatus = 'pending' | 'verified' | 'rejected'

/** `unreconciled` | `matched` | `discrepancy` | `excluded`. */
export type ReconciliationStatus = 'unreconciled' | 'matched' | 'discrepancy' | 'excluded'

/** One ledger row as the API presents it. */
export type FinancialTransaction = {
  id: string
  businessId: string
  type: FinancialTransactionType
  source: TransactionSource
  paymentMethod: FinancialPaymentMethod
  verificationStatus: FinancialVerificationStatus
  reconciliationStatus: ReconciliationStatus
  amount: number
  /** Signed for display: positive income, negative expense/refund. */
  signedAmount: number
  currency: string
  reference: string
  externalReference: string | null
  category: string | null
  categoryLabel: string | null
  description: string | null
  customerId: string | null
  customerName: string | null
  appointmentId: string | null
  sourcePaymentId: string | null
  refundOfTransactionId: string | null
  refundReason: string | null
  refundReference: string | null
  transactionDate: string
  recordedAt: string
  verifiedAt: string | null
  verifiedByUserId: string | null
  rejectionReason: string | null
  createdByUserId: string | null
  updatedAt: string
  isVoided: boolean
  voidedAt: string | null
  voidReason: string | null
  reconciledAt: string | null
  statementLineId: string | null
  reconciliationNote: string | null
  /** Still refundable against this row (0 when it is not refundable). */
  refundableAmount: number
  /** True when the owner typed the evidence rather than a provider confirming it. */
  isOwnerRecorded: boolean
  /** Display name of whoever recorded the row, when the server could resolve it. */
  createdByName: string | null
  /** `incoming` | `outgoing`, classified by the server. */
  direction: FinancialDirection
}

/** A page of ledger rows plus the totals for the filter that produced them. */
export type FinancialTransactionList = {
  items: FinancialTransaction[]
  page: number
  pageSize: number
  totalCount: number
  verifiedIncomeTotal: number
  expenseTotal: number
  refundTotal: number
  /** Expenses in the current calendar month. Populated by the expense register only. */
  currentMonthExpenseTotal: number
  /** Total pages for the FILTERED result set. */
  totalPages: number
}

/** One labelled slice of a breakdown. */
export type FinancialBreakdownItem = {
  key: string
  label: string
  amount: number
  count: number
  percentage: number
}

/** The six headline figures for a period. */
export type FinancialOverviewTotals = {
  verifiedIncome: number
  pendingVerification: number
  pendingVerificationCount: number
  paymentsAwaitingVerification: number
  totalExpenses: number
  totalRefunds: number
  netCashMovement: number
  outstandingBalances: number
  outstandingAppointmentCount: number
  currency: string
}

export type FinancialOverview = {
  period: string
  from: string
  to: string
  totals: FinancialOverviewTotals
  revenueBreakdown: FinancialBreakdownItem[]
  paymentMethodBreakdown: FinancialBreakdownItem[]
  expenseBreakdown: FinancialBreakdownItem[]
  recentActivity: FinancialTransaction[]
}

/** `incoming` | `outgoing` — which way the money moved, as the SERVER classifies it. */
export type FinancialDirection = 'incoming' | 'outgoing'

/** One movement in the cashbook. */
export type CashbookEntry = {
  id: string
  date: string
  type: FinancialTransactionType
  /** The server's own classification: a refund is `outgoing` even though it reverses money in. */
  direction: FinancialDirection
  amount: number
  description: string | null
  reference: string
  externalReference: string | null
  paymentMethod: FinancialPaymentMethod
  source: TransactionSource
  customerName: string | null
  category: string | null
  verificationStatus: FinancialVerificationStatus
  isVoided: boolean
  /**
   * Cumulative recorded net movement up to and including this entry, in chronological
   * order. It starts at zero on the first day of the window — Punched has never seen an
   * opening balance and does not invent one — so it is the running NET of what was
   * recorded in the window, never the balance of a bank or M-Pesa account.
   */
  runningBalance: number
  /** Display name of whoever recorded the entry, when the server could resolve it. */
  recordedByName: string | null
}

export type Cashbook = {
  period: string
  from: string
  to: string
  entries: CashbookEntry[]
  page: number
  pageSize: number
  totalCount: number
  totalInflows: number
  totalOutflows: number
  expenses: number
  refunds: number
  /** Recorded inflows − recorded outflows. Not a bank balance. */
  netCashMovement: number
  /** Total pages for the FILTERED result set. */
  totalPages: number
  currency: string
}

/** One point on a trend series. */
export type FinancialTrendPoint = {
  period: string
  label: string
  amount: number
  count: number
}

export type FinancialAnalytics = {
  period: string
  from: string
  to: string
  currency: string
  revenue: {
    /** `day` | `week` | `month`. */
    granularity: string
    overTime: FinancialTrendPoint[]
    bySource: FinancialBreakdownItem[]
    byPaymentMethod: FinancialBreakdownItem[]
    byService: FinancialBreakdownItem[]
    byCategory: FinancialBreakdownItem[]
    byStaff: FinancialBreakdownItem[]
    averageTransactionValue: number
  }
  payments: {
    byMethod: FinancialBreakdownItem[]
    verifiedAmount: number
    verifiedCount: number
    pendingAmount: number
    pendingCount: number
    rejectedAmount: number
    rejectedCount: number
    refundsOverTime: FinancialTrendPoint[]
    refundTotal: number
    refundCount: number
  }
  expenses: {
    overTime: FinancialTrendPoint[]
    byCategory: FinancialBreakdownItem[]
    total: number
    count: number
  }
  performance: {
    totalIncome: number
    totalExpenses: number
    totalRefunds: number
    netOperatingResult: number
    outstandingBalances: number
    outstandingAppointmentCount: number
    refundRate: number
    averageTransactionValue: number
    marginPercentage: number
  }
}

export type ExpenseCategory = {
  key: string
  label: string
}

/** One imported M-Pesa statement line. */
export type MpesaStatementLine = {
  id: string
  importId: string
  receiptNumber: string
  amount: number
  currency: string
  transactionAt: string | null
  payerName: string | null
  payerPhone: string | null
  accountReference: string | null
  narrative: string | null
  status: ReconciliationStatus
  matchedTransactionId: string | null
  matchedPaymentId: string | null
  matchMethod: string | null
  note: string | null
  isDuplicateInFile: boolean
  punchedAmount: number | null
  punchedReference: string | null
  /** Statement amount − Punched amount, when both are known. */
  amountVariance: number | null
}

export type MpesaStatementImport = {
  id: string
  fileName: string
  format: string
  importedAt: string
  importedByUserId: string | null
  lineCount: number
  matchedCount: number
  discrepancyCount: number
  unmatchedCount: number
  excludedCount: number
  notes: string | null
}

/** A Punched transaction with no statement evidence behind it. */
export type UnreconciledTransaction = {
  id: string
  reference: string
  externalReference: string | null
  amount: number
  paymentMethod: FinancialPaymentMethod
  verificationStatus: FinancialVerificationStatus
  transactionDate: string
  description: string | null
  customerName: string | null
}

export type ReconciliationWorkspace = {
  import: MpesaStatementImport | null
  lines: MpesaStatementLine[]
  lineTotal: number
  unmatchedLines: number
  discrepancyLines: number
  matchedLines: number
  transactionsMissingFromStatement: UnreconciledTransaction[]
  transactionsMissingFromStatementCount: number
  unreconciledTransactionCount: number
  imports: MpesaStatementImport[]
}

/** One entry of a financial record's audit trail. */
export type FinancialAuditLog = {
  id: string
  entityType: string
  entityId: string
  action: string
  actorUserId: string | null
  actorName: string | null
  note: string | null
  changesJson: string | null
  reference: string | null
  createdAt: string
}

export type RecordIncomeInput = {
  amount: number
  source: Exclude<TransactionSource, 'punched_booking'>
  paymentMethod: FinancialPaymentMethod
  transactionReference?: string | null
  customerId?: string | null
  description?: string | null
  transactionDate?: string | null
  currency?: string
}

export type ExpenseInput = {
  amount: number
  category: string
  paymentMethod: FinancialPaymentMethod
  description: string
  transactionReference?: string | null
  transactionDate?: string | null
  currency?: string
}

export type UpdateExpenseInput = Partial<ExpenseInput> & { reason?: string | null }

export type RecordRefundInput = {
  transactionId?: string | null
  paymentId?: string | null
  amount: number
  reason: string
  refundMethod: FinancialPaymentMethod
  refundReference?: string | null
  refundDate?: string | null
  /**
   * Makes the refund safe to retry: the same key returns the first refund instead of recording a
   * second one. Generated once per dialog opening.
   */
  idempotencyKey?: string | null
  /** A requested refund is not a completed one: leave false until the money has gone back. */
  completed: boolean
}

export type FinancialFilters = {
  from?: string
  to?: string
  type?: string
  /** `incoming` | `outgoing` (the server also accepts `in`/`out`, `money_in`/`money_out`). */
  direction?: string
  source?: string
  paymentMethod?: string
  verificationStatus?: string
  reconciliationStatus?: string
  /** Expense category key. Only the expense list honours it. */
  category?: string
  customerId?: string
  appointmentId?: string
  /** Who recorded the row (the cashbook's "recorded by" filter). */
  recordedByUserId?: string
  /** Customer or payee name, contains match. */
  payee?: string
  minAmount?: number
  maxAmount?: number
  search?: string
  sort?: string
  /** The SORT order: `asc` | `desc`. */
  sortDirection?: string
  /** Voided rows are listed (they never count towards a total). */
  includeVoided?: boolean
  page?: number
  pageSize?: number
}

/** The one place the finance endpoints are named. */
export const financesApi = {
  overview: (period: string, from?: string | null, to?: string | null) =>
    apiGet<FinancialOverview>('/v1/finances/overview', { period, from, to }),

  analytics: (period: string, from?: string | null, to?: string | null) =>
    apiGet<FinancialAnalytics>('/v1/finances/analytics', { period, from, to }),

  cashbook: (filters: FinancialFilters) => apiGet<Cashbook>('/v1/finances/cashbook', { ...filters }),

  transactions: (filters: FinancialFilters) =>
    apiGet<FinancialTransactionList>('/v1/finances/transactions', { ...filters }),

  transaction: (id: string) => apiGet<FinancialTransaction>(`/v1/finances/transactions/${id}`),

  auditTrail: (id: string) => apiGet<FinancialAuditLog[]>(`/v1/finances/transactions/${id}/audit`),

  recordIncome: (body: RecordIncomeInput) =>
    apiRequest<FinancialTransaction>('/v1/finances/income', { method: 'POST', body }),

  verify: (id: string, note?: string | null, amount?: number | null) =>
    apiRequest<FinancialTransaction>(`/v1/finances/transactions/${id}/verify`, {
      method: 'POST',
      body: { note: note ?? null, amount: amount ?? null },
    }),

  reject: (id: string, reason: string) =>
    apiRequest<FinancialTransaction>(`/v1/finances/transactions/${id}/reject`, {
      method: 'POST',
      body: { reason },
    }),

  reconcile: (id: string, status: ReconciliationStatus, note?: string | null, statementLineId?: string | null) =>
    apiRequest<FinancialTransaction>(`/v1/finances/transactions/${id}/reconcile`, {
      method: 'POST',
      body: { status, note: note ?? null, statementLineId: statementLineId ?? null },
    }),

  recordRefund: (body: RecordRefundInput) =>
    apiRequest<FinancialTransaction>('/v1/finances/refunds', { method: 'POST', body }),

  expenseCategories: () => apiGet<ExpenseCategory[]>('/v1/finances/expense-categories'),

  expenses: (filters: FinancialFilters) => apiGet<FinancialTransactionList>('/v1/finances/expenses', { ...filters }),

  createExpense: (body: ExpenseInput) =>
    apiRequest<FinancialTransaction>('/v1/finances/expenses', { method: 'POST', body }),

  updateExpense: (id: string, body: UpdateExpenseInput) =>
    apiRequest<FinancialTransaction>(`/v1/finances/expenses/${id}`, { method: 'PUT', body }),

  voidExpense: (id: string, reason: string) =>
    apiRequest<FinancialTransaction>(`/v1/finances/expenses/${id}/void`, { method: 'POST', body: { reason } }),

  reconciliation: () => apiGet<ReconciliationWorkspace>('/v1/finances/reconciliation'),

  importStatement: (fileName: string, content: string) =>
    apiRequest<ReconciliationWorkspace>('/v1/finances/reconciliation/import', {
      method: 'POST',
      body: { fileName, content },
    }),

  matchStatementLine: (
    lineId: string,
    body: { transactionId?: string | null; status: ReconciliationStatus; note?: string | null },
  ) =>
    apiRequest<MpesaStatementLine>(`/v1/finances/reconciliation/lines/${lineId}/match`, {
      method: 'POST',
      body,
    }),
}

/**
 * Every finance query hangs off the `['finances']` prefix, so one mutation can refresh the whole
 * module. That matters here more than elsewhere: recording income moves the cashbook, the overview
 * and the analytics at once, and a screen showing stale totals after a write would be a lie about
 * money.
 */
const root = ['finances'] as const

function refreshFinances(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: root })
  // Appointment payment screens read the ledger's reconciliation state, so they follow too.
  void queryClient.invalidateQueries({ queryKey: ['appointments'] })
  void queryClient.invalidateQueries({ queryKey: ['payments'] })
}

/** The financial overview for a period. */
export function useFinancialOverview(period: string, from?: string | null, to?: string | null, enabled = true) {
  return useQuery({
    queryKey: [...root, 'overview', period, from ?? '', to ?? ''] as const,
    queryFn: () => financesApi.overview(period, from, to),
    enabled,
    placeholderData: (previous) => previous,
  })
}

/** Revenue, payment, expense and performance analytics for a period. */
export function useFinancialAnalytics(period: string, from?: string | null, to?: string | null, enabled = true) {
  return useQuery({
    queryKey: [...root, 'analytics', period, from ?? '', to ?? ''] as const,
    queryFn: () => financesApi.analytics(period, from, to),
    enabled,
    placeholderData: (previous) => previous,
  })
}

/** The cashbook for the given window and filters. */
export function useCashbook(filters: FinancialFilters, enabled = true) {
  return useQuery({
    queryKey: [...root, 'cashbook', filters] as const,
    queryFn: () => financesApi.cashbook(filters),
    enabled,
    placeholderData: (previous) => previous,
  })
}

/** The ledger list, filtered and paged server-side. */
export function useFinancialTransactions(filters: FinancialFilters, enabled = true) {
  return useQuery({
    queryKey: [...root, 'transactions', filters] as const,
    queryFn: () => financesApi.transactions(filters),
    enabled,
    placeholderData: (previous) => previous,
  })
}

/** One ledger row. */
export function useFinancialTransaction(id: string | null, enabled = true) {
  return useQuery({
    queryKey: [...root, 'transaction', id ?? ''] as const,
    queryFn: () => financesApi.transaction(id as string),
    enabled: enabled && Boolean(id),
  })
}

/** A record's audit trail. */
export function useFinancialAuditTrail(id: string | null, enabled = true) {
  return useQuery({
    queryKey: [...root, 'audit', id ?? ''] as const,
    queryFn: () => financesApi.auditTrail(id as string),
    enabled: enabled && Boolean(id),
  })
}

/** The expenses list (income is never included). */
export function useExpenses(filters: FinancialFilters, enabled = true) {
  return useQuery({
    queryKey: [...root, 'expenses', filters] as const,
    queryFn: () => financesApi.expenses(filters),
    enabled,
    placeholderData: (previous) => previous,
  })
}

/** The predefined expense categories. Cached for the session: they are code-owned, not data. */
export function useExpenseCategories(enabled = true) {
  return useQuery({
    queryKey: [...root, 'expense-categories'] as const,
    queryFn: () => financesApi.expenseCategories(),
    enabled,
    staleTime: 30 * 60_000,
  })
}

/** The reconciliation workspace. */
export function useReconciliation(enabled = true) {
  return useQuery({
    queryKey: [...root, 'reconciliation'] as const,
    queryFn: () => financesApi.reconciliation(),
    enabled,
    placeholderData: (previous) => previous,
  })
}

/** Records income that did not come from a Punched appointment. */
export function useRecordIncome() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: RecordIncomeInput) => financesApi.recordIncome(input),
    onSuccess: () => refreshFinances(queryClient),
  })
}

/** Confirms or refuses a recorded claim. */
export function useTransactionDecisions() {
  const queryClient = useQueryClient()

  const verify = useMutation({
    mutationFn: (input: { id: string; note?: string | null; amount?: number | null }) =>
      financesApi.verify(input.id, input.note, input.amount),
    onSuccess: () => refreshFinances(queryClient),
  })

  const reject = useMutation({
    mutationFn: (input: { id: string; reason: string }) => financesApi.reject(input.id, input.reason),
    onSuccess: () => refreshFinances(queryClient),
  })

  const reconcile = useMutation({
    mutationFn: (input: {
      id: string
      status: ReconciliationStatus
      note?: string | null
      statementLineId?: string | null
    }) => financesApi.reconcile(input.id, input.status, input.note, input.statementLineId),
    onSuccess: () => refreshFinances(queryClient),
  })

  return { verify, reject, reconcile }
}

/** Records a full or partial refund against an income row. */
export function useRecordRefund() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: RecordRefundInput) => financesApi.recordRefund(input),
    onSuccess: () => refreshFinances(queryClient),
  })
}

/** Expense writes: create, edit (audited) and void (never delete). */
export function useExpenseActions() {
  const queryClient = useQueryClient()

  const create = useMutation({
    mutationFn: (input: ExpenseInput) => financesApi.createExpense(input),
    onSuccess: () => refreshFinances(queryClient),
  })

  const update = useMutation({
    mutationFn: (input: { id: string; body: UpdateExpenseInput }) =>
      financesApi.updateExpense(input.id, input.body),
    onSuccess: () => refreshFinances(queryClient),
  })

  const voidExpense = useMutation({
    mutationFn: (input: { id: string; reason: string }) => financesApi.voidExpense(input.id, input.reason),
    onSuccess: () => refreshFinances(queryClient),
  })

  return { create, update, voidExpense }
}

/** Statement import and manual matching. */
export function useReconciliationActions() {
  const queryClient = useQueryClient()

  const importStatement = useMutation({
    mutationFn: (input: { fileName: string; content: string }) =>
      financesApi.importStatement(input.fileName, input.content),
    onSuccess: (workspace) => {
      queryClient.setQueryData([...root, 'reconciliation'] as const, workspace)
      refreshFinances(queryClient)
    },
  })

  const match = useMutation({
    mutationFn: (input: {
      lineId: string
      transactionId?: string | null
      status: ReconciliationStatus
      note?: string | null
    }) => financesApi.matchStatementLine(input.lineId, input),
    onSuccess: () => refreshFinances(queryClient),
  })

  return { importStatement, match }
}
