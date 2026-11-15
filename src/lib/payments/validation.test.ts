import { describe, expect, it } from 'vitest'
import {
  MANUAL_MPESA,
  MPESA_FIELD,
  formatKenyanPhone,
  normaliseKenyanPhone,
  normaliseMethod,
  validateMpesaDraft,
  validatePaybillAccount,
  validatePayeeName,
  validatePhone,
  validateShortNumber,
  type MpesaConfigDraft,
} from './validation'

/**
 * The M-PESA collection rules the owner form mirrors from the server. These are the
 * rules that decide where a customer's money is sent, so every accepted phone format
 * and rejection case is pinned.
 */
function draft(overrides: Partial<MpesaConfigDraft> = {}): MpesaConfigDraft {
  return {
    manualMpesaEnabled: false,
    mpesaAccountType: MANUAL_MPESA.paybill,
    mpesaPaybillNumber: '',
    mpesaPaybillAccount: '',
    mpesaTillNumber: '',
    mpesaPhoneNumber: '',
    mpesaPayeeName: '',
    mpesaInstructions: '',
    ...overrides,
  }
}

describe('normaliseMethod', () => {
  it('canonicalises known values and folds aliases', () => {
    expect(normaliseMethod('till')).toBe('till')
    expect(normaliseMethod('send_money')).toBe('send_money')
    expect(normaliseMethod('phone')).toBe('send_money')
    expect(normaliseMethod(null)).toBe('paybill')
    expect(normaliseMethod('nonsense')).toBe('paybill')
  })
})

describe('short numbers and accounts', () => {
  it('accepts 5–7 digits and rejects the rest', () => {
    expect(validateShortNumber('12345')).toBeNull()
    expect(validateShortNumber('1234567')).toBeNull()
    expect(validateShortNumber(null)).toBeNull()
    expect(validateShortNumber('1234')).not.toBeNull()
    expect(validateShortNumber('12345678')).not.toBeNull()
    expect(validateShortNumber('24a47')).not.toBeNull()
  })

  it('accepts account characters only', () => {
    expect(validatePaybillAccount('AURELIA-1042')).toBeNull()
    expect(validatePaybillAccount('ab_12')).toBeNull()
    expect(validatePaybillAccount('bad space')).not.toBeNull()
    expect(validatePaybillAccount('x'.repeat(21))).not.toBeNull()
  })

  it('caps the payee name at 60', () => {
    expect(validatePayeeName('a'.repeat(60))).toBeNull()
    expect(validatePayeeName('a'.repeat(61))).not.toBeNull()
  })
})

describe('phone numbers', () => {
  it.each([
    ['0712440001', '254712440001'],
    ['0112440001', '254112440001'],
    ['+254712440001', '254712440001'],
    ['254712440001', '254712440001'],
    ['712440001', '254712440001'],
    ['+2547 12 440 001', '254712440001'],
    ['0712-440-001', '254712440001'],
    ['112440001', '254112440001'],
  ])('accepts %s and normalises to %s', (input, expected) => {
    expect(validatePhone(input)).toBeNull()
    expect(normaliseKenyanPhone(input)).toBe(expected)
  })

  it.each([['0812440001'], ['254812440001'], ['071244000'], ['07124400012'], ['abcdefghij']])(
    'rejects %s',
    (input) => {
      expect(validatePhone(input)).not.toBeNull()
      expect(normaliseKenyanPhone(input)).toBeNull()
    },
  )

  it('groups a stored number for display', () => {
    expect(formatKenyanPhone('254712440001')).toBe('0712 440 001')
    expect(formatKenyanPhone(null)).toBe('')
  })
})

describe('validateMpesaDraft', () => {
  it('requires the selected method when enabled', () => {
    const errors = validateMpesaDraft(
      draft({ manualMpesaEnabled: true, mpesaAccountType: MANUAL_MPESA.paybill, mpesaPaybillNumber: '247247' }),
    )
    expect(errors[MPESA_FIELD.paybillAccount]).toBeTruthy()
  })

  it('needs a phone for Send Money', () => {
    const errors = validateMpesaDraft(
      draft({ manualMpesaEnabled: true, mpesaAccountType: MANUAL_MPESA.sendMoney }),
    )
    expect(errors[MPESA_FIELD.phoneNumber]).toBeTruthy()
  })

  it('is quiet when disabled with partial data', () => {
    const errors = validateMpesaDraft(draft({ manualMpesaEnabled: false }))
    expect(Object.keys(errors)).toHaveLength(0)
  })

  it('is quiet when the selected method is complete', () => {
    const errors = validateMpesaDraft(
      draft({
        manualMpesaEnabled: true,
        mpesaAccountType: MANUAL_MPESA.till,
        mpesaTillNumber: '5123456',
      }),
    )
    expect(Object.keys(errors)).toHaveLength(0)
  })
})
