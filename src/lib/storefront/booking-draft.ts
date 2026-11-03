const PREFIX = 'punched.booking-draft.'

export type BookingDraft = {
  serviceIds: string[]
  staffId: string | null
  /** ISO start time of the chosen slot. */
  startsAt: string | null
  notes: string
  /** Step the customer reached, so sign-in returns them to the right screen. */
  step: 'services' | 'staff' | 'time' | 'details' | 'payment'
}

export const emptyDraft: BookingDraft = {
  serviceIds: [],
  staffId: null,
  startsAt: null,
  notes: '',
  step: 'services',
}

export const BOOKING_STEPS = ['services', 'staff', 'time', 'details', 'payment'] as const

function isBookingStep(value: unknown): value is BookingDraft['step'] {
  return typeof value === 'string' && (BOOKING_STEPS as readonly string[]).includes(value)
}

/**
 * Map a stored step onto a current one.
 *
 * `review` was the name of the final step before it became a real payment step.
 * A draft saved by an older build resumes at the payment step rather than
 * dropping the visitor back at the start with their choices still in place.
 */
function normaliseStep(value: unknown): BookingDraft['step'] {
  if (value === 'review') return 'payment'
  return isBookingStep(value) ? value : 'services'
}

function optionalString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

function key(businessId: string) {
  return `${PREFIX}${businessId}`
}

/**
 * The wizard is usable while signed out, so the in-flight choice lives in
 * `sessionStorage`: it survives the sign-in round trip (and a reload) but never
 * leaks into another tab or outlives the visit.
 */
export function readBookingDraft(businessId: string): BookingDraft {
  if (typeof window === 'undefined') return emptyDraft
  try {
    const raw = window.sessionStorage.getItem(key(businessId))
    if (!raw) return emptyDraft
    const parsed = JSON.parse(raw) as Partial<BookingDraft>
    return {
      serviceIds: Array.isArray(parsed.serviceIds)
        ? parsed.serviceIds.filter(
            (id): id is string => typeof id === 'string' && id.length > 0,
          )
        : [],
      staffId: optionalString(parsed.staffId),
      startsAt: optionalString(parsed.startsAt),
      notes: typeof parsed.notes === 'string' ? parsed.notes : '',
      step: normaliseStep(parsed.step),
    }
  } catch {
    return emptyDraft
  }
}

export function writeBookingDraft(businessId: string, draft: BookingDraft): void {
  if (typeof window === 'undefined') return
  window.sessionStorage.setItem(key(businessId), JSON.stringify(draft))
}

export function clearBookingDraft(businessId: string): void {
  if (typeof window === 'undefined') return
  window.sessionStorage.removeItem(key(businessId))
}
