import type { ReactNode } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { cn } from '../../lib/cn'

export type SupportChannel = {
  id: string
  title: ReactNode
  description?: ReactNode
  icon?: ReactNode
  /** Renders the row as a link and shows an external-link arrow. */
  href?: string
  onClick?: () => void
  action?: ReactNode
}

export type SupportCardProps = {
  title?: ReactNode
  description?: ReactNode
  channels: readonly SupportChannel[]
  className?: string
}

/** Help card with tap targets for chat, email and phone support. */
export function SupportCard({
  title = 'Need a hand?',
  description = 'We usually reply within a few minutes during business hours.',
  channels,
  className,
}: SupportCardProps) {
  return (
    <section className={cn('card p-[1rem]', className)}>
      <h2 className="text-heading font-bold tracking-snug">{title}</h2>
      {description ? (
        <p className="mt-[0.2rem] text-meta text-muted">{description}</p>
      ) : null}

      <ul className="mt-[0.8rem] flex flex-col gap-[0.45rem]">
        {channels.map((channel) => {
          const body = (
            <>
              {channel.icon ? (
                <span
                  className="grid size-[2.1rem] shrink-0 place-items-center rounded-md bg-sunken text-muted"
                  aria-hidden="true"
                >
                  {channel.icon}
                </span>
              ) : null}

              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">
                  {channel.title}
                </span>
                {channel.description ? (
                  <span className="mt-[0.05rem] block text-caption text-muted">
                    {channel.description}
                  </span>
                ) : null}
              </span>

              {channel.action ?? (
                <ArrowUpRight
                  className="size-[1rem] shrink-0 text-muted"
                  aria-hidden="true"
                />
              )}
            </>
          )

          const rowClass =
            'flex min-h-[3.2rem] items-center gap-[0.7rem] rounded-md border border-line bg-surface px-[0.7rem] py-[0.55rem] transition-colors focus-visible:shadow-ring focus-visible:outline-none'

          return (
            <li key={channel.id}>
              {channel.href ? (
                <a
                  href={channel.href}
                  className={cn(rowClass, 'hover:bg-hover')}
                  {...(channel.href.startsWith('http')
                    ? { target: '_blank', rel: 'noreferrer' }
                    : {})}
                >
                  {body}
                </a>
              ) : channel.onClick ? (
                <button
                  type="button"
                  onClick={channel.onClick}
                  className={cn(rowClass, 'w-full text-left hover:bg-hover')}
                >
                  {body}
                </button>
              ) : (
                <div className={rowClass}>{body}</div>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
