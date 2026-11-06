import type { Tone } from '../../components/ui/badge'

/**
 * The API stores appointment statuses as lowercase snake_case strings
 * (`no_show`). A new booking starts life as `booked` — or as `pending_payment`
 * when the business collects a booking fee, in which case the slot is held but
 * nothing is confirmed until the payment is verified:
 *
 *   pending_payment → confirmed | cancelled
 *   booked          → confirmed | cancelled
 *   confirmed       → completed | no_show
 *
 * Both the filter list and the badges derive from this one place so the UI can
 * never offer a transition the API will reject.
 */
export const APPOINTMENT_STATUSES = [
  'pending_payment',
  'booked',
  'confirmed',
  'completed',
  'cancelled',
  'no_show',
] as const

export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number]

const labels: Record<string, string> = {
  pending_payment: 'Awaiting payment',
  booked: 'Booked',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No-show',
}

const tones: Record<string, Tone> = {
  pending_payment: 'warning',
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
  // A booking awaiting its fee is confirmed by verifying the payment, not by a bare
  // confirm tap — so the only action offered here is to call it off. Verifying the
  // payment confirms it, and the appointment screen re-reads that from the API.
  if (status === 'pending_payment') return ['cancel']
  if (status === 'booked') return ['confirm', 'cancel']
  if (status === 'confirmed') return ['complete', 'no_show']
  return []
}

/**
 * Cancellation is legal from `booked` and from `pending_payment` server-side; a
 * confirmed visit must go through the business. Customers see the same rule in
 * their account page.
 */
export function isAppointmentCancellable(status: string): boolean {
  return status === 'booked' || status === 'pending_payment'
}

/**
 * True while the appointment's slot is held but the booking is not yet confirmed
 * because money is outstanding. Mirrors `AppointmentReservations.ReservingStatuses`
 * minus `booked`/`confirmed`, which are reserving for other reasons.
 */
export function isAwaitingPayment(status: string): boolean {
  return status === 'pending_payment'
}
