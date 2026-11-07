import type {
  Appointment,
  AppointmentDashboard,
  AppointmentDashboardItem,
  CustomerDashboardItem,
  ServiceDashboardItem,
  StaffDashboardItem,
} from '../api/types'
import {
  APPOINTMENT_STATUSES,
  appointmentStatusLabel,
  appointmentStatusTone,
  isAppointmentFinal,
} from '../dashboard/appointment-status'
import type { AppointmentStatus } from '../dashboard/appointment-status'

/**
 * Domain vocabulary for the Appointments module.
 *
 * The wire types live in `lib/api/types.ts` (they mirror the backend DTOs
 * exactly). The names below are what the screens reason about, and every rule
 * here is copied from the server so the UI can never offer a transition the API
 * will refuse:
 *
 *  - statuses and the transition table come from
 *    `PunchedApi/Application/Services/AppointmentStatusMachine.cs`;
 *  - "does this appointment still hold the slot?" comes from
 *    `AppointmentReservations.ReservingStatuses`.
 */

export { APPOINTMENT_STATUSES, appointmentStatusLabel, appointmentStatusTone, isAppointmentFinal }
export type { AppointmentStatus }

/**
 * Transition table (from → to), mirroring `AppointmentStatusMachine.Allowed`.
 * Terminal statuses have no entry, so no action is ever offered on them.
 */
const ALLOWED_TRANSITIONS: Record<AppointmentStatus, readonly AppointmentStatus[]> = {
  // A booking awaiting its fee is confirmed by verifying the payment, not by a
  // confirm tap, and is never moved straight to completed/no_show.
  pending_payment: ['confirmed', 'cancelled'],
  booked: ['confirmed', 'cancelled', 'no_show'],
  confirmed: ['completed', 'cancelled', 'no_show'],
  completed: [],
  cancelled: [],
  no_show: [],
}

/** Every status reachable from `status`, excluding itself. */
export function allowedTransitions(status: string): readonly AppointmentStatus[] {
  return ALLOWED_TRANSITIONS[status as AppointmentStatus] ?? []
}

/**
 * Statuses that still reserve the staff member's interval — mirrors
 * `AppointmentReservations.ReservingStatuses`. Used to decide whether a booking
 * would actually clash; a completed or cancelled appointment never blocks a
 * slot, which is what makes a reschedule's old interval free immediately.
 */
export const RESERVING_STATUSES: readonly AppointmentStatus[] = [
  'pending_payment',
  'booked',
  'confirmed',
]

export function reservesStaffTime(status: string): boolean {
  return RESERVING_STATUSES.includes(status as AppointmentStatus)
}

// ─────────────────────────────────────────────────────────────
//  Views, sorting and date ranges
// ─────────────────────────────────────────────────────────────

/** The three ways the design presents the same data. */
export const APPOINTMENT_VIEWS = ['calendar', 'table', 'cards'] as const
export type AppointmentView = (typeof APPOINTMENT_VIEWS)[number]

/** Calendar granularity. */
export const CALENDAR_MODES = ['day', 'week', 'month'] as const
export type CalendarMode = (typeof CALENDAR_MODES)[number]

/**
 * Sort options, in the order the design offers them.
 *
 * `when-asc` / `when-desc` map onto the server's `scheduledAt` sort. The rest
 * are applied client-side over the loaded page, because the endpoint only sorts
 * by `scheduledAt` and `createdAt` — sorting a page by a name the database did
 * not order would silently produce the wrong "A to Z".
 */
export const APPOINTMENT_SORTS = [
  'when-asc',
  'when-desc',
  'customer',
  'staff',
  'service',
  'price-desc',
  'status',
] as const
export type AppointmentSort = (typeof APPOINTMENT_SORTS)[number]

export const APPOINTMENT_SORT_LABELS: Record<AppointmentSort, string> = {
  'when-asc': 'Date, soonest first',
  'when-desc': 'Date, latest first',
  customer: 'Customer, A to Z',
  staff: 'Staff, A to Z',
  service: 'Service, A to Z',
  'price-desc': 'Price, high to low',
  status: 'Status',
}

/** True when the sort has to be applied in the browser rather than by the API. */
export function isClientSort(sort: AppointmentSort): boolean {
  return sort !== 'when-asc' && sort !== 'when-desc'
}

export const DATE_PRESETS = [
  'today',
  'tomorrow',
  'week',
  'nextweek',
  'month',
  'nextmonth',
  'custom',
  'all',
] as const
export type AppointmentDatePreset = (typeof DATE_PRESETS)[number]

export const DATE_PRESET_LABELS: Record<AppointmentDatePreset, string> = {
  today: 'Today',
  tomorrow: 'Tomorrow',
  week: 'This week',
  nextweek: 'Next week',
  month: 'This month',
  nextmonth: 'Next month',
  custom: 'Custom range',
  all: 'All dates',
}

// ─────────────────────────────────────────────────────────────
//  Filters
// ─────────────────────────────────────────────────────────────

/**
 * The filter set the screens hold.
 *
 * Status, staff and service are **single-valued**, matching
 * `GET /v1/businesses/me/appointments`, which binds `status`, `staffId` and
 * `serviceId` as scalars. The reference design's multi-select chips would need
 * a fan-out of requests (one per combination) and would make the server's
 * `totalCount` meaningless, so the drawer offers "All" plus one value each and
 * keeps every count and page number honest.
 */
export type AppointmentFilters = {
  search: string
  status: AppointmentStatus | null
  staffId: string | null
  serviceId: string | null
  preset: AppointmentDatePreset
  /** `yyyy-MM-dd`, only meaningful while `preset === 'custom'`. */
  from: string
  to: string
  sort: AppointmentSort
}

export const DEFAULT_APPOINTMENT_FILTERS: AppointmentFilters = {
  search: '',
  status: null,
  staffId: null,
  serviceId: null,
  preset: 'week',
  from: '',
  to: '',
  sort: 'when-asc',
}

/** How many filters differ from their default — the count on the Filters button. */
export function activeFilterCount(filters: AppointmentFilters): number {
  let count = 0
  if (filters.status) count += 1
  if (filters.staffId) count += 1
  if (filters.serviceId) count += 1
  if (filters.preset !== DEFAULT_APPOINTMENT_FILTERS.preset) count += 1
  if (filters.sort !== DEFAULT_APPOINTMENT_FILTERS.sort) count += 1
  return count
}

// ─────────────────────────────────────────────────────────────
//  Date helpers
// ─────────────────────────────────────────────────────────────

/** Local midnight for a date. */
export function startOfDay(date: Date): Date {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  return copy
}

/** Local end of day (23:59:59.999). */
export function endOfDay(date: Date): Date {
  const copy = new Date(date)
  copy.setHours(23, 59, 59, 999)
  return copy
}

/** Monday of the week containing `date`. */
export function startOfWeek(date: Date): Date {
  const copy = startOfDay(date)
  const offset = (copy.getDay() + 6) % 7 // Monday-first
  copy.setDate(copy.getDate() - offset)
  return copy
}

export function addDays(date: Date, days: number): Date {
  const copy = new Date(date)
  copy.setDate(copy.getDate() + days)
  return copy
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function startOfNextMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 1)
}

/** `yyyy-MM-dd` in the viewer's timezone, for `<input type="date">`. */
export function toDateValue(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/** Parse `yyyy-MM-dd` as local midnight (never UTC, which would shift the day). */
export function fromDateValue(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
}

/** Same calendar day, in the viewer's timezone. */
export function isSameDay(a: Date | number, b: Date | number): boolean {
  const left = new Date(a)
  const right = new Date(b)
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  )
}

/** A preset (or a custom range) resolved to an inclusive UTC window. */
export type DateWindow = { from: string | null; to: string | null }

export function resolveDateWindow(
  filters: AppointmentFilters,
  today: Date = new Date(),
): DateWindow {
  const iso = (date: Date) => date.toISOString()

  switch (filters.preset) {
    case 'today':
      return { from: iso(startOfDay(today)), to: iso(endOfDay(today)) }
    case 'tomorrow': {
      const day = addDays(today, 1)
      return { from: iso(startOfDay(day)), to: iso(endOfDay(day)) }
    }
    case 'week': {
      const start = startOfWeek(today)
      return { from: iso(start), to: iso(endOfDay(addDays(start, 6))) }
    }
    case 'nextweek': {
      const start = addDays(startOfWeek(today), 7)
      return { from: iso(start), to: iso(endOfDay(addDays(start, 6))) }
    }
    case 'month':
      return {
        from: iso(startOfMonth(today)),
        to: iso(endOfDay(addDays(startOfNextMonth(today), -1))),
      }
    case 'nextmonth': {
      const first = startOfNextMonth(today)
      return { from: iso(first), to: iso(endOfDay(addDays(startOfNextMonth(first), -1))) }
    }
    case 'custom': {
      const from = fromDateValue(filters.from)
      const to = fromDateValue(filters.to)
      return {
        from: from ? iso(startOfDay(from)) : null,
        to: to ? iso(endOfDay(to)) : null,
      }
    }
    case 'all':
    default:
      return { from: null, to: null }
  }
}

/** The inclusive local window a calendar pane displays. */
export function calendarWindow(mode: CalendarMode, anchor: Date): { start: Date; end: Date } {
  if (mode === 'month') {
    const start = startOfWeek(startOfMonth(anchor))
    return { start, end: addDays(start, 42) }
  }
  if (mode === 'week') {
    const start = startOfWeek(anchor)
    return { start, end: addDays(start, 7) }
  }
  const start = startOfDay(anchor)
  return { start, end: addDays(start, 1) }
}

// ─────────────────────────────────────────────────────────────
//  View models
// ─────────────────────────────────────────────────────────────

/**
 * One appointment as the list screens need it.
 *
 * The dashboard projection carries a single service id/name and no price or
 * duration; both are resolved from the response's own service bucket (real
 * catalogue rows) rather than being guessed from the time span.
 */
export type AppointmentRow = {
  id: string
  businessId: string
  scheduledAt: string
  endAt: string
  status: string
  customerId: string
  customerName: string
  customerEmail: string | null
  customerPhone: string | null
  customerAvatarUrl: string | null
  staffUserId: string | null
  staffName: string | null
  staffEmail: string | null
  staffAvatarUrl: string | null
  serviceId: string
  serviceName: string
  /** Catalogue duration; falls back to the booked interval when the service was deleted. */
  durationMinutes: number
  /** Catalogue price; null when the service no longer exists in the catalogue. */
  price: number | null
  /** True when the booked interval is longer than the catalogue duration. */
  multiService: boolean
}

/** The reference buckets the endpoint returns alongside a page. */
export type AppointmentReference = {
  customers: readonly CustomerDashboardItem[]
  staff: readonly StaffDashboardItem[]
  services: readonly ServiceDashboardItem[]
}

/** Minutes between two ISO instants. */
export function intervalMinutes(startIso: string, endIso: string): number {
  const start = new Date(startIso).getTime()
  const end = new Date(endIso).getTime()
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return 0
  return Math.round((end - start) / 60_000)
}

/** Turn one dashboard row into a view model, resolving its catalogue service. */
export function toAppointmentRow(
  item: AppointmentDashboardItem,
  services: ReadonlyMap<string, ServiceDashboardItem>,
): AppointmentRow {
  const service = services.get(item.serviceId)
  const booked = intervalMinutes(item.scheduledAt, item.endAt)
  const catalogue = service?.durationMinutes ?? 0

  return {
    id: item.id,
    businessId: item.businessId,
    scheduledAt: item.scheduledAt,
    endAt: item.endAt,
    status: item.status,
    customerId: item.customerId,
    customerName: item.customerName || 'Unknown customer',
    customerEmail: item.customerEmail,
    customerPhone: item.customerPhone,
    customerAvatarUrl: item.customerAvatarUrl,
    staffUserId: item.staffUserId,
    staffName: item.staffName,
    staffEmail: item.staffEmail,
    staffAvatarUrl: item.staffAvatarUrl,
    serviceId: item.serviceId,
    serviceName: item.serviceName || service?.name || 'Service',
    durationMinutes: catalogue > 0 ? catalogue : booked,
    price: service?.price ?? null,
    multiService: catalogue > 0 && booked > catalogue + 1,
  }
}

/** The reference buckets, indexed for lookup. */
export function indexReferences(dashboard: AppointmentDashboard): {
  services: Map<string, ServiceDashboardItem>
  customers: Map<string, CustomerDashboardItem>
  staff: Map<string, StaffDashboardItem>
} {
  return {
    services: new Map(dashboard.services.map((service) => [service.id, service])),
    customers: new Map(dashboard.customers.map((customer) => [customer.userId, customer])),
    staff: new Map(dashboard.staff.map((member) => [member.userId, member])),
  }
}

/** Every appointment on the page, as view models. */
export function toAppointmentRows(dashboard: AppointmentDashboard): AppointmentRow[] {
  const { services } = indexReferences(dashboard)
  return dashboard.appointments.map((item) => toAppointmentRow(item, services))
}

// ─────────────────────────────────────────────────────────────
//  Client-side ordering
// ─────────────────────────────────────────────────────────────

/**
 * Apply a non-server sort to an already-loaded page.
 *
 * The date sorts are handled by the API (`sortBy=scheduledAt`); everything else
 * orders the page the caller holds, which is why the table labels its count as
 * "in this range" rather than claiming a global ordering.
 */
export function sortAppointments(
  rows: readonly AppointmentRow[],
  sort: AppointmentSort,
): AppointmentRow[] {
  const copy = [...rows]
  const byStart = (a: AppointmentRow, b: AppointmentRow) =>
    new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()

  switch (sort) {
    case 'when-desc':
      return copy.sort((a, b) => byStart(b, a))
    case 'customer':
      return copy.sort((a, b) => a.customerName.localeCompare(b.customerName) || byStart(a, b))
    case 'staff':
      return copy.sort(
        (a, b) => (a.staffName ?? '').localeCompare(b.staffName ?? '') || byStart(a, b),
      )
    case 'service':
      return copy.sort((a, b) => a.serviceName.localeCompare(b.serviceName) || byStart(a, b))
    case 'price-desc':
      return copy.sort((a, b) => (b.price ?? 0) - (a.price ?? 0) || byStart(a, b))
    case 'status':
      return copy.sort((a, b) => a.status.localeCompare(b.status) || byStart(a, b))
    case 'when-asc':
    default:
      return copy.sort(byStart)
  }
}

// ─────────────────────────────────────────────────────────────
//  Presentation
// ─────────────────────────────────────────────────────────────

/**
 * Stable per-service colour, drawn from the reference design's palette.
 *
 * A hash of the service id picks the swatch, so the same service keeps its
 * colour across the calendar, the cards and the drawer without the colour ever
 * being stored or fabricated per row.
 */
const SERVICE_PALETTE = ['#4B6A8F', '#2F6B4F', '#A25F3B', '#A8821F', '#7C5A94'] as const

export function serviceColor(serviceId: string): string {
  let hash = 0
  for (let index = 0; index < serviceId.length; index += 1) {
    hash = (hash * 31 + serviceId.charCodeAt(index)) % 100_000
  }
  return SERVICE_PALETTE[hash % SERVICE_PALETTE.length]
}

/** `AP-3F2A9C41` — the reference the design prints in the detail header. */
export function appointmentReference(id: string): string {
  return `AP-${id.replace(/-/g, '').slice(0, 8).toUpperCase()}`
}

/** A relative description of where the appointment sits in time. */
export function appointmentTimingLabel(row: AppointmentRow, now: number = Date.now()): string {
  const start = new Date(row.scheduledAt).getTime()
  const end = new Date(row.endAt).getTime()

  if (row.status === 'cancelled') return 'Cancelled'
  if (row.status === 'no_show') return 'No-show'
  if (row.status === 'completed') return 'Completed'
  if (start <= now && now < end) return 'In progress'

  const deltaMinutes =
    start > now ? Math.round((start - now) / 60_000) : Math.round((now - end) / 60_000)
  const label =
    deltaMinutes < 60
      ? `${deltaMinutes} min`
      : deltaMinutes < 1440
        ? `${Math.round(deltaMinutes / 60)} h`
        : `${Math.round(deltaMinutes / 1440)} days`

  return start > now ? `Starts in ${label}` : `Ended ${label} ago`
}

/** 0–100 progress through a live appointment; null when it is not live. */
export function appointmentProgress(row: AppointmentRow, now: number = Date.now()): number | null {
  const start = new Date(row.scheduledAt).getTime()
  const end = new Date(row.endAt).getTime()
  if (end <= start) return null
  if (now < start || now >= end) return null
  return Math.min(100, Math.max(0, Math.round(((now - start) / (end - start)) * 100)))
}

/**
 * The appointment's service lines, in the order the server stored them. The list
 * projection only carries one, so the detail screen (which reads the full
 * record) is the place that sees all of them.
 */
export function serviceLines(appointment: Appointment): Appointment['services'] {
  return [...appointment.services].sort((a, b) => a.sortOrder - b.sortOrder)
}

/** Total of an appointment's service snapshots, as the server computed them. */
export function appointmentTotal(appointment: Appointment): number {
  return appointment.services.reduce((sum, line) => sum + line.price, 0)
}

/** Total duration of an appointment's service snapshots. */
export function appointmentDuration(appointment: Appointment): number {
  return appointment.services.reduce((sum, line) => sum + line.durationMinutes, 0)
}

/** Cancellation reasons offered by the design, mapped to the API's `note`. */
export const CANCELLATION_REASONS = [
  'Customer request',
  'Staff unavailable',
  'No-show',
  'Other',
] as const
export type CancellationReason = (typeof CANCELLATION_REASONS)[number]

/**
 * Payment states the payments module reports (`unpaid`, `partially_paid`,
 * `paid`). They are a different vocabulary from appointment statuses, so they
 * get their own labels rather than falling through to the raw wire value.
 */
const PAYMENT_STATUS_LABELS: Record<string, string> = {
  unpaid: 'Unpaid',
  partially_paid: 'Partially paid',
  paid: 'Paid',
  pending: 'Pending',
  failed: 'Failed',
  cancelled: 'Cancelled',
  reversed: 'Reversed',
}

export function paymentStatusLabel(status: string): string {
  return PAYMENT_STATUS_LABELS[status] ?? status
}
