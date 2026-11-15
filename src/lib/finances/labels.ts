import type {
  FinancialPaymentMethod,
  FinancialTransactionType,
  FinancialVerificationStatus,
  ReconciliationStatus,
  TransactionSource,
} from './api'

/**
 * The words the finance screens use.
 *
 * All of them are deliberately plain and unambiguous, because a business owner reading these has to
 * be able to tell the difference between money that arrived, money expected, and money checked
 * against a bank statement. "Pending", "Verified" and "Reconciled" are three different things and are
 * labelled as such.
 */

export const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  income: 'Income',
  expense: 'Expense',
  refund: 'Refund',
  adjustment: 'Adjustment',
}

export const SOURCE_LABELS: Record<string, string> = {
  punched_booking: 'Punched appointment',
  walk_in: 'Walk-in',
  product_sale: 'Product sale',
  manual_income: 'Recorded manually',
  other: 'Other',
}

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  mpesa_till: 'M-Pesa Till',
  mpesa_paybill: 'M-Pesa Paybill',
  mpesa_send_money: 'M-Pesa Send Money',
  cash: 'Cash',
  bank_transfer: 'Bank transfer',
  card: 'Card',
  other: 'Other',
}

export const VERIFICATION_LABELS: Record<string, string> = {
  pending: 'Pending',
  verified: 'Verified',
  rejected: 'Rejected',
}

export const RECONCILIATION_LABELS: Record<string, string> = {
  unreconciled: 'Not reconciled',
  matched: 'Matched',
  discrepancy: 'Discrepancy',
  excluded: 'Excluded',
}

export type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral'

export const VERIFICATION_TONES: Record<string, StatusTone> = {
  pending: 'warning',
  verified: 'success',
  rejected: 'danger',
}

export const RECONCILIATION_TONES: Record<string, StatusTone> = {
  unreconciled: 'neutral',
  matched: 'success',
  discrepancy: 'danger',
  excluded: 'info',
}

export function labelFor(map: Record<string, string>, key: string | null | undefined): string {
  if (!key) return '—'
  return map[key] ?? key
}

export function transactionTypeLabel(type: FinancialTransactionType | string): string {
  return labelFor(TRANSACTION_TYPE_LABELS, type)
}

export function sourceLabel(source: TransactionSource | string): string {
  return labelFor(SOURCE_LABELS, source)
}

export function paymentMethodLabel(method: FinancialPaymentMethod | string): string {
  return labelFor(PAYMENT_METHOD_LABELS, method)
}

export function verificationLabel(status: FinancialVerificationStatus | string): string {
  return labelFor(VERIFICATION_LABELS, status)
}

export function verificationTone(status: FinancialVerificationStatus | string): StatusTone {
  return VERIFICATION_TONES[status] ?? 'neutral'
}

export function reconciliationLabel(status: ReconciliationStatus | string): string {
  return labelFor(RECONCILIATION_LABELS, status)
}

export function reconciliationTone(status: ReconciliationStatus | string): StatusTone {
  return RECONCILIATION_TONES[status] ?? 'neutral'
}

/** Income sources an owner may record by hand: booking income comes from the payment lifecycle. */
export const RECORDABLE_SOURCES: readonly { key: string; label: string; hint: string }[] = [
  { key: 'walk_in', label: 'Walk-in', hint: 'A customer who came in without booking' },
  { key: 'product_sale', label: 'Product sale', hint: 'Retail items sold over the counter' },
  { key: 'manual_income', label: 'Other business income', hint: 'Anything else you received' },
  { key: 'other', label: 'Other', hint: 'Does not fit the categories above' },
]

/** The payment methods a business can receive money on. */
export const PAYMENT_METHOD_OPTIONS: readonly { key: FinancialPaymentMethod; label: string }[] = [
  { key: 'mpesa_till', label: 'M-Pesa Till' },
  { key: 'mpesa_paybill', label: 'M-Pesa Paybill' },
  { key: 'mpesa_send_money', label: 'M-Pesa Send Money' },
  { key: 'cash', label: 'Cash' },
  { key: 'bank_transfer', label: 'Bank transfer' },
  { key: 'card', label: 'Card' },
  { key: 'other', label: 'Other' },
]

/** The three M-Pesa routes need a receipt code; the others do not. */
export function requiresMpesaReference(method: FinancialPaymentMethod | string): boolean {
  return method === 'mpesa_till' || method === 'mpesa_paybill' || method === 'mpesa_send_money'
}
