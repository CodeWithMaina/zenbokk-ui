import type { FinancialPaymentMethod } from './api'

/**
 * Payment status presentation. Wire values come from `PaymentStatuses.ToWire`
 * (PunchedApi/Domain/Entities/PaymentEnums.cs); unknown values get a neutral pill
 * with the raw text — a new status can never crash the register.
 */

export type PaymentStatusGroup = 'paid' | 'pending' | 'claims' | 'failed' | 'refunded' | 'unknown'

export type PaymentStatusDisplay = {
  group: PaymentStatusGroup
  label: string
  tone: 'success' | 'warning' | 'danger' | 'neutral'
}

const DISPLAY: Record<string, PaymentStatusDisplay> = {
  success: { group: 'paid', label: 'Paid', tone: 'success' },
  verified: { group: 'paid', label: 'Paid', tone: 'success' },
  created: { group: 'pending', label: 'Pending', tone: 'warning' },
  pending: { group: 'pending', label: 'Pending', tone: 'warning' },
  awaiting_customer: { group: 'pending', label: 'Pending', tone: 'warning' },
  processing: { group: 'pending', label: 'Pending', tone: 'warning' },
  submitted: { group: 'claims', label: 'Needs verification', tone: 'warning' },
  under_review: { group: 'claims', label: 'Needs verification', tone: 'warning' },
  flagged: { group: 'claims', label: 'Needs verification', tone: 'warning' },
  failed: { group: 'failed', label: 'Failed', tone: 'danger' },
  rejected: { group: 'failed', label: 'Failed', tone: 'danger' },
  expired: { group: 'failed', label: 'Failed', tone: 'danger' },
  cancelled: { group: 'failed', label: 'Failed', tone: 'danger' },
  reversed: { group: 'failed', label: 'Failed', tone: 'danger' },
  refunded: { group: 'refunded', label: 'Refunded', tone: 'neutral' },
}

export function paymentStatusDisplay(status: string): PaymentStatusDisplay {
  return (
    DISPLAY[status] ?? {
      group: 'unknown',
      label: status.replace(/_/g, ' '),
      tone: 'neutral',
    }
  )
}

/** Can this payment's claim still be decided? Drives the verify/reject affordances. */
export function isAwaitingVerification(status: string): boolean {
  return paymentStatusDisplay(status).group === 'claims'
}

/** The wire status each UI filter sends to `GET /v1/payments` (single-value filter). */
export const PAYMENT_STATUS_FILTER_TO_WIRE = {
  paid: 'success',
  pending: 'pending',
  claims: 'submitted',
  failed: 'failed',
} as const

export type PaymentType = 'booking_fee' | 'full_payment' | 'balance_payment' | string

export function paymentTypeLabel(type: string): string {
  switch (type) {
    case 'booking_fee':
      return 'Booking fee'
    case 'full_payment':
      return 'Full payment'
    case 'balance_payment':
      return 'Balance payment'
    default:
      return type.replace(/_/g, ' ')
  }
}

/** Method labels for the financial ledger wire values. */
export const FIN_METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  mpesa_till: 'M-Pesa',
  mpesa_paybill: 'M-Pesa',
  mpesa_send_money: 'M-Pesa',
  bank_transfer: 'Bank',
  card: 'Card',
  other: 'Other',
}

export function financeMethodLabel(method: FinancialPaymentMethod | string): string {
  return FIN_METHOD_LABELS[method] ?? method.replace(/_/g, ' ')
}

/** A payment-row method (`cash` | `mpesa`). */
export function paymentMethodLabel(method: string): string {
  return method === 'mpesa' ? 'M-Pesa' : method === 'cash' ? 'Cash' : method
}
