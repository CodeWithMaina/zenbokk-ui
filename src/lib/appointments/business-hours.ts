import type { OpeningHoursDay, OpeningHoursPeriod, PublicOpeningHours } from '../api/types'
import { dateKeyWeekday } from './timezone'

/**
 * Business schedule helpers for the appointment calendar and timeline.
 *
 * The calendar's vertical band and the timeline's gap/schedule labels must follow
 * the business's OWN opening hours — never a hardcoded 08:00–17:00. The hours come
 * from the scheduling domain (`GET /v1/businesses/{id}/opening-hours`), which is the
 * same source the availability engine reads, so what the dashboard draws cannot
 * advertise a schedule the booking engine would refuse.
 *
 * Everything here works purely in minutes-from-local-midnight. The server stores
 * shift minutes as local wall-clock, and both the calendar and the timeline already
 * read appointment times through the browser clock, so both sides speak the same
 * "local minutes" vocabulary. No time-zone arithmetic happens in this module.
 */

/** A half-open opening window, in minutes from local midnight. */
export type WorkingPeriod = { openMinute: number; closeMinute: number }

/** One local day's resolved schedule. */
export type DaySchedule = {
  /** True when the business does not open at all on this date. */
  isClosed: boolean
  /** Merged opening windows, ascending. Empty when closed. */
  periods: WorkingPeriod[]
}

/** The band the calendar falls back to when the business's hours are unknown. */
export const DEFAULT_OPEN_MINUTE = 8 * 60
export const DEFAULT_CLOSE_MINUTE = 20 * 60

/** The fallback band, as a single day schedule (used while hours are loading). */
export const FALLBACK_DAY_SCHEDULE: DaySchedule = {
  isClosed: false,
  periods: [{ openMinute: DEFAULT_OPEN_MINUTE, closeMinute: DEFAULT_CLOSE_MINUTE }],
}

/** `HH:mm` → minutes from local midnight. Returns null for anything unparseable. */
export function clockToMinute(clock: string | null | undefined): number | null {
  if (!clock) return null
  const match = /^(\d{1,2}):(\d{2})$/.exec(clock.trim())
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 24 || minutes > 59) return null
  if (hours === 24 && minutes !== 0) return null
  return hours * 60 + minutes
}

/** Minutes from local midnight → `HH:mm`. */
export function minuteToClock(minute: number): string {
  const clamped = Math.max(0, Math.min(1440, Math.round(minute)))
  const hours = Math.floor(clamped / 60)
  const minutes = clamped % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

/** Local calendar date key, `yyyy-MM-dd`, matching the special-hours payload. */
export function localDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** One period response → a minute window, dropping anything not a real window. */
function toPeriod(period: OpeningHoursPeriod): WorkingPeriod | null {
  const open = clockToMinute(period.opensAt)
  const close = clockToMinute(period.closesAt)
  if (open === null || close === null || close <= open) return null
  return { openMinute: open, closeMinute: close }
}

/** A day's schedule, whichever shape (weekly day or special day) it arrives in. */
function fromDay(day: Pick<OpeningHoursDay, 'isClosed' | 'periods'>): DaySchedule {
  const periods = day.periods
    .map(toPeriod)
    .filter((period): period is WorkingPeriod => period !== null)
    .sort((a, b) => a.openMinute - b.openMinute)
  return { isClosed: day.isClosed || periods.length === 0, periods }
}

/**
 * The schedule for a business-local `yyyy-MM-dd` key.
 *
 * The key form is what the timeline and the API speak (business-local dates), so it
 * resolves the same way `resolveDaySchedule` does for a `Date` — a dated exception
 * wins, then the weekly pattern, then the fallback band.
 */
export function resolveDayScheduleForKey(
  hours: PublicOpeningHours | null | undefined,
  key: string,
): DaySchedule {
  if (!hours) return FALLBACK_DAY_SCHEDULE

  const special = hours.specialHours.find((entry) => entry.date === key)
  if (special) return fromDay(special)

  const weekday = hours.days.find((day) => day.dayOfWeek === dateKeyWeekday(key))
  if (weekday) return fromDay(weekday)

  return FALLBACK_DAY_SCHEDULE
}

/**
 * The schedule for one local date.
 *
 * A dated exception (`specialHours`) always wins over the weekly pattern — a
 * holiday or a one-off day is exactly what it exists to express. With neither
 * present the caller gets the fallback band rather than a phantom closure, because
 * "we do not know" must never be drawn as "closed".
 */
export function resolveDaySchedule(
  hours: PublicOpeningHours | null | undefined,
  date: Date,
): DaySchedule {
  if (!hours) return FALLBACK_DAY_SCHEDULE
  return resolveDayScheduleForKey(hours, localDateKey(date))
}

/**
 * Is the booked window fully inside one of the day's opening windows?
 *
 * A booking that starts before the business opens, ends after it closes, or sits
 * inside a break is "outside hours" — the timeline calls that out rather than
 * letting it read as an ordinary slot. The half-open convention ([open, close))
 * means a booking ending exactly at closing time is still inside.
 */
export function minuteRangeIsOpen(
  periods: readonly WorkingPeriod[],
  startMinute: number,
  endMinute: number,
): boolean {
  return periods.some(
    (period) => startMinute >= period.openMinute && endMinute <= period.closeMinute,
  )
}

/** True when every date in the range is a closed day. */
export function isRangeClosed(
  hours: PublicOpeningHours | null | undefined,
  dates: readonly Date[],
): boolean {
  if (!hours || dates.length === 0) return false
  return dates.every((date) => resolveDaySchedule(hours, date).isClosed)
}

/**
 * The vertical band the time grid should draw, hour-aligned and covering every
 * opening window across `dates`.
 *
 * `dates` is the set of days on screen (one for the day view, seven for the week,
 * a month's days for the month view). Taking the union means a business that opens
 * 07:00 on weekdays and 10:00 at the weekend gets one band that fits both, instead
 * of a band that hides the early weekday work. When nothing is known — hours still
 * loading, or a request that failed — the fallback band is returned so the grid
 * still renders sensibly.
 */
export function scheduleBand(
  hours: PublicOpeningHours | null | undefined,
  dates: readonly Date[],
): { startMinute: number; endMinute: number } {
  if (!hours || dates.length === 0) {
    return { startMinute: DEFAULT_OPEN_MINUTE, endMinute: DEFAULT_CLOSE_MINUTE }
  }

  let earliest = Number.POSITIVE_INFINITY
  let latest = Number.NEGATIVE_INFINITY
  for (const date of dates) {
    for (const period of resolveDaySchedule(hours, date).periods) {
      earliest = Math.min(earliest, period.openMinute)
      latest = Math.max(latest, period.closeMinute)
    }
  }

  if (!Number.isFinite(earliest) || !Number.isFinite(latest) || latest <= earliest) {
    return { startMinute: DEFAULT_OPEN_MINUTE, endMinute: DEFAULT_CLOSE_MINUTE }
  }

  // Snap outwards to whole hours so the gutter always reads on the hour.
  const startMinute = Math.max(0, Math.floor(earliest / 60) * 60)
  const endMinute = Math.min(1440, Math.max(startMinute + 60, Math.ceil(latest / 60) * 60))
  return { startMinute, endMinute }
}

/**
 * The opening windows that actually cover `date`, or the fallback band when the
 * date's schedule is unknown. A closed day yields an empty list.
 */
export function dayOpeningPeriods(
  hours: PublicOpeningHours | null | undefined,
  date: Date,
): WorkingPeriod[] {
  const schedule = resolveDaySchedule(hours, date)
  if (schedule.periods.length > 0) return schedule.periods
  return schedule.isClosed ? [] : FALLBACK_DAY_SCHEDULE.periods
}
