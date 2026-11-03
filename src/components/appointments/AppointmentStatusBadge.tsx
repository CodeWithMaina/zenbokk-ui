import { appointmentStatusLabel, appointmentStatusTone } from '../../lib/appointments'
import { StatusPill } from '../ui/badge'

export type AppointmentStatusBadgeProps = {
  status: string
  className?: string
}

/**
 * The single place an appointment status becomes a pill.
 *
 * The label and tone come from `lib/dashboard/appointment-status.ts`, so the
 * calendar, the table, the cards and the detail header can never disagree about
 * what `booked` is called or how it is coloured. `booked` reads "Pending" —
 * the reference design's word for a booking the business has not confirmed yet.
 */
export function AppointmentStatusBadge({ status, className }: AppointmentStatusBadgeProps) {
  return (
    <StatusPill tone={appointmentStatusTone(status)} className={className}>
      {appointmentStatusLabel(status)}
    </StatusPill>
  )
}
