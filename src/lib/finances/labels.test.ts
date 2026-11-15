import { describe, expect, it } from 'vitest'
import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHOD_OPTIONS,
  RECONCILIATION_LABELS,
  RECORDABLE_SOURCES,
  SOURCE_LABELS,
  TRANSACTION_TYPE_LABELS,
  VERIFICATION_LABELS,
  paymentMethodLabel,
  reconciliationLabel,
  reconciliationTone,
  requiresMpesaReference,
  sourceLabel,
  transactionTypeLabel,
  verificationLabel,
  verificationTone,
} from './labels'

/**
 * The words the finance screens use.
 *
 * Two properties matter enough to test: every value the API can return has a label (an unmapped status
 * would surface a raw snake_case token to a business owner), and verification and reconciliation are
 * separate vocabularies with separate tones — collapsing them would erase the distinction the module
 * exists to make.
 */
describe('finance labels', () => {
  it('names every transaction type, source and payment method the API can return', () => {
    expect(Object.keys(TRANSACTION_TYPE_LABELS).sort()).toEqual(['adjustment', 'expense', 'income', 'refund'])
    expect(Object.keys(SOURCE_LABELS).sort()).toEqual([
      'manual_income',
      'other',
      'product_sale',
      'punched_booking',
      'walk_in',
    ])
    expect(Object.keys(PAYMENT_METHOD_LABELS).sort()).toEqual([
      'bank_transfer',
      'card',
      'cash',
      'mpesa_paybill',
      'mpesa_send_money',
      'mpesa_till',
      'other',
    ])
  })

  it('keeps verification and reconciliation as separate words', () => {
    expect(verificationLabel('pending')).toBe('Pending')
    expect(verificationLabel('verified')).toBe('Verified')
    expect(verificationLabel('rejected')).toBe('Rejected')

    expect(reconciliationLabel('unreconciled')).toBe('Not reconciled')
    expect(reconciliationLabel('matched')).toBe('Matched')
    expect(reconciliationLabel('discrepancy')).toBe('Discrepancy')
    expect(reconciliationLabel('excluded')).toBe('Excluded')

    // "Verified" must never be offered as a reconciliation word: a confirmed payment is not reconciled.
    expect(Object.values(RECONCILIATION_LABELS)).not.toContain('Verified')
    expect(Object.values(VERIFICATION_LABELS)).not.toContain('Matched')
  })

  it('tones each status the way the rest of the product does', () => {
    expect(verificationTone('verified')).toBe('success')
    expect(verificationTone('pending')).toBe('warning')
    expect(verificationTone('rejected')).toBe('danger')

    // Unreconciled is the normal state, not a problem: it reads neutral, never as an error.
    expect(reconciliationTone('unreconciled')).toBe('neutral')
    expect(reconciliationTone('matched')).toBe('success')
    expect(reconciliationTone('discrepancy')).toBe('danger')
    expect(reconciliationTone('excluded')).toBe('info')

    expect(verificationTone('nonsense')).toBe('neutral')
    expect(reconciliationTone(undefined as unknown as string)).toBe('neutral')
  })

  it('falls back to the raw key for a value it does not recognise', () => {
    // An unmapped code renders as-is rather than as an empty cell, so a value the API starts returning
    // shows up in the UI instead of disappearing.
    expect(sourceLabel('some_new_source')).toBe('some_new_source')
    expect(paymentMethodLabel('some_new_method')).toBe('some_new_method')
    expect(transactionTypeLabel('income')).toBe('Income')
  })

  it('requires a reference on the three M-Pesa routes and not on the others', () => {
    expect(requiresMpesaReference('mpesa_till')).toBe(true)
    expect(requiresMpesaReference('mpesa_paybill')).toBe(true)
    expect(requiresMpesaReference('mpesa_send_money')).toBe(true)

    expect(requiresMpesaReference('cash')).toBe(false)
    expect(requiresMpesaReference('bank_transfer')).toBe(false)
    expect(requiresMpesaReference('card')).toBe(false)
    expect(requiresMpesaReference('other')).toBe(false)
  })

  it('never lets booking income be typed in by hand', () => {
    // Booking money is produced by the payment lifecycle; allowing it here would invent a second source
    // of truth for the same appointment.
    expect(RECORDABLE_SOURCES.map((source) => source.key)).not.toContain('punched_booking')
    expect(RECORDABLE_SOURCES.map((source) => source.key)).toEqual([
      'walk_in',
      'product_sale',
      'manual_income',
      'other',
    ])
    // Every recordable source still has a label the owner can read.
    for (const source of RECORDABLE_SOURCES) {
      expect(SOURCE_LABELS[source.key]).toBeTruthy()
      expect(source.hint).toBeTruthy()
    }
  })

  it('offers all seven payment methods as options, with labels', () => {
    expect(PAYMENT_METHOD_OPTIONS.map((option) => option.key)).toEqual([
      'mpesa_till',
      'mpesa_paybill',
      'mpesa_send_money',
      'cash',
      'bank_transfer',
      'card',
      'other',
    ])

    for (const option of PAYMENT_METHOD_OPTIONS) {
      expect(option.label).toBe(PAYMENT_METHOD_LABELS[option.key])
    }
  })
})
