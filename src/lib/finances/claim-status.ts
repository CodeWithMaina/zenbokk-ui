import type { Tone } from '../../components/ui/badge'

/**
 * Vocabulary for a customer-submitted M-PESA claim.
 *
 * A claim's state is the payment's own lifecycle status, so this maps those statuses to the
 * words the reconciliation board uses. It is deliberately separate from the ledger's
 * verification/reconciliation vocabulary in `labels.ts`: those describe a *transaction*, this
 * describes a *claim a person is waiting on us to decide*.
 */

const CLAIM_STATUS_LABELS: Record<string, string> = {
  created: 'Awaiting payment',
  awaiting_customer: 'Awaiting payment',
  processing: 'Processing',
  submitted: 'Awaiting verification',
  under_review: 'Under review',
  flagged: 'Flagged for review',
  verified: 'Verified',
  rejected: 'Rejected',
  expired: 'Expired',
  failed: 'Failed',
  cancelled: 'Cancelled',
  reversed: 'Reversed',
  refunded: 'Refunded',
  success: 'Confirmed',
}

/** The four states the board leans on, plus everything else calmly. */
const CLAIM_STATUS_TONES: Record<string, Tone> = {
  submitted: 'warning',
  under_review: 'info',
  flagged: 'danger',
  verified: 'success',
  rejected: 'neutral',
  expired: 'neutral',
}

/** A claim status as a person reads it. Unknown values fall through unchanged. */
export function claimStatusLabel(status: string | null | undefined): string {
  if (!status) return '—'
  return CLAIM_STATUS_LABELS[status] ?? status
}

/** A claim status as a colour. Never throws on a status the UI has not learned yet. */
export function claimStatusTone(status: string | null | undefined): Tone {
  if (!status) return 'neutral'
  return CLAIM_STATUS_TONES[status] ?? 'neutral'
}

/** True while the claim is waiting on a human decision. */
export function claimIsOpen(status: string | null | undefined): boolean {
  return status === 'submitted' || status === 'under_review' || status === 'flagged'
}

/** True when the owner can still act on the claim (decide or flag it). */
export function claimIsDecidable(status: string | null | undefined): boolean {
  return claimIsOpen(status)
}

const CLAIM_EVENT_LABELS: Record<string, string> = {
  submitted: 'Submitted by the customer',
  under_review: 'Opened for review',
  flagged: 'Flagged for review',
  verified: 'Verified',
  rejected: 'Rejected',
  expired: 'Expired',
}

/** One entry of the claim's audit trail, as the owner reads it. */
export function claimEventLabel(kind: string | null | undefined): string {
  if (!kind) return 'Update'
  return CLAIM_EVENT_LABELS[kind] ?? kind
}

/**
 * The lenses the queue offers, in the order the board shows them. `attention` is the flagged
 * claims plus the ones explicitly opened for review — the ones that need a second pair of eyes.
 */
export const CLAIM_LENSES = [
  { key: 'awaiting', label: 'Awaiting verification' },
  { key: 'attention', label: 'Requires attention' },
  { key: 'verified', label: 'Verified' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'all', label: 'All claims' },
] as const

export type ClaimLens = (typeof CLAIM_LENSES)[number]['key']

/** The reasons the design offers for a rejection, mapped to what the customer is told. */
export const CLAIM_REJECTION_REASONS = [
  'We cannot find that transaction in our M-PESA account',
  'The amount received does not match the claim',
  'That transaction code has already been used',
  'The payment went to a different account',
  'The transaction code does not match the message',
  'Other',
] as const
