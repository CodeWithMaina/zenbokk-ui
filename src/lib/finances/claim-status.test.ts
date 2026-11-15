import { describe, expect, it } from 'vitest'
import {
  CLAIM_LENSES,
  CLAIM_REJECTION_REASONS,
  claimEventLabel,
  claimIsDecidable,
  claimIsOpen,
  claimStatusLabel,
  claimStatusTone,
} from './claim-status'

/**
 * The reconciliation board's vocabulary.
 *
 * Two properties matter more than the rest: every lifecycle status has a word a person can
 * read, and an unknown status is shown as itself rather than crashing a queue the owner is
 * relying on. A board that renders `undefined` for a payment state is worse than one that
 * renders a status it has never seen before.
 */
describe('claim status vocabulary', () => {
  it('gives every lifecycle status a readable label', () => {
    expect(claimStatusLabel('submitted')).toBe('Awaiting verification')
    expect(claimStatusLabel('under_review')).toBe('Under review')
    expect(claimStatusLabel('flagged')).toBe('Flagged for review')
    expect(claimStatusLabel('verified')).toBe('Verified')
    expect(claimStatusLabel('rejected')).toBe('Rejected')
    expect(claimStatusLabel('expired')).toBe('Expired')
    expect(claimStatusLabel('created')).toBe('Awaiting payment')
    expect(claimStatusLabel('awaiting_customer')).toBe('Awaiting payment')
  })

  it('falls back to the raw value instead of hiding an unknown status', () => {
    expect(claimStatusLabel('something_new')).toBe('something_new')
    expect(claimStatusLabel(null)).toBe('—')
  })

  it('keeps pending, flagged, verified and rejected visually distinct', () => {
    const tones = new Set([
      claimStatusTone('submitted'),
      claimStatusTone('flagged'),
      claimStatusTone('verified'),
      claimStatusTone('rejected'),
    ])

    // Four different states must not collapse into one colour.
    expect(tones.size).toBe(4)
    expect(claimStatusTone('flagged')).toBe('danger')
    expect(claimStatusTone('verified')).toBe('success')
    expect(claimStatusTone('submitted')).toBe('warning')
    expect(claimStatusTone('nonsense')).toBe('neutral')
  })

  it('treats flagged as open — flagging is not a decision', () => {
    expect(claimIsOpen('submitted')).toBe(true)
    expect(claimIsOpen('under_review')).toBe(true)
    expect(claimIsOpen('flagged')).toBe(true)
    expect(claimIsOpen('verified')).toBe(false)
    expect(claimIsOpen('rejected')).toBe(false)
    expect(claimIsDecidable('flagged')).toBe(true)
    expect(claimIsDecidable('verified')).toBe(false)
  })

  it('labels the audit trail in the owner’s words', () => {
    expect(claimEventLabel('flagged')).toBe('Flagged for review')
    expect(claimEventLabel('submitted')).toBe('Submitted by the customer')
    expect(claimEventLabel('verified')).toBe('Verified')
    expect(claimEventLabel(null)).toBe('Update')
  })

  it('defaults the board to awaiting verification', () => {
    expect(CLAIM_LENSES.map((lens) => lens.key)).toEqual([
      'awaiting',
      'attention',
      'verified',
      'rejected',
      'all',
    ])
    expect(CLAIM_LENSES[0].key).toBe('awaiting')
  })

  it('offers a rejection reason that explains the money, not just a refusal', () => {
    expect(CLAIM_REJECTION_REASONS.length).toBeGreaterThan(3)
    expect(CLAIM_REJECTION_REASONS).toContain(
      'We cannot find that transaction in our M-PESA account',
    )
  })
})
