import type { AvailabilitySlot, CustomerOption } from '../api/types'
import { appointmentReference } from '../appointments/types'

/**
 * Booking flow vocabulary.
 *
 * Everything the wizard decides *by itself* lives here: how a total is summed,
 * how a booking percentage turns into an amount, which step is complete, how a
 * typed M-Pesa code is validated and how a custom start time is checked against
 * the server's own slot grid. The component tree only renders these answers.
 *
 * The lists below are the app's own names for what the server calls
 * `walk_in`/`appointment`, `full_payment`/`booking_fee`/`balance_payment` and
 * `cash`/`mpesa`. They are translated at the single call site
 * (`components/booking/use-booking-wizard.ts`) so a wire name never leaks into
 * the UI and vice versa.
 */

export const BOOKING_STEP_KEYS = ['customer', 'services', 'schedule', 'payment', 'review'] as const
export type BookingStepKey = (typeof BOOKING_STEP_KEYS)[number]

export const BOOKING_STEP_LABELS: Record<BookingStepKey, string> = {
  customer: 'Customer',
  services: 'Services',
  schedule: 'Date & Time',
  payment: 'Payment',
  review: 'Review',
}

export const BOOKING_TYPES = ['walk_in', 'appointment'] as const
export type BookingType = (typeof BOOKING_TYPES)[number]

export const BOOKING_TYPE_LABELS: Record<BookingType, string> = {
  walk_in: 'Walk-in',
  appointment: 'Appointment',
}

/**
 * How the money is taken. These map 1:1 onto the server's `type`:
 * `full` → `full_payment`, `booking` → `booking_fee`, `after` → nothing is
 * recorded now (the appointment is created with `payAfterService: true`).
 */
export const PAYMENT_PLANS = ['full', 'booking', 'after'] as const
export type PaymentPlan = (typeof PAYMENT_PLANS)[number]

export const PAYMENT_PLAN_LABELS: Record<PaymentPlan, string> = {
  full: 'Paid in full',
  booking: 'Booking payment',
  after: 'After service payment',
}

export const PAYMENT_METHODS = ['mpesa', 'cash', 'other'] as const
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  mpesa: 'M-Pesa',
  cash: 'Cash',
  other: 'Other',
}

/**
 * The booking percentage used when the business has not configured one.
 *
 * The real value is read from the business's payment configuration
 * (`bookingFeePercentage`, owner-editable in Settings → Payments). This is only
 * the fallback for a business that has never set one, and it is named so it can
 * be found and changed in one place.
 */
export const DEFAULT_BOOKING_PERCENT = 30
export const BOOKING_PERCENT_MIN = 1
export const BOOKING_PERCENT_MAX = 99

/** A service as the wizard carries it: the catalogue row, already resolved. */
export type BookingServiceLine = {
  id: string
  name: string
  price: number
  durationMinutes: number
}

/**
 * A row of the catalogue the flow chooses from.
 *
 * The extra two fields are optional because callers hold different
 * projections of the same service: the appointments dashboard's bucket carries
 * neither, while the services catalogue carries both. A capability the data
 * cannot support (a category filter, say) is simply not offered.
 */
export type BookingCatalogueService = BookingServiceLine & {
  /** Absent means "assume bookable"; the step hides only an explicit `false`. */
  isActive?: boolean
  categoryName?: string | null
}

/** The outcome of the last custom-time check. */
export type CustomTimeResult = {
  time: string
  ok: boolean
  message: string
  nearest: string[]
}

/** The one central booking state. Mirrors the prototype's `fresh()` object. */
export type BookingDraft = {
  step: number
  type: BookingType | null
  customer: CustomerOption | null
  services: BookingServiceLine[]
  /** Business-local `yyyy-MM-dd`; null for a walk-in. */
  date: string | null
  /** `HH:mm` on `date`; null for a walk-in. */
  slot: string | null
  /** Walk-in start, minutes from midnight. */
  walkInStart: number | null
  /** A start time typed by hand, awaiting a check against the server's grid. */
  customTime: string
  customResult: CustomTimeResult | null
  plan: PaymentPlan
  method: PaymentMethod
  percent: number
  /** M-Pesa transaction code as typed by the owner. */
  transactionCode: string
  /** M-Pesa payer phone; defaults to the customer's phone. */
  payerPhone: string
  /** Optional reference for an "other" method. */
  reference: string
  /** A pasted M-Pesa confirmation, when the owner has one to hand. */
  confirmation: string
}

export function emptyBookingDraft(): BookingDraft {
  return {
    step: 0,
    type: null,
    customer: null,
    services: [],
    date: null,
    slot: null,
    walkInStart: null,
    customTime: '',
    customResult: null,
    plan: 'full',
    method: 'mpesa',
    percent: DEFAULT_BOOKING_PERCENT,
    transactionCode: '',
    payerPhone: '',
    reference: '',
    confirmation: '',
  }
}

// ─────────────────────────────────────────────────────────────
//  Money and time
// ─────────────────────────────────────────────────────────────

/**
 * Price and duration of a booking's services, summed one after another.
 *
 * This is the ONE place the wizard adds up a booking. The server recomputes both
 * from the catalogue when the appointment is created, so this figure is a
 * preview that can never disagree with the record: if the two ever differ, the
 * server's answer wins and this is wrong, not the other way round.
 */
export function serviceTotals(services: readonly BookingServiceLine[]): {
  price: number
  durationMinutes: number
} {
  let price = 0
  let durationMinutes = 0
  for (const service of services) {
    price += service.price
    durationMinutes += service.durationMinutes
  }
  return { price, durationMinutes }
}

/** `345` → `05:45`. The one clock formatter for the flow. */
export function minutesToClock(minutes: number | null): string {
  if (minutes == null) return ''
  const normalised = ((Math.round(minutes) % 1440) + 1440) % 1440
  const hours = Math.floor(normalised / 60)
  const rest = normalised % 60
  return `${String(hours).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
}

/** `05:45` → `345`; null when the value is not a clock time. */
export function clockToMinutes(value: string | null | undefined): number | null {
  if (!value) return null
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim())
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) return null
  return hours * 60 + minutes
}

/** Now, rounded up to the next five-minute boundary — a walk-in starts "about now". */
export function roundUpToFiveMinutes(now: Date = new Date()): number {
  return Math.ceil((now.getHours() * 60 + now.getMinutes()) / 5) * 5
}

/** A walk-in's start: the owner's adjustment, else now rounded up to five minutes. */
export function walkInStartMinutes(draft: BookingDraft, now: Date = new Date()): number {
  return draft.walkInStart ?? roundUpToFiveMinutes(now)
}

/** Where the booking starts, as minutes from midnight, or null when undecided. */
export function bookingStartMinutes(draft: BookingDraft, now: Date = new Date()): number | null {
  if (draft.type === 'walk_in') return walkInStartMinutes(draft, now)
  if (draft.type === 'appointment') return clockToMinutes(draft.slot)
  return null
}

/** The expected finish, walked forward from the summed service duration. */
export function bookingEndMinutes(draft: BookingDraft, now: Date = new Date()): number | null {
  const start = bookingStartMinutes(draft, now)
  if (start == null) return null
  const { durationMinutes } = serviceTotals(draft.services)
  return start + durationMinutes
}

// ─────────────────────────────────────────────────────────────
//  Payment arithmetic
// ─────────────────────────────────────────────────────────────

/** The booking percentage must be a whole number between 1 and 99. */
export function normaliseBookingPercent(value: string | number): number {
  if (typeof value === 'string' && value.trim() === '') return DEFAULT_BOOKING_PERCENT
  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(parsed)) return DEFAULT_BOOKING_PERCENT
  return Math.round(parsed)
}

export function bookingPercentValid(percent: number): boolean {
  return (
    Number.isFinite(percent) && percent >= BOOKING_PERCENT_MIN && percent <= BOOKING_PERCENT_MAX
  )
}

/** `round(total × percentage ÷ 100)` — the deposit on a booking payment. */
export function bookingPaymentAmount(total: number, percent: number): number {
  return Math.round((total * percent) / 100)
}

/** What the owner is recording right now, before the server has any say. */
export function recordedAmount(draft: BookingDraft): number {
  const { price } = serviceTotals(draft.services)
  if (draft.plan === 'full') return price
  if (draft.plan === 'booking') return Math.min(bookingPaymentAmount(price, draft.percent), price)
  return 0
}

/** What is still owed once the recorded amount lands. Never negative. */
export function outstandingBalance(draft: BookingDraft): number {
  const { price } = serviceTotals(draft.services)
  return Math.max(0, price - recordedAmount(draft))
}

/** `Full payment` / `Booking payment (30%)` / `After service payment`. */
export function paymentPlanLabel(draft: BookingDraft): string {
  if (draft.plan === 'booking') return `Booking payment (${draft.percent}%)`
  return draft.plan === 'full' ? 'Full payment' : 'After service payment'
}

/** The stamp the receipt carries: what state the money is in. */
export function paymentStatusLabel(draft: BookingDraft): string {
  if (draft.plan === 'full') return 'Paid in full'
  if (draft.plan === 'booking') return `Booking paid (${draft.percent}%)`
  return 'Pay after service'
}

// ─────────────────────────────────────────────────────────────
//  M-Pesa transaction codes
// ─────────────────────────────────────────────────────────────

const MPESA_CODE = /^[A-Z0-9]{10}$/

/** 10 characters, A–Z and 0–9, upper-cased and stripped of anything else. */
export function normaliseMpesaCode(value: string): string {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 10)
}

/** Null when the code is a valid M-Pesa receipt, else the reason it is not. */
export function validateMpesaCode(value: string): string | null {
  const code = normaliseMpesaCode(value)
  if (code.length === 0) return 'Enter the M-Pesa transaction code from the confirmation message.'
  if (code.length !== 10) return 'An M-Pesa code is exactly 10 characters.'
  if (!MPESA_CODE.test(code)) return 'Use only letters A–Z and digits 0–9.'
  return null
}

// ─────────────────────────────────────────────────────────────
//  Step validation
// ─────────────────────────────────────────────────────────────

/** Why the step is not finished yet, or null when it is. */
export function bookingStepIssue(step: number, draft: BookingDraft): string | null {
  switch (step) {
    case 0:
      if (!draft.type) return 'Choose whether this is a walk-in or an appointment.'
      if (!draft.customer) return 'Select the customer this booking is for.'
      return null
    case 1:
      if (draft.services.length === 0) return 'Choose at least one service.'
      return null
    case 2:
      if (draft.type !== 'appointment') return null
      if (!draft.date) return 'Choose a date.'
      if (!draft.slot) return 'Choose a start time.'
      return null
    case 3:
      if (draft.plan === 'after') return null
      if (draft.plan === 'booking' && !bookingPercentValid(draft.percent)) {
        return `The booking percentage must be between ${BOOKING_PERCENT_MIN} and ${BOOKING_PERCENT_MAX}.`
      }
      if (draft.method === 'mpesa') {
        const codeIssue = validateMpesaCode(draft.transactionCode)
        if (codeIssue) return codeIssue
        if (!draft.payerPhone.trim()) return 'Enter the phone number the payment came from.'
      }
      return null
    default:
      return null
  }
}

/** Whether the step is complete — the Continue button's own condition. */
export function bookingStepComplete(step: number, draft: BookingDraft): boolean {
  return bookingStepIssue(step, draft) === null
}

// ─────────────────────────────────────────────────────────────
//  Dates and slots
// ─────────────────────────────────────────────────────────────

/** Local `yyyy-MM-dd`. Kept here so the flow has one date key format. */
export function dateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/** Today's key, in the browser's timezone — the walk-in's date. */
export function todayKey(now: Date = new Date()): string {
  return dateKey(now)
}

/** The Monday of the week a date falls in. */
export function weekStart(anchor: Date): Date {
  const day = anchor.getDay() // 0 = Sunday
  const offset = (day + 6) % 7 // Monday = 0 … Sunday = 6
  return new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() - offset)
}

/** The seven days of the anchor's week, Monday first. */
export function weekDates(anchor: Date): Date[] {
  const start = weekStart(anchor)
  return Array.from(
    { length: 7 },
    (_, index) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + index),
  )
}

/** A day tile's label set, so the strip and the month grid read the same. */
export function dayParts(date: Date): { weekday: string; day: number; month: string } {
  return {
    weekday: new Intl.DateTimeFormat('en-GB', { weekday: 'short' }).format(date),
    day: date.getDate(),
    month: new Intl.DateTimeFormat('en-GB', { month: 'short' }).format(date),
  }
}

/** `Tue 12 May`, for the review section and the receipt. */
export function longDate(key: string | null): string {
  if (!key) return ''
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date(`${key}T12:00:00`))
}

/** A month's weekday-first grid, padded with nulls before the 1st. */
export function monthGrid(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1)
  const lead = (first.getDay() + 6) % 7
  const days = new Date(year, month + 1, 0).getDate()
  const cells: (Date | null)[] = Array.from({ length: lead }, () => null)
  for (let day = 1; day <= days; day += 1) cells.push(new Date(year, month, day))
  return cells
}

/** A bookable slot grouped for display. */
export type SlotGroup = { label: string; slots: AvailabilitySlot[] }

const DAY_PART_LABELS: Record<string, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
}

/**
 * Group the server's own slots by its own `dayPart`, in the order the parts
 * occur. Nothing is re-derived here: a slot the API put in `afternoon` is shown
 * under Afternoon even if its clock time looks like late morning.
 */
export function groupSlots(slots: readonly AvailabilitySlot[]): SlotGroup[] {
  const order = ['morning', 'afternoon', 'evening']
  const groups = new Map<string, AvailabilitySlot[]>()
  for (const slot of slots) {
    const key = slot.dayPart || 'morning'
    const bucket = groups.get(key)
    if (bucket) bucket.push(slot)
    else groups.set(key, [slot])
  }
  return [...groups.entries()]
    .sort((a, b) => {
      const left = order.indexOf(a[0])
      const right = order.indexOf(b[0])
      return (left === -1 ? order.length : left) - (right === -1 ? order.length : right)
    })
    .map(([key, partSlots]) => ({
      label: DAY_PART_LABELS[key] ?? key,
      slots: [...partSlots].sort((a, b) => a.localTime.localeCompare(b.localTime)),
    }))
}


/**
 * Check a hand-typed start time against the day's real slot grid.
 *
 * The availability endpoint answers per day, not per instant, so a custom time
 * is only ever as good as the grid the server just returned for that day and
 * those services: a time with no slot behind it was never offered, and a time
 * whose slot the server marked unavailable is refused with the server's own
 * status as the reason. The grid is never extended or invented locally.
 */
export function checkCustomTime(
  slots: readonly AvailabilitySlot[],
  time: string,
  durationMinutes: number,
): CustomTimeResult {
  const target = clockToMinutes(time)
  if (target == null) {
    return { time, ok: false, message: 'Enter a start time first.', nearest: [] }
  }

  const nearest = slots
    .filter((slot) => slot.isAvailable && slot.localTime !== time)
    .sort((a, b) => {
      const distanceA = Math.abs((clockToMinutes(a.localTime) ?? 0) - target)
      const distanceB = Math.abs((clockToMinutes(b.localTime) ?? 0) - target)
      return distanceA - distanceB
    })
    .slice(0, 2)
    .map((slot) => slot.localTime)
    .sort()

  const match = slots.find((slot) => slot.localTime === time)
  if (match?.isAvailable) {
    const finish = minutesToClock(target + durationMinutes)
    return { time, ok: true, message: `Available, finishing at ${finish}.`, nearest: [] }
  }

  if (!match) {
    return {
      time,
      ok: false,
      message: `${time} is not one of the times this business takes bookings for.`,
      nearest,
    }
  }

  const reason =
    match.status === 'booked'
      ? 'That time is already booked.'
      : match.status === 'off_duty'
        ? 'Nobody is on duty then.'
        : match.status === 'past'
          ? 'That time has already passed.'
          : 'That time is not available.'

  return { time, ok: false, message: reason, nearest }
}

/** `AP-3F2A9C41` — the reference the console prints for an appointment. */
export function bookingReference(appointmentId: string): string {
  return appointmentReference(appointmentId)
}

/** A stable seed for the receipt's barcode, from what the draft actually holds. */
export function draftSeed(draft: BookingDraft): string {
  return [
    draft.customer?.userId ?? 'draft',
    serviceTotals(draft.services).price,
    draft.date ?? (draft.type === 'walk_in' ? 'walk-in' : ''),
    draft.type ?? '',
  ].join('|')
}
