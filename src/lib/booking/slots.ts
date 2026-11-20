import type { AvailabilitySlot } from '../api/types'

/**
 * The time picker's grouping model.
 *
 * The booking day is presented in **one-hour bands** (09:00–10:00, 10:00–11:00, …)
 * because that is how people think about their day. A band is presentation only:
 * the server's grid decides which *starting times* exist, and every starting time
 * it offers has already been checked against the whole requested duration — a
 * three-hour booking is only offered at 09:00 when 09:00–12:00 is free, never
 * because 09:00–10:00 happens to be.
 *
 * Keeping that distinction in one tested module is what stops the UI from
 * re-deriving availability (and getting it wrong) in a component.
 */

/** How an unavailable starting time is described to the customer. */
export type SlotAvailability = 'available' | 'booked' | 'off_duty' | 'past'

export type HourBand = {
  /** `9` for the 09:00–10:00 band. */
  hour: number
  /** `09:00–10:00`, the band's label. */
  label: string
  /** Starting times inside this band, in clock order. */
  slots: AvailabilitySlot[]
  /** True when at least one starting time in the band can take the whole booking. */
  hasAvailable: boolean
}

/** `HH:mm` → minutes from midnight, or null when the value is not a clock time. */
export function clockMinutes(value: string | null | undefined): number | null {
  if (!value) return null
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim())
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null
  if (hours < 0 || hours > 24 || minutes < 0 || minutes > 59) return null
  return hours * 60 + minutes
}

/** Minutes from midnight → `HH:mm`, clamped to a 24-hour day. */
export function minutesClock(minutes: number): string {
  const clamped = Math.max(0, Math.min(24 * 60, Math.round(minutes)))
  const hours = Math.floor(clamped / 60)
  const rest = clamped % 60
  return `${String(hours).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
}

/** The label a customer reads for a band: `09:00–10:00`. */
export function bandLabel(hour: number): string {
  return `${minutesClock(hour * 60)}–${minutesClock((hour + 1) * 60)}`
}

/**
 * The availability of one starting time, from the server's status.
 *
 * `isAvailable` is the authority; `status` is what the label is chosen from. A
 * status the client does not recognise is treated as unavailable rather than
 * offered as bookable.
 */
export function slotAvailability(slot: AvailabilitySlot): SlotAvailability {
  if (slot.isAvailable && slot.status === 'available') return 'available'
  if (slot.status === 'booked') return 'booked'
  if (slot.status === 'past') return 'past'
  return 'off_duty'
}

/** The neutral word shown on an unavailable starting time. */
export function slotAvailabilityLabel(availability: SlotAvailability): string {
  switch (availability) {
    case 'booked':
      return 'Booked'
    case 'past':
      return 'Passed'
    default:
      return 'Unavailable'
  }
}

/**
 * Groups a day starting times into one-hour bands, in clock order.
 *
 * Only bands that actually contain a starting time are returned — a band with no
 * slots at all is time the business is closed, and inventing a row for it would
 * suggest it could be booked. The minute within the hour is preserved, so a
 * 15-minute grid still offers 09:00, 09:15, 09:30 and 09:45 inside the 09:00 band.
 */
export function hourBands(slots: readonly AvailabilitySlot[]): HourBand[] {
  const byHour = new Map<number, AvailabilitySlot[]>()

  for (const slot of slots) {
    const minutes = clockMinutes(slot.localTime)
    if (minutes == null) continue
    const hour = Math.floor(minutes / 60)
    const bucket = byHour.get(hour)
    if (bucket) bucket.push(slot)
    else byHour.set(hour, [slot])
  }

  return [...byHour.entries()]
    .sort(([a], [b]) => a - b)
    .map(([hour, bandSlots]) => {
      const ordered = [...bandSlots].sort(
        (a, b) => (clockMinutes(a.localTime) ?? 0) - (clockMinutes(b.localTime) ?? 0),
      )
      return {
        hour,
        label: bandLabel(hour),
        slots: ordered,
        hasAvailable: ordered.some((slot) => slotAvailability(slot) === "available"),
      }
    })
}

/**
 * The visible extent of the day, as two clock times.
 *
 * Used to state the opening window beside the grid, so "there is nothing at
 * 07:00" reads as "we open at 09:00" rather than as a missing row.
 */
export function dayExtent(slots: readonly AvailabilitySlot[]): { first: string; last: string } | null {
  const minutes = slots
    .map((slot) => clockMinutes(slot.localTime))
    .filter((value): value is number => value != null)
    .sort((a, b) => a - b)

  if (minutes.length === 0) return null
  return { first: minutesClock(minutes[0]), last: minutesClock(minutes[minutes.length - 1]) }
}

/**
 * Why a day offers no starting time, in the customer words.
 *
 * Distinguishes "the whole day is booked" from "nobody works that day" from
 * "the selection does not fit" — three different next actions.
 */
export function emptyDayReason(slots: readonly AvailabilitySlot[], totalMinutes: number): string {
  if (slots.length === 0) return "The studio is closed on this day."

  const availability = slots.map(slotAvailability)
  if (availability.every((value) => value === "past")) return "This day has already passed."
  if (availability.every((value) => value === "booked")) {
    return "Every opening on this day is already booked."
  }
  if (availability.every((value) => value === "off_duty")) {
    return "Nobody is working at these times."
  }

  return totalMinutes > 0
    ? `No uninterrupted ${formatMinutes(totalMinutes)} opening remains on this day.`
    : "No opening remains on this day."
}

/** `180` → `3 hr`, `90` → `1 hr 30 min`, `45` → `45 min`. */
export function formatMinutes(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return "0 min"
  const hours = Math.floor(minutes / 60)
  const rest = Math.round(minutes % 60)
  if (hours === 0) return `${rest} min`
  if (rest === 0) return `${hours} hr`
  return `${hours} hr ${rest} min`
}
