import { describe, expect, it } from 'vitest'
import { scanMpesaMessage } from './mpesa-message'

/**
 * The M-PESA confirmation rule the paste form applies before a message is accepted.
 * Every refusal case is pinned, because this is the only thing standing between a
 * fabricated paste and the owner's verification queue.
 */

const PAYBILL =
  'QJK42NUM01 Confirmed. Ksh1,750.00 sent to NURU STUDIO for account 0301078035 on 12/5/26 at 3:04 PM. New M-PESA balance is Ksh2,250.00.'
const SEND_MONEY =
  'SFE4K5T6YU Confirmed. Ksh500.00 sent to JOHN DOE 0712 345 678 on 3/11/26 at 9:15 AM. New M-PESA balance is Ksh1,000.00.'

describe('scanMpesaMessage — accepted messages', () => {
  it('reads the code, amount and payee from a PayBill confirmation', () => {
    const scan = scanMpesaMessage(PAYBILL)
    expect(scan.ok).toBe(true)
    expect(scan.transactionCode).toBe('QJK42NUM01')
    expect(scan.amount).toBe(1750)
    expect(scan.recipient).toBe('NURU STUDIO')
    expect(scan.payer).toBeNull()
  })

  it('interprets the stamped time as East Africa Time', () => {
    const scan = scanMpesaMessage(PAYBILL)
    expect(scan.transactionAt?.toISOString()).toBe('2026-05-12T12:04:00.000Z')
  })

  it('accepts a Send Money confirmation and captures the recipient', () => {
    const scan = scanMpesaMessage(SEND_MONEY)
    expect(scan.ok).toBe(true)
    expect(scan.transactionCode).toBe('SFE4K5T6YU')
    expect(scan.amount).toBe(500)
    expect(scan.recipient).toContain('JOHN DOE')
  })

  it('tolerates a message pasted across several lines', () => {
    const wrapped = PAYBILL.replace(' for account', '\nfor account').replace(' New M-PESA', '\nNew M-PESA')
    expect(scanMpesaMessage(wrapped).ok).toBe(true)
  })

  it('accepts the lowercase forms people type', () => {
    expect(scanMpesaMessage(PAYBILL.toLowerCase()).transactionCode).toBe('QJK42NUM01')
  })
})

describe('scanMpesaMessage — refusals', () => {
  const cases: Array<[string, string | null | undefined, string]> = [
    ['empty', '', 'MPESA_MESSAGE_EMPTY'],
    ['whitespace only', '   ', 'MPESA_MESSAGE_EMPTY'],
    ['too long', 'QJK42NUM01 '.repeat(100), 'MPESA_MESSAGE_TOO_LONG'],
    ['unrelated prose', 'Hey, are we still on for lunch tomorrow?', 'MPESA_MESSAGE_NOT_CONFIRMATION'],
    ['brand but no transaction verb', 'M-PESA is great, Ksh500 was involved.', 'MPESA_MESSAGE_NOT_CONFIRMATION'],
    ['no receipt code', 'M-PESA Confirmed. Ksh500.00 sent to NURU STUDIO.', 'MPESA_MESSAGE_NO_CODE'],
    ['code is all digits', 'M-PESA 1234567890 Confirmed. Ksh500.00 sent to NURU STUDIO.', 'MPESA_MESSAGE_NO_CODE'],
    ['no amount', 'M-PESA QJK42NUM01 Confirmed. Sent to NURU STUDIO for account 12345.', 'MPESA_MESSAGE_NO_AMOUNT'],
    ['zero amount', 'M-PESA QJK42NUM01 Confirmed. Ksh0.00 sent to NURU STUDIO.', 'MPESA_MESSAGE_NO_AMOUNT'],
  ]

  it.each(cases)('refuses %s', (_name, input, code) => {
    const scan = scanMpesaMessage(input)
    expect(scan.ok).toBe(false)
    expect(scan.code).toBe(code)
    expect(scan.error).toBeTruthy()
    expect(scan.transactionCode).toBeNull()
    expect(scan.amount).toBeNull()
  })
})

