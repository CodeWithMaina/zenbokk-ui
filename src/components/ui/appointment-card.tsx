import type { ReactNode } from 'react'
import { formatDuration, money } from '../../lib/format'
import { cn } from '../../lib/cn'
import { StatusPill } from './badge'
import type { Tone } from './badge'

export type AppointmentLine = {
  name: ReactNode
  duration?: number
  /** Omitted when the price is unknown (e.g. the service was deleted). */
  price?: number
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
  /** Force a semantic tone when the status has no `[data-status]` mapping. */
  statusTone?: Tone
  /** Assigned staff member, shown under the time line. */
  staff?: ReactNode
  services: readonly AppointmentLine[]
  /** Defaults to the sum of the known service prices. */
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
  const priced = appointment.services.filter(
    (line) => typeof line.price === 'number',
  )
  const hasPrice = priced.length > 0
  const total =
    appointment.total ??
    priced.reduce((sum, line) => sum + (line.price ?? 0), 0)

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
          <StatusPill status={appointment.status} tone={appointment.statusTone}>
            {appointment.statusLabel ?? appointment.status}
          </StatusPill>
        </div>

        <p className="mt-[0.1rem] text-meta text-muted">
          {appointment.time}
          {duration > 0 ? ` · ${formatDuration(duration)}` : ''}
        </p>

        {appointment.staff ? (
          <p className="mt-[0.1rem] text-caption text-muted">{appointment.staff}</p>
        ) : null}

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
              {typeof line.price === 'number' ? (
                <span className="shrink-0 font-medium tabular">
                  {money(line.price, appointment.currency)}
                </span>
              ) : null}
            </li>
          ))}
          {hasPrice ? (
            <li className="flex items-center justify-between gap-3 py-[0.6rem] font-semibold">
              <b>Total</b>
              <b className="tabular">{money(total, appointment.currency)}</b>
            </li>
          ) : null}
        </ul>
      </div>
    </article>
  )
}
