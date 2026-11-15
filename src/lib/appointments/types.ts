import type {
  Appointment,
  AppointmentDashboard,
  AppointmentDashboardItem,
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
import {
  addDaysToDateKey,
  browserTimeZone,
  dateKeyToParts,
  dateKeyWeekday,
  resolveTimeZone,
  zonedDateKey,
  zonedNextDayStartUtc,
  zonedStartOfDayUtc,
} from './timezone'

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

/**
 * The three ways the module presents the same data.
 *
 *  - `calendar` is a time GRID: where appointments sit across days and weeks.
 *  - `table` is a structured management view: search, sort, paginate, act.
 *  - `timeline` is a chronological FEED: what is happening during the selected
 *    period, in clock order, with the gaps between bookings made visible.
 */
export const APPOINTMENT_VIEWS = ['calendar', 'table', 'timeline'] as const
export type AppointmentView = (typeof APPOINTMENT_VIEWS)[number]

/** Calendar granularity. */
export const CALENDAR_MODES = ['day', 'week', 'month'] as const
export type CalendarMode = (typeof CALENDAR_MODES)[number]

/**
 * Sort options, in the order the design offers them.
 *
 * Every option except the name/price/status ones is decided by the server:
 * `scheduledAt` is the schedule order, `createdAt` is "what came in just now".
 * The rest are applied client-side over the loaded page, because the endpoint
 * does not sort by a display name — sorting a page by a name the database did
 * not order would silently produce the wrong "A to Z".
 */
export const APPOINTMENT_SORTS = [
  'when-asc',
  'when-desc',
  'created-desc',
  'created-asc',
  'customer',
  'staff',
  'service',
  'price-desc',
  'status',
] as const
export type AppointmentSort = (typeof APPOINTMENT_SORTS)[number]

export const APPOINTMENT_SORT_LABELS: Record<AppointmentSort, string> = {
  'when-asc': 'Scheduled time, soonest first',
  'when-desc': 'Scheduled time, latest first',
  'created-desc': 'Recently created',
  'created-asc': 'Oldest created',
  customer: 'Customer, A to Z',
  staff: 'Staff, A to Z',
  service: 'Service, A to Z',
  'price-desc': 'Price, high to low',
  status: 'Status',
}

/**
 * The order the calendar defaults to: a time grid is read top to bottom, so its
 * rows are always in clock order regardless of what the list is sorted by.
 */
export const DEFAULT_APPOINTMENT_SORT: AppointmentSort = 'when-asc'

/**
 * The order the list-shaped views (table and timeline) default to: what came in
 * most recently, first.
 *
 * This is deliberately not the scheduled order. A booking taken this morning for
 * next month belongs above one taken yesterday for tomorrow, because the list is
 * answering "what has just come in?" until the owner says otherwise. The endpoint's
 * own default is the same `createdAt DESC`, so a client that sends no sort at all
 * still gets this order.
 */
export const DEFAULT_LIST_SORT: AppointmentSort = 'created-desc'

/** The calendar's own order, named so a caller can be explicit rather than rely on a default. */
export const DEFAULT_CALENDAR_SORT: AppointmentSort = DEFAULT_APPOINTMENT_SORT

/** Sorts the list view offers, in the order they are presented. */
export const LIST_SORTS = [
  'created-desc',
  'created-asc',
  'when-asc',
  'when-desc',
  'customer',
  'staff',
  'service',
  'price-desc',
  'status',
] as const satisfies readonly AppointmentSort[]

/** True when the sort has to be applied in the browser rather than by the API. */
export function isClientSort(sort: AppointmentSort): boolean {
  return sort === 'customer' || sort === 'staff' || sort === 'service'
}

/**
 * The database ordering for a server-side sort.
 *
 * One place decides what each label means, so the request the list sends and the
 * order the endpoint actually applies can never drift apart.
 */
export function appointmentSortQuery(sort: AppointmentSort): {
  sortBy: 'scheduledAt' | 'createdAt'
  sortDirection: 'asc' | 'desc'
} {
  switch (sort) {
    case 'created-desc':
      return { sortBy: 'createdAt', sortDirection: 'desc' }
    case 'created-asc':
      return { sortBy: 'createdAt', sortDirection: 'asc' }
    case 'when-desc':
      return { sortBy: 'scheduledAt', sortDirection: 'desc' }
    default:
      return { sortBy: 'scheduledAt', sortDirection: 'asc' }
  }
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
 * Payment-verification filter.
 *
 * Payment is not a column on an appointment: one appointment can hold many payment
 * records — an upfront booking fee, a later balance, a reversal — so these options
 * are defined against the payment ledger and aggregated on the server. Only a
 * genuinely settled (provider-`Success` or owner-`Verified`) payment counts as
 * collected; a `Submitted`/`UnderReview`/`Flagged` claim never does, and neither do
 * failed, expired, cancelled, refunded or reversed rows. The wire values below match
 * the backend's classification exactly.
 */
export const PAYMENT_FILTERS = [
  'all',
  'verified',
  'partial',
  'awaiting',
  'unpaid',
  'failed',
  'refunded',
] as const
export type PaymentFilter = (typeof PAYMENT_FILTERS)[number]

export const PAYMENT_FILTER_LABELS: Record<PaymentFilter, string> = {
  all: 'All payment states',
  verified: 'Fully paid & verified',
  partial: 'Partially paid',
  awaiting: 'Awaiting verification',
  unpaid: 'Unpaid',
  failed: 'Failed or expired',
  refunded: 'Refunded or reversed',
}

/**
 * The filter set the screens hold.
 *
 * Status stays single-valued (one status is one question), while services,
 * customers and staff are **multi-select**: the endpoint binds `serviceIds`,
 * `customerIds` and `staffIds` as repeated query keys, so choosing three services
 * is still ONE request with ONE honest `totalCount` — not a fan-out whose pages
 * and counts would each be a partial answer.
 */
export type AppointmentFilters = {
  search: string
  status: AppointmentStatus | null
  /** Selected staff member ids. Inert while the Staff module is off. */
  staffIds: string[]
  serviceIds: string[]
  customerIds: string[]
  /** Payment-verification state, aggregated from the payment ledger server-side. */
  payment: PaymentFilter
  preset: AppointmentDatePreset
  /** `yyyy-MM-dd`, only meaningful while `preset === 'custom'`. */
  from: string
  to: string
  sort: AppointmentSort
}

export const DEFAULT_APPOINTMENT_FILTERS: AppointmentFilters = {
  search: '',
  status: null,
  staffIds: [],
  serviceIds: [],
  customerIds: [],
  payment: 'all',
  preset: 'week',
  from: '',
  to: '',
  sort: DEFAULT_APPOINTMENT_SORT,
}

/** How many filters differ from their default — the count on the Filters button. */
export function activeFilterCount(filters: AppointmentFilters): number {
  let count = 0
  if (filters.status) count += 1
  if (filters.staffIds.length > 0) count += 1
  if (filters.serviceIds.length > 0) count += 1
  if (filters.customerIds.length > 0) count += 1
  if (filters.payment !== 'all') count += 1
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

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

/** Monday of the week containing a date key (Monday-first, matching the calendar). */
function mondayKey(dateKey: string): string {
  return addDaysToDateKey(dateKey, -((dateKeyWeekday(dateKey) + 6) % 7))
}

/** The first day of a month, `monthOffset` whole months away, as a key. */
function monthStartKey(dateKey: string, monthOffset: number): string {
  const parts = dateKeyToParts(dateKey)
  if (!parts) return dateKey
  const shifted = new Date(Date.UTC(parts.year, parts.month - 1 + monthOffset, 1))
  return `${shifted.getUTCFullYear()}-${pad2(shifted.getUTCMonth() + 1)}-01`
}

/**
 * A preset (or a custom range) resolved to the UTC instants the API filters on,
 * expressed in the BUSINESS's calendar.
 *
 * The API stores and compares instants in UTC, so "today" has to be turned into the
 * business-local day's own start and end before it is sent — otherwise a business in
 * Nairobi asked for its Tuesday would receive part of the viewer's Tuesday, and an
 * appointment either side of local midnight would land on the wrong day. Each
 * boundary is resolved with the zone database (`zonedStartOfDayUtc`), never by
 * appending a fixed offset, so a daylight-saving change inside the range is handled.
 *
 * With the browser's own timezone (the default) this is exactly the previous
 * behaviour — the local day the viewer sees.
 */
export function resolveDateWindow(
  filters: AppointmentFilters,
  today: Date = new Date(),
  timeZone: string = browserTimeZone(),
): DateWindow {
  const zone = resolveTimeZone(timeZone)
  const todayKey = zonedDateKey(today, zone)

  const startOf = (key: string) => zonedStartOfDayUtc(key, zone).toISOString()
  const endOf = (key: string) =>
    new Date(zonedNextDayStartUtc(key, zone).getTime() - 1).toISOString()
  const day = (key: string): DateWindow => ({ from: startOf(key), to: endOf(key) })
  const span = (startKey: string, endKey: string): DateWindow => ({
    from: startOf(startKey),
    to: endOf(endKey),
  })

  switch (filters.preset) {
    case 'today':
      return day(todayKey)
    case 'tomorrow':
      return day(addDaysToDateKey(todayKey, 1))
    case 'week': {
      const monday = mondayKey(todayKey)
      return span(monday, addDaysToDateKey(monday, 6))
    }
    case 'nextweek': {
      const monday = addDaysToDateKey(mondayKey(todayKey), 7)
      return span(monday, addDaysToDateKey(monday, 6))
    }
    case 'month': {
      const first = monthStartKey(todayKey, 0)
      return span(first, addDaysToDateKey(monthStartKey(todayKey, 1), -1))
    }
    case 'nextmonth': {
      const first = monthStartKey(todayKey, 1)
      return span(first, addDaysToDateKey(monthStartKey(todayKey, 2), -1))
    }
    case 'custom': {
      const from = filters.from && dateKeyToParts(filters.from) ? day(filters.from).from : null
      const to = filters.to && dateKeyToParts(filters.to) ? day(filters.to).to : null
      return { from, to }
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
  /** `guest` (booked without an account) | `registered` (a real account). */
  customerType: string
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
    customerType: item.customerType,
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
  staff: Map<string, StaffDashboardItem>
} {
  return {
    services: new Map(dashboard.services.map((service) => [service.id, service])),
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
