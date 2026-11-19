/**
 * Finance display formatting.
 *
 * The business timezone is Africa/Nairobi (UTC+3, no daylight saving): date-range
 * inputs are converted to UTC bounds on the way out, and every date the owner reads
 * is rendered in Nairobi time regardless of the viewer's own timezone.
 */

const NAIROBI = 'Africa/Nairobi'
/** Nairobi is a fixed UTC+3 — used to turn `yyyy-mm-dd` date inputs into UTC bounds. */
const NAIROBI_OFFSET = '+03:00'

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  timeZone: NAIROBI,
})

const timeFormatter = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: NAIROBI,
})

/** `2026-11-24T14:02:00Z` → `24 Nov` in Nairobi. */
export function financeDate(iso: string): string {
  return dateFormatter.format(new Date(iso))
}

/** `2026-11-24T14:02:00Z` → `17:02` in Nairobi. */
export function financeTime(iso: string): string {
  return timeFormatter.format(new Date(iso))
}

/** `24 Nov, 17:02` in Nairobi — the design's paired date-time display. */
export function financeDateTime(iso: string): string {
  return `${financeDate(iso)}, ${financeTime(iso)}`
}

/** Start of a Nairobi calendar day as a UTC ISO instant, for a `from` filter. */
export function nairobiDayStartIso(date: string): string {
  return new Date(`${date}T00:00:00.000${NAIROBI_OFFSET}`).toISOString()
}

/** End of a Nairobi calendar day as a UTC ISO instant, for a `to` filter. */
export function nairobiDayEndIso(date: string): string {
  return new Date(`${date}T23:59:59.999${NAIROBI_OFFSET}`).toISOString()
}

/** `25471130012` → `+254 711 300 12`. Already-formatted or unknown shapes pass through. */
export function displayPhone(phone: string | null | undefined): string {
  if (!phone) return ''
  return phone.replace(/^254(\d{3})(\d+)$/, '+254 $1 $2')
}

/** `+254 711 300 12` / `0711 300 12` / spaces → `25471130012`, for storing and searching. */
export function normalizePhone(input: string): string {
  const digits = input.replace(/\D/g, '')
  if (digits.startsWith('254')) return digits
  if (digits.startsWith('0')) return `254${digits.slice(1)}`
  return digits
}

/** Loose phone digits of a search string, normalised the same way (`07…` and `+254…` match). */
export function phoneSearchDigits(input: string): string {
  return normalizePhone(input.trim())
}

/** Is `value` a v1–v5 UUID? Route params are checked before any fetch fires. */
export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

/** The M-Pesa receipt code shape: ten upper-case letters/digits. */
export const MPESA_CODE_PATTERN = /^[A-Z0-9]{10}$/
