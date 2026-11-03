import type { StaffAvailabilityDay, StaffDetail, StaffMember, StaffTimeOff } from '../api/types'
import type { Tone } from '../../components/ui/badge'

/**
 * Presentation mapping for the Staff module: one place that turns API rows into
 * the labels, tones and times the shared UI kit already understands, so pages
 * and components never re-derive them.
 */

/** Filter chips shown above the roster. */
export const STAFF_ROSTER_FILTERS = ['all', 'active', 'inactive', 'invited'] as const

export type StaffRosterFilter = (typeof STAFF_ROSTER_FILTERS)[number]

const FILTER_LABELS: Record<StaffRosterFilter, string> = {
  all: 'All',
  active: 'Active this week',
  inactive: 'Idle',
  invited: 'Invited',
}

export function staffRosterFilterLabel(filter: StaffRosterFilter): string {
  return FILTER_LABELS[filter]
}

/**
 * The chip → endpoint mapping.
 *
 * The roster's own filters are *engagement* filters (`status=active|inactive`
 * means "stamped in the trailing week"), so they are sent as `activity`, which
 * is the endpoint's finer alias. `invited` is not a roster filter at all — it is
 * a lifecycle state that lives on the invitation list — so it is answered by
 * reading the invitations instead of by asking the roster for something it does
 * not model.
 */
export function staffRosterFilterQuery(filter: StaffRosterFilter): {
  status: string | null
  activity: string | null
} {
  if (filter === 'active') return { status: null, activity: 'week' }
  if (filter === 'inactive') return { status: null, activity: 'idle' }
  return { status: null, activity: null }
}

const MEMBERSHIP_LABELS: Record<string, string> = {
  Active: 'Active',
  Invited: 'Invited',
  Suspended: 'Inactive',
  Left: 'Left',
}

export function staffMembershipLabel(status: string | null | undefined): string {
  if (!status) return 'Active'
  return MEMBERSHIP_LABELS[status] ?? status
}

/** Maps the membership lifecycle onto the theme's `[data-status]` tokens. */
export function staffMembershipDataStatus(status: string | null | undefined): string {
  if (status === 'Suspended' || status === 'Left') return 'inactive'
  if (status === 'Invited') return 'pending'
  return 'active'
}

export function staffMembershipTone(status: string | null | undefined): Tone | undefined {
  if (status === 'Left') return 'danger'
  if (status === 'Suspended') return 'neutral'
  return undefined
}

/**
 * How engaged a member is, from the roster's own counters: a stamp today reads
 * as "Active today", a stamp in the trailing week as "Active this week",
 * anything else as idle.
 */
export function staffActivityLabel(
  member: Pick<StaffMember, 'stampsToday' | 'stampsLast7d'>,
): string {
  if ((member.stampsToday ?? 0) > 0) return 'Active today'
  if ((member.stampsLast7d ?? 0) > 0) return 'Active this week'
  return 'Idle'
}

export function staffActivityDataStatus(
  member: Pick<StaffMember, 'stampsToday' | 'stampsLast7d'>,
): string {
  if ((member.stampsToday ?? 0) > 0) return 'active'
  if ((member.stampsLast7d ?? 0) > 0) return 'confirmed'
  return 'inactive'
}

/** `540` → `09:00`. Minutes are from local midnight in the business time zone. */
export function minutesToTime(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined) return '—'
  const safe = Math.max(0, Math.min(1440, Math.round(minutes)))
  const hours = Math.floor(safe / 60)
  const mins = safe % 60
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
}

/** `09:30` → `570`; null when the value is not a time. */
export function timeToMinutes(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim())
  if (!match) return null
  const hours = Number(match[1])
  const mins = Number(match[2])
  if (hours > 23 || mins > 59) return null
  return hours * 60 + mins
}

/** `540, 1020` → `09:00 – 17:00`. */
export function formatWindow(startMinute: number, endMinute: number): string {
  return `${minutesToTime(startMinute)} – ${minutesToTime(endMinute)}`
}

/** Working minutes in a day, minus the break. */
export function workingMinutes(
  day: Pick<
    StaffAvailabilityDay,
    'isWorking' | 'startMinute' | 'endMinute' | 'breakStartMinute' | 'breakEndMinute'
  >,
): number {
  if (!day.isWorking) return 0
  const span = Math.max(0, day.endMinute - day.startMinute)
  const breakSpan =
    day.breakStartMinute !== null && day.breakEndMinute !== null
      ? Math.max(0, day.breakEndMinute - day.breakStartMinute)
      : 0
  return Math.max(0, span - breakSpan)
}

/** Total rostered minutes across the week. */
export function weeklyMinutes(days: readonly StaffAvailabilityDay[]): number {
  return days.reduce((total, day) => total + workingMinutes(day), 0)
}

/** Where the working week comes from, in the owner's words. */
export function availabilitySourceLabel(source: string): string {
  if (source === 'pattern') return 'Saved weekly hours'
  if (source === 'roster') return 'Derived from the roster already on the calendar'
  return 'Following the business booking hours'
}

/**
 * The seven weekdays in the order the editor shows them: Monday first, because
 * a working week is read that way, with Sunday last.
 */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0] as const

export function sortWeek(days: readonly StaffAvailabilityDay[]): StaffAvailabilityDay[] {
  return [...days].sort(
    (left, right) =>
      WEEK_ORDER.indexOf(left.dayOfWeek as (typeof WEEK_ORDER)[number]) -
      WEEK_ORDER.indexOf(right.dayOfWeek as (typeof WEEK_ORDER)[number]),
  )
}

/** Groups consecutive dated days off into readable ranges. */
export type StaffTimeOffRange = {
  from: string
  to: string
  days: number
  reason: string | null
}

export function groupTimeOff(entries: readonly StaffTimeOff[]): StaffTimeOffRange[] {
  const daysOff = entries
    .filter((entry) => !entry.isWorking)
    .map((entry) => ({ date: entry.date, reason: entry.reason }))
    .sort((left, right) => left.date.localeCompare(right.date))

  const ranges: StaffTimeOffRange[] = []

  for (const entry of daysOff) {
    const previous = ranges[ranges.length - 1]
    if (previous) {
      const nextDay = new Date(`${previous.to}T00:00:00Z`)
      nextDay.setUTCDate(nextDay.getUTCDate() + 1)
      if (nextDay.toISOString().slice(0, 10) === entry.date) {
        previous.to = entry.date
        previous.days += 1
        previous.reason = previous.reason ?? entry.reason
        continue
      }
    }

    ranges.push({ from: entry.date, to: entry.date, days: 1, reason: entry.reason })
  }

  return ranges
}

/** Profile completeness, measured against what the storefront actually needs. */
export type StaffCompleteness = {
  items: { label: string; done: boolean }[]
  percent: number
}

export function staffCompleteness(
  detail: Pick<
    StaffDetail,
    | 'fullName'
    | 'email'
    | 'phoneNumber'
    | 'positionName'
    | 'bio'
    | 'specialities'
    | 'yearsOfExperience'
    | 'services'
    | 'availability'
    | 'avatarUrl'
  >,
): StaffCompleteness {
  const items = [
    { label: 'Full name', done: detail.fullName.trim().length > 0 },
    { label: 'Email', done: detail.email.trim().length > 0 },
    { label: 'Phone number', done: Boolean(detail.phoneNumber?.trim()) },
    { label: 'Profile photo', done: Boolean(detail.avatarUrl) },
    { label: 'Job title', done: Boolean(detail.positionName) },
    { label: 'Services assigned', done: detail.services.length > 0 },
    { label: 'Public bio', done: Boolean(detail.bio?.trim()) },
    { label: 'Specialities', done: Boolean(detail.specialities?.trim()) },
    // Zero years is a real answer, so presence — not truthiness — decides this.
    { label: 'Years of experience', done: detail.yearsOfExperience !== null },
    { label: 'Working hours', done: detail.availability.some((day) => day.isWorking) },
  ]

  const done = items.filter((item) => item.done).length
  return { items, percent: Math.round((done / items.length) * 100) }
}

