const amountFormatter = new Intl.NumberFormat('en-KE', {
  maximumFractionDigits: 0,
})

/** Format a price the way the designs do: `KES 5,200`. */
export function money(value: number, currency = 'KES'): string {
  return `${currency} ${amountFormatter.format(value)}`
}

/** Format a service duration: 45 → `45 min`, 90 → `1h 30m`, 120 → `2h`. */
export function formatDuration(minutes: number): string {
  const safe = Math.max(0, Math.round(minutes))
  const hours = Math.floor(safe / 60)
  const rest = safe % 60

  if (hours === 0) return `${rest} min`
  if (rest === 0) return `${hours}h`
  return `${hours}h ${rest}m`
}

/** `Amina Wanjiku` → `AW`; `Amina` → `A`; empty → `?`. */
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

/** Clamp a number between a min and max. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

const timeFormatter = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

const dayFormatter = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
})

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

const numberFormatter = new Intl.NumberFormat('en-KE')

/** `2026-05-12T09:30:00Z` → `09:30` in the viewer's timezone. */
export function formatTime(iso: string): string {
  return timeFormatter.format(new Date(iso))
}

/** `2026-05-12T…` → `Tue 12 May`. */
export function formatDay(iso: string | Date): string {
  return dayFormatter.format(typeof iso === 'string' ? new Date(iso) : iso)
}

/** `2026-05-12T…` → `12 May 2026`. */
export function formatDate(iso: string | Date): string {
  return dateFormatter.format(typeof iso === 'string' ? new Date(iso) : iso)
}

/** `09:30–10:15`, collapsing an exact UTC day boundary when needed. */
export function formatTimeRange(startIso: string, endIso: string): string {
  return `${formatTime(startIso)}–${formatTime(endIso)}`
}

/** Thousands separators for counters: `1200` → `1,200`. */
export function formatNumber(value: number): string {
  return numberFormatter.format(value)
}

/** `1 client` / `3 clients`. Pass an explicit plural when it is irregular. */
export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${formatNumber(count)} ${count === 1 ? singular : plural}`
}

/** Local midnight for a date, as an ISO string the API accepts. */
export function startOfDayIso(date: Date = new Date()): string {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  return copy.toISOString()
}

/** Local end of day (23:59:59.999) as an ISO string. */
export function endOfDayIso(date: Date = new Date()): string {
  const copy = new Date(date)
  copy.setHours(23, 59, 59, 999)
  return copy.toISOString()
}

/** `2026-05-12` for `<input type="date">` in the viewer's timezone. */
export function toDateInputValue(date: Date = new Date()): string {
  const copy = new Date(date)
  const month = `${copy.getMonth() + 1}`.padStart(2, '0')
  const day = `${copy.getDate()}`.padStart(2, '0')
  return `${copy.getFullYear()}-${month}-${day}`
}

/** First name only — dashboards greet people, they don't label files. */
export function firstName(fullName: string | null | undefined): string {
  return fullName?.trim().split(/\s+/)[0] ?? 'there'
}
