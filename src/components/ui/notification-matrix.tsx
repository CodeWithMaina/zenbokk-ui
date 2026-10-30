import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '../../lib/cn'
import { Checkbox } from './checkbox'

export type NotificationChannel = {
  id: string
  label: ReactNode
  icon?: LucideIcon
  disabled?: boolean
}

export type NotificationEvent = {
  id: string
  label: ReactNode
  description?: ReactNode
}

export type NotificationMatrixProps = {
  channels: readonly NotificationChannel[]
  events: readonly NotificationEvent[]
  /** `value[eventId][channelId]`; missing entries count as off. */
  value: Readonly<Record<string, Readonly<Record<string, boolean>>>>
  onChange: (eventId: string, channelId: string, enabled: boolean) => void
  /** Accessible table name. */
  label?: string
  className?: string
}

/**
 * Notification preferences grid: events down the side, channels across the
 * top. Scrolls horizontally on narrow screens.
 */
export function NotificationMatrix({
  channels,
  events,
  value,
  onChange,
  label = 'Notification preferences',
  className,
}: NotificationMatrixProps) {
  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="table w-full" aria-label={label}>
        <caption className="sr-only">{label}</caption>
        <thead>
          <tr>
            <th scope="col" className="w-[42%]">
              <span className="text-caption tracking-caps text-muted uppercase">
                Event
              </span>
            </th>
            {channels.map((channel) => {
              const Icon = channel.icon

              return (
                <th key={channel.id} scope="col" className="text-center">
                  <span className="inline-flex flex-col items-center gap-[0.2rem] text-caption font-medium text-muted">
                    {Icon ? (
                      <Icon
                        className="size-[0.95rem]"
                        aria-hidden="true"
                      />
                    ) : null}
                    {channel.label}
                  </span>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <tr key={event.id}>
              <th scope="row" className="font-normal normal-case tracking-normal">
                <span className="block text-meta font-semibold text-fg">
                  {event.label}
                </span>
                {event.description ? (
                  <span className="mt-[0.1rem] hidden text-caption leading-snug text-muted sm:block">
                    {event.description}
                  </span>
                ) : null}
              </th>

              {channels.map((channel) => {
                const checked = value[event.id]?.[channel.id] ?? false

                return (
                  <td key={channel.id} className="text-center">
                    <span className="flex justify-center">
                      <Checkbox
                        checked={checked}
                        disabled={channel.disabled}
                        onCheckedChange={(next) =>
                          onChange(event.id, channel.id, next)
                        }
                        label={`${String(event.label)} via ${String(channel.label)}`}
                      />
                    </span>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
