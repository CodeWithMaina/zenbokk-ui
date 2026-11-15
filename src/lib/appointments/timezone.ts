/**
 * Business-timezone arithmetic for the appointments screens.
 *
 * Every appointment instant the API returns is UTC (ISO-8601). What the screens
 * must show, however, is the business's own wall clock: a 09:00 booking is 09:00 on
 * the shop floor whatever timezone the person looking at the dashboard happens to be
 * sitting in. This module is the one place that turns a UTC instant into the
 * business's calendar, and a business wall-clock time back into a UTC instant.
 *
 * All conversion goes through `Intl.DateTimeFormat` with an explicit IANA timezone —
 * never an arbitrary millisecond offset — so daylight-saving transitions and
 * half-hour/45-minute offsets are handled by the platform's own timezone database.
 * The business timezone is the one the scheduling domain already stores on the
 * business and publishes in `GET /v1/businesses/{id}/opening-hours` (`timeZoneId`);
 * it is never inferred from the browser.
 */

/** Anything the platform can turn into an instant. */
export type InstantLike = Date | string | number

/** A wall-clock time (partial) in some timezone. `month` is 1-based. */
export type WallClock = {
  year: number
  month: number
  day: number
  hour?: number
  minute?: number
  second?: number
}

/** The wall-clock parts of an instant, read in a specific timezone. */
export type ZonedParts = Required<WallClock> & {
  /** 0 = Sunday … 6 = Saturday. */
  weekday: number
}

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
}

const formatterCache = new Map<string, Intl.DateTimeFormat>()

function formatter(timeZone: string): Intl.DateTimeFormat {
  const cached = formatterCache.get(timeZone)
  if (cached) return cached
  const created = new Intl.DateTimeFormat('en-US', {
    timeZone,
    // `h23` gives 00–23 so midnight never arrives as "24", which would break the
    // minute-of-day arithmetic the calendar and timeline position blocks with.
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    weekday: 'short',
  })
  formatterCache.set(timeZone, created)
  return created
}

/** The browser's own IANA timezone, or `UTC` when it cannot be resolved. */
export function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

/** True when the platform recognises the timezone identifier. */
export function isValidTimeZone(timeZone: string | null | undefined): boolean {
  if (!timeZone) return false
  try {
    new Intl.DateTimeFormat('en-US', { timeZone })
    return true
  } catch {
    return false
  }
}

/**
 * The timezone to actually compute in.
 *
 * A valid business timezone always wins. A missing or unrecognised one falls back
 * to the caller's fallback (the browser's, by default) rather than throwing — an
 * unknown identifier must not blank the calendar.
 */
export function resolveTimeZone(
  preferred: string | null | undefined,
  fallback: string = browserTimeZone(),
): string {
  if (isValidTimeZone(preferred)) return preferred as string
  if (isValidTimeZone(fallback)) return fallback
  return 'UTC'
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

/** The wall-clock parts of an instant, read in `timeZone`. */
export function zonedParts(instant: InstantLike, timeZone: string): ZonedParts {
  const date = instant instanceof Date ? instant : new Date(instant)
  const parts = formatter(timeZone).formatToParts(date)
  let year = 0
  let month = 1
  let day = 1
  let hour = 0
  let minute = 0
  let second = 0
  let weekday = 0
  for (const part of parts) {
    switch (part.type) {
      case 'year':
        year = Number(part.value)
        break
      case 'month':
        month = Number(part.value)
        break
      case 'day':
        day = Number(part.value)
        break
      case 'hour':
        hour = Number(part.value) % 24
        break
      case 'minute':
        minute = Number(part.value)
        break
      case 'second':
        second = Number(part.value)
        break
      case 'weekday':
        weekday = WEEKDAY_INDEX[part.value] ?? 0
        break
      default:
        break
    }
  }
  return { year, month, day, hour, minute, second, weekday }
}

/** `yyyy-MM-dd` of an instant, in `timeZone`. */
export function zonedDateKey(instant: InstantLike, timeZone: string): string {
  const { year, month, day } = zonedParts(instant, timeZone)
  return `${year}-${pad(month)}-${pad(day)}`
}

/** Minutes from local midnight of an instant, in `timeZone`. */
export function zonedMinuteOfDay(instant: InstantLike, timeZone: string): number {
  const { hour, minute } = zonedParts(instant, timeZone)
  return hour * 60 + minute
}

/** `2026-05-12` → `{ year, month, day }`. Returns null for a malformed key. */
export function dateKeyToParts(key: string): WallClock | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key)
  if (!match) return null
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) }
}

/** The timezone offset of `timeZone` at a given instant, in milliseconds. */
function offsetMs(utcMs: number, timeZone: string): number {
  const whole = Math.floor(utcMs / 1000) * 1000
  const { year, month, day, hour, minute, second } = zonedParts(whole, timeZone)
  const asUtc = Date.UTC(year, month - 1, day, hour, minute, second)
  return asUtc - whole
}

/**
 * The UTC instant for a wall-clock time in `timeZone`.
 *
 * Two offset probes are applied, which is what makes a daylight-saving transition
 * land correctly: the first uses the offset at the *nominal* instant, the second
 * re-reads the offset at the resolved instant. A time that does not exist (the
 * spring-forward gap) resolves just after the gap; an ambiguous time (the autumn
 * overlap) resolves to the first occurrence — both deterministic, so a test can
 * assert them.
 */
export function zonedTimeToUtc(wall: WallClock, timeZone: string): Date {
  const asUtc = Date.UTC(
    wall.year,
    wall.month - 1,
    wall.day,
    wall.hour ?? 0,
    wall.minute ?? 0,
    wall.second ?? 0,
  )
  const first = asUtc - offsetMs(asUtc, timeZone)
  const second = asUtc - offsetMs(first, timeZone)
  return new Date(second)
}

/** The inclusive start of a business-local day, as a UTC instant. */
export function zonedStartOfDayUtc(key: string, timeZone: string): Date {
  const parts = dateKeyToParts(key)
  if (!parts) return new Date(Number.NaN)
  return zonedTimeToUtc({ ...parts, hour: 0, minute: 0, second: 0 }, timeZone)
}

/** The exclusive end of a business-local day (== the next day's start), as UTC. */
export function zonedNextDayStartUtc(key: string, timeZone: string): Date {
  return zonedStartOfDayUtc(addDaysToDateKey(key, 1), timeZone)
}

/** Calendar day arithmetic on a `yyyy-MM-dd` key, independent of any timezone. */
export function addDaysToDateKey(key: string, days: number): string {
  const parts = dateKeyToParts(key)
  if (!parts) return key
  const shifted = new Date(Date.UTC(parts.year, parts.month - 1, parts.day))
  shifted.setUTCDate(shifted.getUTCDate() + days)
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`
}

/** 0 = Sunday … 6 = Saturday for a `yyyy-MM-dd` key. */
export function dateKeyWeekday(key: string): number {
  const parts = dateKeyToParts(key)
  if (!parts) return 0
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay()
}

/**
 * The business's "today" as a browser-local `Date` carrying the business's year,
 * month and day.
 *
 * The calendar grid, the period labels and the month/week arithmetic all reason in
 * plain local calendar dates. Handing them a Date whose Y/M/D *are* the business's
 * date keeps that logic untouched while making it business-local — only the
 * instant→date conversion has to know about timezones.
 */
export function businessToday(timeZone: string, now: InstantLike = Date.now()): Date {
  const { year, month, day } = zonedParts(now, timeZone)
  return new Date(year, month - 1, day)
}

/** The business-local `yyyy-MM-dd` of an instant. */
export function businessDateKey(timeZone: string, instant: InstantLike): string {
  return zonedDateKey(instant, timeZone)
}
