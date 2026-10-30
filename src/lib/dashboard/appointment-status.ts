import type { Tone } from '../../components/ui/badge'

/**
 * The API stores appointment statuses as lowercase snake_case strings
 * (`no_show`). A new booking starts life as `booked`; Business/Staff then move
 * it through the server's transition table:
 *
 *   booked    → confirmed | cancelled
 *   confirmed → completed | no_show
 *
 * Both the filter list and the badges derive from this one place so the UI can
 * never offer a transition the API will reject.
 */
export const APPOINTMENT_STATUSES = [
  'booked',
  'confirmed',
  'completed',
  'cancelled',
  'no_show',
] as const

export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number]

const labels: Record<string, string> = {
  booked: 'Booked',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No-show',
}

const tones: Record<string, Tone> = {
  booked: 'warning',
  confirmed: 'info',
  completed: 'success',
  cancelled: 'neutral',
  no_show: 'danger',
}

export function appointmentStatusLabel(status: string): string {
  return labels[status] ?? status
}

export function appointmentStatusTone(status: string): Tone {
  return tones[status] ?? 'neutral'
}

/** Terminal statuses can't transition any further. */
export function isAppointmentFinal(status: string): boolean {
  return status === 'completed' || status === 'cancelled' || status === 'no_show'
}

/** Statuses an owner can still act on. Mirrors `GetAllowedFromStatus` server-side. */
export function appointmentActions(status: string): Array<'confirm' | 'complete' | 'no_show' | 'cancel'> {
  if (status === 'booked') return ['confirm', 'cancel']
  if (status === 'confirmed') return ['complete', 'no_show']
  return []
}

/**
 * Cancellation is only legal from `booked` server-side; a confirmed visit must
 * go through the business. Customers see the same rule in their account page.
 */
export function isAppointmentCancellable(status: string): boolean {
  return status === 'booked'
}
