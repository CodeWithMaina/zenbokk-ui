import type { ReactNode } from 'react'
import { formatDuration, money } from '../../lib/format'
import { cn } from '../../lib/cn'
import { StatusPill } from './badge'

export type AppointmentLine = {
  name: ReactNode
  duration?: number
  price: number
}

export type AppointmentCardData = {
  id: string
  /** Day number shown in the date block. */
  day: ReactNode
  month: ReactNode
  weekday: ReactNode
  time: ReactNode
  /** A status understood by `[data-status]`. */
  status: string
  statusLabel?: ReactNode
  services: readonly AppointmentLine[]
  /** Defaults to the sum of the service prices. */
  total?: number
  currency?: string
}

export type AppointmentCardProps = {
  appointment: AppointmentCardData
  className?: string
}

/** Appointment history row from the client detail page. */
export function AppointmentCard({
  appointment,
  className,
}: AppointmentCardProps) {
  const duration = appointment.services.reduce(
    (sum, line) => sum + (line.duration ?? 0),
    0,
  )
  const total =
    appointment.total ??
    appointment.services.reduce((sum, line) => sum + line.price, 0)

  return (
    <article className={cn('card flex gap-[0.9rem] p-[0.9rem]', className)}>
      <div className="flex h-fit min-w-[3.2rem] flex-col items-center rounded-md border border-line bg-hover px-[0.5rem] py-[0.45rem] text-center">
        <b className="text-heading leading-[1.1] font-bold tabular">
          {appointment.day}
        </b>
        <span className="text-caption tracking-caps text-muted uppercase">
          {appointment.month}
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-[0.35rem]">
          <p className="font-semibold">{appointment.weekday}</p>
          <StatusPill status={appointment.status}>
            {appointment.statusLabel ?? appointment.status}
          </StatusPill>
        </div>

        <p className="mt-[0.1rem] text-meta text-muted">
          {appointment.time}
          {duration > 0 ? ` · ${formatDuration(duration)}` : ''}
        </p>

        <ul className="mt-[0.7rem] border-t border-line">
          {appointment.services.map((line, index) => (
            <li
              key={index}
              className="flex items-center justify-between gap-3 border-b border-line py-[0.55rem] text-meta last:border-b-0"
            >
              <span className="min-w-0 text-muted">
                {line.name}
                {line.duration !== undefined
                  ? ` · ${formatDuration(line.duration)}`
                  : ''}
              </span>
              <span className="shrink-0 font-medium tabular">
                {money(line.price, appointment.currency)}
              </span>
            </li>
          ))}
          <li className="flex items-center justify-between gap-3 py-[0.6rem] font-semibold">
            <b>Total</b>
            <b className="tabular">{money(total, appointment.currency)}</b>
          </li>
        </ul>
      </div>
    </article>
  )
}
