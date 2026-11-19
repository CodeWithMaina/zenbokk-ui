import { z } from 'zod'

/**
 * URL search schemas for the three finance pages.
 *
 * Filters, sort, page and page size live in the query string so browser back/forward
 * and shared links reproduce the exact view. Every value is validated against a
 * whitelist; anything unrecognised falls back to the default via `.catch`, so a
 * hand-edited URL can never produce an invalid request.
 */

const dateInput = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .optional()
  .catch(undefined)

const pageNumber = z.coerce.number().int().min(1).catch(1)

const pageSize = z.coerce
  .number()
  .int()
  .refine((value) => [10, 25, 50].includes(value))
  .catch(10)

const searchText = z.string().trim().max(120).catch('')

/** Method values the financial ledger actually honours (`FinancialWire.TryParseMethod`). */
const financeMethod = z
  .enum(['all', 'cash', 'mpesa_till', 'mpesa_paybill', 'mpesa_send_money', 'bank_transfer'])
  .catch('all')

export const paymentsSearchSchema = z.object({
  /** Register tab: everything, or only claims awaiting verification. */
  tab: z.enum(['all', 'claims']).catch('all'),
  status: z.enum(['all', 'paid', 'pending', 'claims', 'failed']).catch('all'),
  method: z.enum(['all', 'cash', 'mpesa']).catch('all'),
  type: z.enum(['all', 'booking_fee', 'full_payment', 'balance_payment']).catch('all'),
  from: dateInput,
  to: dateInput,
  page: pageNumber,
  pageSize,
})

export type PaymentsSearch = z.infer<typeof paymentsSearchSchema>

export const cashbookSearchSchema = z.object({
  /** Entry direction: everything, income only, or expenses/refunds only. */
  type: z.enum(['all', 'in', 'out']).catch('all'),
  method: financeMethod,
  /** Voided entries: hidden by default, shown on request. */
  voided: z.enum(['0', '1']).catch('0'),
  search: searchText,
  from: dateInput,
  to: dateInput,
  page: pageNumber,
  pageSize,
})

export type CashbookSearch = z.infer<typeof cashbookSearchSchema>

/**
 * Expense sort options. The backend sorts by date or amount only
 * (`FinancialQueries.ApplySort`), so those are the only choices offered.
 */
const expenseSort = z.enum(['date-d', 'date-a', 'amt-d', 'amt-a']).catch('date-d')

export const expensesSearchSchema = z.object({
  /** Category key, or `all`. Checked against `/v1/finances/expense-categories` before use. */
  category: z.string().trim().max(60).catch('all'),
  method: financeMethod,
  sort: expenseSort,
  search: searchText,
  from: dateInput,
  to: dateInput,
  page: pageNumber,
  pageSize,
})

export type ExpensesSearch = z.infer<typeof expensesSearchSchema>

/** Map the expense sort option onto the wire params (`sort` + `sortDirection`). */
export function expenseSortParams(sort: ExpensesSearch['sort']): {
  sort: 'date' | 'amount'
  sortDirection: 'asc' | 'desc'
} {
  switch (sort) {
    case 'date-a':
      return { sort: 'date', sortDirection: 'asc' }
    case 'amt-d':
      return { sort: 'amount', sortDirection: 'desc' }
    case 'amt-a':
      return { sort: 'amount', sortDirection: 'asc' }
    default:
      return { sort: 'date', sortDirection: 'desc' }
  }
}
