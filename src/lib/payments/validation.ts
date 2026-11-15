/**
 * The M-PESA collection rules, mirrored from the server
 * (`Application/Services/MpesaDetailsValidation.cs`). Stated once here so the owner
 * form and the API cannot disagree — a value the form accepts is a value the server
 * accepts. Field keys match the API request's JSON names, so a server-side
 * `error.fields` message drops straight under the field it belongs to.
 */

export const MANUAL_MPESA = {
  paybill: 'paybill',
  till: 'till',
  sendMoney: 'send_money',
} as const

export type ManualMpesaMethod = (typeof MANUAL_MPESA)[keyof typeof MANUAL_MPESA]

/** Field keys as they appear on `SavePaymentConfig` / `error.fields`. */
export const MPESA_FIELD = {
  paybillNumber: 'mpesaPaybillNumber',
  paybillAccount: 'mpesaPaybillAccount',
  tillNumber: 'mpesaTillNumber',
  phoneNumber: 'mpesaPhoneNumber',
  payeeName: 'mpesaPayeeName',
  instructions: 'mpesaInstructions',
} as const

export type MpesaFieldKey = (typeof MPESA_FIELD)[keyof typeof MPESA_FIELD]

export const PAYEE_NAME_MAX = 60
export const INSTRUCTIONS_MAX = 300

const SHORT_NUMBER = /^\d{5,7}$/
const ACCOUNT = /^[A-Za-z0-9_-]{1,20}$/
const NORMALISED_PHONE = /^254[71]\d{8}$/

/** Canonicalises a stored or client method value; unknown values fall back to PayBill. */
export function normaliseMethod(value: string | null | undefined): ManualMpesaMethod {
  switch ((value ?? '').trim().toLowerCase()) {
    case 'till':
      return MANUAL_MPESA.till
    case 'send_money':
    case 'sendmoney':
    case 'phone':
      return MANUAL_MPESA.sendMoney
    default:
      return MANUAL_MPESA.paybill
  }
}

/** PayBill/Till number: 5–7 digits. Blank is treated as "not supplied" (valid). */
export function validateShortNumber(value: string | null | undefined): string | null {
  const v = (value ?? '').trim()
  if (!v) return null
  return SHORT_NUMBER.test(v) ? null : 'Use 5–7 digits.'
}

/** PayBill account: 1–20 characters of letters, digits, `-` or `_`. */
export function validatePaybillAccount(value: string | null | undefined): string | null {
  const v = (value ?? '').trim()
  if (!v) return null
  return ACCOUNT.test(v) ? null : 'Use 1–20 letters, digits, - or _.'
}

export function validatePayeeName(value: string | null | undefined): string | null {
  const v = (value ?? '').trim()
  if (!v) return null
  return v.length <= PAYEE_NAME_MAX ? null : `Use ${PAYEE_NAME_MAX} characters or fewer.`
}

export function validateInstructions(value: string | null | undefined): string | null {
  const v = (value ?? '').trim()
  if (!v) return null
  return v.length <= INSTRUCTIONS_MAX ? null : `Use ${INSTRUCTIONS_MAX} characters or fewer.`
}

/**
 * Accepts 07XXXXXXXX, 01XXXXXXXX, +2547XXXXXXXX, 2547XXXXXXXX, 7XXXXXXXX (and the
 * 1… equivalents), tolerating spaces and dashes. Returns the normalised
 * `254XXXXXXXXX` form, or null when the value is blank or not a valid Kenyan mobile.
 */
export function normaliseKenyanPhone(value: string | null | undefined): string | null {
  if (!value) return null
  const digits = value.replace(/\D/g, '')
  let candidate: string | null = null
  if (digits.length === 9 && (digits[0] === '7' || digits[0] === '1')) candidate = `254${digits}`
  else if (digits.length === 10 && (digits.startsWith('07') || digits.startsWith('01'))) candidate = `254${digits.slice(1)}`
  else if (digits.length === 12 && digits.startsWith('254')) candidate = digits
  return candidate && NORMALISED_PHONE.test(candidate) ? candidate : null
}

/** Valid when blank (optional) or a valid Kenyan mobile number in any accepted form. */
export function validatePhone(value: string | null | undefined): string | null {
  if (!value || !value.trim()) return null
  return normaliseKenyanPhone(value) ? null : 'Enter a valid M-PESA number, e.g. 0712 440 001.'
}

/** A stored/typed `254XXXXXXXXX` → the local `0712 440 001` grouping shown to a customer. */
export function formatKenyanPhone(value: string | null | undefined): string {
  if (!value) return ''
  const digits = value.replace(/\D/g, '')
  const local = digits.startsWith('254') && digits.length === 12 ? `0${digits.slice(3)}` : digits
  if (local.length !== 10) return value
  return `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}`
}

export type MpesaConfigDraft = {
  manualMpesaEnabled: boolean
  mpesaAccountType: string
  mpesaPaybillNumber: string
  mpesaPaybillAccount: string
  mpesaTillNumber: string
  mpesaPhoneNumber: string
  mpesaPayeeName: string
  mpesaInstructions: string
}

/**
 * Validates the editable manual M-PESA draft. Any supplied field must be
 * well-formed; when the channel is enabled the selected method's own fields must be
 * complete. Returns a map of field key → message (empty when valid).
 */
export function validateMpesaDraft(draft: MpesaConfigDraft): Partial<Record<MpesaFieldKey, string>> {
  const errors: Partial<Record<MpesaFieldKey, string>> = {}

  const formatErrors: Array<[MpesaFieldKey, string | null]> = [
    [MPESA_FIELD.paybillNumber, validateShortNumber(draft.mpesaPaybillNumber)],
    [MPESA_FIELD.paybillAccount, validatePaybillAccount(draft.mpesaPaybillAccount)],
    [MPESA_FIELD.tillNumber, validateShortNumber(draft.mpesaTillNumber)],
    [MPESA_FIELD.phoneNumber, validatePhone(draft.mpesaPhoneNumber)],
    [MPESA_FIELD.payeeName, validatePayeeName(draft.mpesaPayeeName)],
    [MPESA_FIELD.instructions, validateInstructions(draft.mpesaInstructions)],
  ]
  for (const [key, message] of formatErrors) if (message) errors[key] = message

  if (!draft.manualMpesaEnabled) return errors

  const method = normaliseMethod(draft.mpesaAccountType)
  if (method === MANUAL_MPESA.sendMoney) {
    if (!normaliseKenyanPhone(draft.mpesaPhoneNumber))
      errors[MPESA_FIELD.phoneNumber] = 'Enter the M-PESA number customers should send to.'
  } else if (method === MANUAL_MPESA.till) {
    if (!draft.mpesaTillNumber.trim() || validateShortNumber(draft.mpesaTillNumber))
      errors[MPESA_FIELD.tillNumber] = 'Enter the till number customers should pay.'
  } else {
    if (!draft.mpesaPaybillNumber.trim() || validateShortNumber(draft.mpesaPaybillNumber))
      errors[MPESA_FIELD.paybillNumber] = 'Enter the business number customers should pay.'
    if (!draft.mpesaPaybillAccount.trim() || validatePaybillAccount(draft.mpesaPaybillAccount))
      errors[MPESA_FIELD.paybillAccount] = 'Enter the account number customers should use.'
  }

  return errors
}
