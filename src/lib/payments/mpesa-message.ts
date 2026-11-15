/**
 * The M-PESA confirmation-message rule, mirrored from the server
 * (`Application/Services/MpesaMessageParser.cs`).
 *
 * Stated once here so the paste form can scan a message the moment it is typed and
 * refuse anything that does not read like a genuine Safaricom confirmation — the
 * receipt code, the amount, and (when present) the transaction time. The server
 * applies the identical rule, so a message the form accepts is one the API accepts,
 * and the two can never disagree.
 *
 * What this is NOT: proof of payment. Only the business owner verifies a payment;
 * this only proves the text *looks* like a real confirmation, which is enough to stop
 * fabricated or truncated pastes at the door.
 */

/** Longest message we will look at; beyond this it is not a confirmation SMS. */
export const MPESA_MESSAGE_MAX = 1000

export type MpesaScan = {
  /** True when the text reads as a genuine M-PESA confirmation. */
  ok: boolean
  /** Code mirroring the server's `MPESA_MESSAGE_*` failures, or null when ok. */
  code: string | null
  /** Human reason the message was refused, or null when ok. */
  error: string | null
  /** The 10-character receipt code (e.g. `QJK42NUM01`). */
  transactionCode: string | null
  /** The amount in KES parsed from the message. */
  amount: number | null
  /** The transaction instant (East Africa Time → absolute), or null when absent. */
  transactionAt: Date | null
  /** The payee clause (`to …`), or null when absent. */
  recipient: string | null
  /** The payer clause (`from …`), or null when absent. */
  payer: string | null
}

// The product name, which any genuine confirmation carries.
const BRAND = /M[\s-]?PESA/i
// A transaction statement rather than unrelated prose.
const VERB = /\b(?:sent|paid|pay|received|bought|withdrawn|transferred|deposited)\b/i
// A bare 10-character receipt code (`\b` = not embedded in a longer token).
const RECEIPT = /\b([A-Z0-9]{10})\b/gi
// A KES amount: `Ksh1,000`, `Ksh 1,000.50`, `KES 250`, `Kshs.500`.
const AMOUNT = /\b(?:Kshs?\.?|KES)\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)/i
// Safaricom's date shape: `on 12/5/26 at 3:04 PM`.
const DATE = /\bon\s+(\d{1,2})\/(\d{1,2})\/(\d{2,4})\s+at\s+(\d{1,2}):(\d{2})\s*(AM|PM)?/i
// `to JOHN DOE for account 12345` — the payee clause.
const RECIPIENT = /\bto\s+([A-Z0-9][A-Z0-9 .&'-]{1,60}?)\s+(?:for account|for|on|\.|,|$)/i
// `from JOHN DOE` — the payer clause.
const PAYER = /\bfrom\s+([A-Z0-9][A-Z0-9 .&'-]{1,60}?)\s+(?:on|\.|,|$)/i

function refuse(code: string, error: string): MpesaScan {
  return {
    ok: false,
    code,
    error,
    transactionCode: null,
    amount: null,
    transactionAt: null,
    recipient: null,
    payer: null,
  }
}

/**
 * Scan a pasted confirmation message.
 *
 * The cheap structural refusals run before any field extraction, so a hostile blob
 * never reaches the field parsers.
 */
export function scanMpesaMessage(raw: string | null | undefined): MpesaScan {
  if (!raw || !raw.trim()) {
    return refuse('MPESA_MESSAGE_EMPTY', 'Paste the M-PESA confirmation message you received.')
  }

  // Collapse the newlines an SMS is pasted with, so one set of patterns fits both a
  // single line and a wrapped message.
  const text = raw.replace(/\s+/g, ' ').trim()

  if (text.length > MPESA_MESSAGE_MAX) {
    return refuse('MPESA_MESSAGE_TOO_LONG', 'That message is too long to be an M-PESA confirmation.')
  }

  if (!BRAND.test(text) || !VERB.test(text)) {
    return refuse(
      'MPESA_MESSAGE_NOT_CONFIRMATION',
      'That does not look like an M-PESA confirmation message. Copy the whole SMS you received.',
    )
  }

  const transactionCode = findReceiptCode(text)
  if (!transactionCode) {
    return refuse('MPESA_MESSAGE_NO_CODE', 'We could not find an M-PESA transaction code in that message.')
  }

  const amountRaw = AMOUNT.exec(text)?.[1]
  const amount = amountRaw ? Number(amountRaw.replace(/,/g, '')) : Number.NaN
  if (!Number.isFinite(amount) || amount <= 0) {
    return refuse('MPESA_MESSAGE_NO_AMOUNT', 'We could not find the amount in that message.')
  }

  return {
    ok: true,
    code: null,
    error: null,
    transactionCode,
    amount,
    transactionAt: parseTransactionDate(text),
    recipient: cleanClause(RECIPIENT.exec(text)?.[1]),
    payer: cleanClause(PAYER.exec(text)?.[1]),
  }
}

/**
 * Find the receipt code. A bare 10-character token counts only when it carries at
 * least one letter (an all-digit token that long is a phone number or account), is
 * not the currency keyword itself, and is not glued to `Ksh` — which is how a
 * hand-fabricated message usually looks.
 */
function findReceiptCode(text: string): string | null {
  for (const match of text.matchAll(RECEIPT)) {
    const value = match[1]
    if (!/[A-Za-z]/.test(value)) continue
    if (value.toUpperCase() === 'KES') continue
    const at = match.index ?? 0
    if (at >= 2 && (text[at - 1] === 'h' || text[at - 1] === 'H')) continue
    return value.toUpperCase()
  }
  return null
}

/**
 * `on 12/5/26 at 3:04 PM` → the absolute instant. Safaricom stamps its confirmations
 * in East Africa Time (UTC+3), so treating the parts as UTC would shift every
 * transaction three hours.
 */
function parseTransactionDate(text: string): Date | null {
  const match = DATE.exec(text)
  if (!match) return null

  const day = Number(match[1])
  const month = Number(match[2])
  let year = Number(match[3])
  let hour = Number(match[4])
  const minute = Number(match[5])
  if (year < 100) year += 2000

  const meridiem = match[6]?.toUpperCase()
  if (meridiem === 'PM' && hour < 12) hour += 12
  if (meridiem === 'AM' && hour === 12) hour = 0

  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) return null

  const utcMillis = Date.UTC(year, month - 1, day, hour, minute) - 3 * 60 * 60 * 1000
  const date = new Date(utcMillis)
  return Number.isNaN(date.getTime()) ? null : date
}

/** Tidy a captured name clause, or null when nothing usable was captured. */
function cleanClause(value: string | undefined): string | null {
  if (!value) return null
  const trimmed = value.trim().replace(/[.,]+$/, '')
  if (!trimmed) return null
  if (/^\d+$/.test(trimmed)) return null
  if (trimmed.length === 10 && !trimmed.includes(' ')) return null
  return trimmed.length > 200 ? trimmed.slice(0, 200) : trimmed
}
