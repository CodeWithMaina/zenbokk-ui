import type { AppointmentDashboardItem } from '../api/types'
import type { Tone } from '../../components/ui/badge'
import { zonedMinuteOfDay } from '../appointments/timezone'
import { appointmentStatusTone } from './appointment-status'

/**
 * Reading one day of appointments as a dashboard schedule.
 *
 * The schedule card answers three questions and nothing else: how the day is
 * going (a status breakdown), who is doing what (staff columns for the calendar)
 * and what comes next (the next appointment after now). All three are derived
 * from the same server rows, so the list, the bar and the calendar can never
 * describe different days.
 *
 * **Time is business time.** Every instant the API returns is UTC; the wall clock
 * this module reads it in is the business's own zone, passed in by the caller (the
 * one `OpeningHours.timeZoneId` publishes). Nothing here uses the browser's zone —
 * an owner checking their day from another country must still see the shop floor's
 * 09:00. Instants are only ever compared as instants.
 */

const timeFormatterCache = new Map<string, Intl.DateTimeFormat>()

function timeFormatter(timeZone: string): Intl.DateTimeFormat {
  const cached = timeFormatterCache.get(timeZone)
  if (cached) return cached
  const created = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  timeFormatterCache.set(timeZone, created)
  return created
}

function asInstant(instant: string | Date): Date {
  return instant instanceof Date ? instant : new Date(instant)
}

/** Minutes from midnight on the business's clock. */
export function minutesInZone(instant: string | Date, timeZone: string): number {
  return zonedMinuteOfDay(asInstant(instant), timeZone)
}

/** `09:30` on the business's clock. */
export function clockInZone(instant: string | Date, timeZone: string): string {
  return timeFormatter(timeZone).format(asInstant(instant))
}

/** The calendar date (`{ year, month, day }`) a key describes, at UTC noon. */
function keyAsUtcNoon(key: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key)
  if (!match) return null
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12))
  return Number.isNaN(date.getTime()) ? null : date
}

/**
 * A `yyyy-MM-dd` key rendered long: `Sunday 8 November`.
 *
 * Read in UTC deliberately — the key is already a calendar date, so formatting it
 * in any other zone could shift it by a day.
 */
export function dateKeyLabel(key: string): string {
  const date = keyAsUtcNoon(key)
  if (!date) return key
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(date)
}

/** The two pieces the week strip prints for a day: `Sun` and `8`. */
export function dateKeyChip(key: string): { weekday: string; day: number } {
  const date = keyAsUtcNoon(key)
  if (!date) return { weekday: '', day: 0 }
  return {
    weekday: new Intl.DateTimeFormat('en-GB', { weekday: 'short', timeZone: 'UTC' }).format(date),
    day: date.getUTCDate(),
  }
}

/**
 * The groups the status bar and its legend are drawn from.
 *
 * `booked` and `pending_payment` are one group on purpose: from the front desk
 * they are both "not confirmed yet", which is the question the bar answers. Each
 * group names the status whose colour it wears, so the bar uses the product's own
 * status palette instead of inventing a second one.
 */
export const SCHEDULE_GROUPS = [
  { key: 'completed', label: 'completed', status: 'completed', statuses: ['completed'] },
  { key: 'confirmed', label: 'confirmed', status: 'confirmed', statuses: ['confirmed'] },
  { key: 'pending', label: 'pending', status: 'booked', statuses: ['booked', 'pending_payment'] },
  { key: 'cancelled', label: 'cancelled', status: 'cancelled', statuses: ['cancelled'] },
  { key: 'no_show', label: 'no-shows', status: 'no_show', statuses: ['no_show'] },
] as const

export type ScheduleGroup = {
  key: string
  label: string
  /** The status whose colour the segment wears. */
  status: string
  tone: Tone
  count: number
}

/** Non-empty status groups, in the order the legend reads them. */
export function scheduleBreakdown(
  items: readonly AppointmentDashboardItem[],
): ScheduleGroup[] {
  const groups: ScheduleGroup[] = []

  for (const group of SCHEDULE_GROUPS) {
    const count = items.filter((item) =>
      (group.statuses as readonly string[]).includes(item.status),
    ).length
    if (count === 0) continue
    groups.push({
      key: group.key,
      label: group.label,
      status: group.status,
      tone: appointmentStatusTone(group.status),
      count,
    })
  }

  return groups
}

/** Count of appointments whose status is one of `statuses`. */
export function countByStatus(
  items: readonly AppointmentDashboardItem[],
  statuses: readonly string[],
): number {
  return items.filter((item) => statuses.includes(item.status)).length
}

/**
 * The status a row wears, translated into the vocabulary the token layer colours.
 *
 * `pending_payment` has no colour of its own, yet from the front desk it is the same
 * "not confirmed" queue as `booked` — so it takes `booked`'s colour. Using this for
 * both the row's dot and its pill keeps one row from showing two different answers.
 */
export function scheduleStatus(status: string): string {
  return status === 'pending_payment' ? 'booked' : status
}

/**
 * The vertical band the day's calendar draws.
 *
 * Mirrors the reference: a working day is at least 08:00–18:00, and a booking
 * outside it widens the band rather than being clipped. An empty day keeps the
 * default band so the grid still reads as a day.
 */
export function dayBand(
  items: readonly AppointmentDashboardItem[],
  timeZone: string,
): { startHour: number; endHour: number } {
  if (items.length === 0) return { startHour: 8, endHour: 18 }

  let earliest = 24 * 60
  let latest = 0
  for (const item of items) {
    const start = new Date(item.scheduledAt)
    const end = new Date(item.endAt)
    // A malformed row must not push the band to an impossible hour.
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) continue
    earliest = Math.min(earliest, minutesInZone(start, timeZone))
    latest = Math.max(latest, minutesInZone(end, timeZone))
  }

  if (earliest === 24 * 60) return { startHour: 8, endHour: 18 }

  const startHour = Math.max(0, Math.min(8, Math.floor(earliest / 60)))
  const endHour = Math.min(24, Math.max(18, Math.ceil(latest / 60)))

  return { startHour, endHour: Math.max(startHour + 1, endHour) }
}

export type StaffColumn = {
  key: string
  name: string
  items: AppointmentDashboardItem[]
}

/**
 * The calendar's staff columns, in first-booking order.
 *
 * A column is created for whoever actually has work that day — including
 * "Unassigned" when a booking has no staff member — so the grid never opens with
 * a row of empty columns. Ordering by first start time keeps each day's busiest
 * morning on the left.
 */
export function staffColumns(items: readonly AppointmentDashboardItem[]): StaffColumn[] {
  const columns = new Map<string, StaffColumn>()

  for (const item of items) {
    const key = item.staffUserId ?? 'unassigned'
    const column = columns.get(key) ?? {
      key,
      name: item.staffName ?? 'Unassigned',
      items: [],
    }
    column.items.push(item)
    columns.set(key, column)
  }

  return [...columns.values()]
    .map((column) => ({
      ...column,
      items: [...column.items].sort(
        (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
      ),
    }))
    .sort(
      (a, b) =>
        new Date(a.items[0].scheduledAt).getTime() -
        new Date(b.items[0].scheduledAt).getTime(),
    )
}

/** The first appointment still to start, ignoring cancelled ones. */
export function nextUp(
  items: readonly AppointmentDashboardItem[],
  now: Date,
): AppointmentDashboardItem | null {
  const upcoming = items
    .filter((item) => item.status !== 'cancelled')
    .filter((item) => new Date(item.scheduledAt).getTime() > now.getTime())
    .sort(
      (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
    )

  return upcoming[0] ?? null
}

/** Appointments that have not started yet and were not called off. */
export function upcomingCount(
  items: readonly AppointmentDashboardItem[],
  now: Date,
): number {
  return items.filter(
    (item) =>
      item.status !== 'cancelled' && new Date(item.scheduledAt).getTime() > now.getTime(),
  ).length
}

/**
 * What a booking is worth, as the server reported it: what has settled plus what
 * is still owed. Returns null when the response carried neither figure, so the
 * schedule can leave the amount out instead of printing a confident zero.
 */
export function appointmentValue(item: AppointmentDashboardItem): number | null {
  if (item.amountPaid === undefined && item.balance === undefined) return null
  return (item.amountPaid ?? 0) + (item.balance ?? 0)
}

