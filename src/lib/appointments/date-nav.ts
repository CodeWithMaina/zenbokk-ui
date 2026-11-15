import { formatDay } from '../format'
import {
  addDays,
  endOfDay,
  isSameDay,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from './types'
import type { AppointmentDatePreset, CalendarMode } from './types'

/**
 * One date-navigation model for the whole appointments screen.
 *
 * Calendar, table and timeline all describe a *period*: the dates the user is
 * currently asking about. Before this existed each pane answered "which dates?"
 * differently — the calendar derived its window from a focus date, the list from a
 * saved preset — so moving a week in one view could show a different week in
 * another. Everything here is pure, so the rules can be tested without a browser,
 * and the route keeps a single period as the one source of truth.
 *
 * Arithmetic is calendar-based (year/month/day), never fixed millisecond offsets:
 * adding "one week" across a daylight-saving change must land on the same weekday,
 * not 167 or 169 hours later.
 */

/** The size of the step the period moves by. */
export type PeriodUnit = 'day' | 'week' | 'month' | 'custom'

export type Period = {
  unit: PeriodUnit
  /** Inclusive bounds of the period, in local days. */
  from: Date
  to: Date
}

/** The last day of the month a date falls in. */
export function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0)
}

/** How many days the period covers, counting both ends. */
export function periodDayCount(from: Date, to: Date): number {
  const days = Math.round(
    (startOfDay(to).getTime() - startOfDay(from).getTime()) / 86_400_000,
  )
  return Math.max(1, days + 1)
}

/** Adding months without skipping a date: 31 Jan + 1 month is the 28th or 29th. */
function addMonths(date: Date, months: number): Date {
  const shifted = new Date(date.getFullYear(), date.getMonth() + months, 1)
  const lastDay = endOfMonth(shifted).getDate()
  return new Date(shifted.getFullYear(), shifted.getMonth(), Math.min(date.getDate(), lastDay))
}

/** The step a preset implies. `null` means the preset is unbounded ("all dates"). */
export function presetPeriodUnit(preset: AppointmentDatePreset): PeriodUnit | null {
  switch (preset) {
    case 'today':
    case 'tomorrow':
      return 'day'
    case 'week':
    case 'nextweek':
      return 'week'
    case 'month':
    case 'nextmonth':
      return 'month'
    case 'custom':
      return 'custom'
    case 'all':
      return null
  }
}

/**
 * The period a calendar granularity and focus date describe: the day, the week
 * (Monday-first, matching the grid) or the whole calendar month around the date.
 * The month is bounded by its real first and last day — the grid draws 42 cells,
 * but "November" is November.
 */
export function calendarPeriod(mode: CalendarMode, anchor: Date): Period {
  if (mode === 'month') {
    return { unit: 'month', from: startOfMonth(anchor), to: endOfMonth(anchor) }
  }
  if (mode === 'week') {
    const from = startOfWeek(anchor)
    return { unit: 'week', from, to: addDays(from, 6) }
  }
  const from = startOfDay(anchor)
  return { unit: 'day', from, to: from }
}

/**
 * The same period one step earlier or later.
 *
 * A custom range keeps its own length, so a fortnight steps by a fortnight rather
 * than by an arbitrary month.
 */
export function shiftPeriod(period: Period, delta: number): Period {
  if (period.unit === 'month') {
    // A month period is a whole calendar month, so both ends are recomputed from the
    // first day: stepping from a 30-day month into a 31-day one must not carry the
    // old month's length over as a truncated range.
    const from = addMonths(period.from, delta)
    return { unit: 'month', from, to: endOfMonth(from) }
  }
  const step = (date: Date): Date => {
    if (period.unit === 'week') return addDays(date, delta * 7)
    if (period.unit === 'day') return addDays(date, delta)
    return addDays(date, delta * periodDayCount(period.from, period.to))
  }
  return { ...period, from: step(period.from), to: step(period.to) }
}

/**
 * Where the selected date goes when the period moves. The date keeps its position
 * inside the period, so the calendar highlights a date in the week it just moved to
 * rather than snapping back to the 1st or to today.
 */
export function shiftPeriodAnchor(period: Period, anchor: Date, delta: number): Date {
  if (period.unit === 'month') return addMonths(anchor, delta)
  if (period.unit === 'week') return addDays(anchor, delta * 7)
  if (period.unit === 'day') return addDays(anchor, delta)
  return addDays(anchor, delta * periodDayCount(period.from, period.to))
}

/** Does the period contain this date? */
export function periodContains(period: Period, date: Date): boolean {
  const value = startOfDay(date).getTime()
  return value >= startOfDay(period.from).getTime() && value <= endOfDay(period.to).getTime()
}

/** A date with its year, for ranges that leave the current year. */
function dayWithYear(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

/**
 * The toolbar's label, derived from the dates actually being shown.
 *
 * A period only ever says "Today", "This week" or "This month" while it really is
 * that period; one step away and it names the dates instead, so the label can never
 * claim the present while the screen shows November. Years appear only when they
 * need to — a range that crosses New Year cannot drop them, or 28 Dec – 3 Jan would
 * read as if it happened in a single week of one year.
 */
export function periodLabel(period: Period, today: Date = new Date()): string {
  const sameYear = period.from.getFullYear() === today.getFullYear()
  const acrossYears = period.from.getFullYear() !== period.to.getFullYear()
  const range = `${sameYear && !acrossYears ? formatDay(period.from) : dayWithYear(period.from)} – ${
    sameYear && !acrossYears ? formatDay(period.to) : dayWithYear(period.to)
  }`

  if (period.unit === 'day') {
    if (isSameDay(period.from, today)) return 'Today'
    return sameYear ? formatDay(period.from) : dayWithYear(period.from)
  }
  if (period.unit === 'week') {
    return periodContains(period, today) ? 'This week' : range
  }
  if (period.unit === 'month') {
    const current =
      period.from.getFullYear() === today.getFullYear() &&
      period.from.getMonth() === today.getMonth()
    return current
      ? 'This month'
      : new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(period.from)
  }
  return range
}

/** The label for a screen that is not filtered by date at all. */
export const ALL_DATES_LABEL = 'All dates'
