import type { ReactNode } from 'react'
import { Scissors } from 'lucide-react'
import { formatDuration, money } from '../../lib/format'
import { cn } from '../../lib/cn'
import { StatusPill } from './badge'

export type ServiceSummary = {
  id: string
  name: string
  duration: number
  price: number
  image?: string
  /** A status understood by `[data-status]`; omit to hide the pill. */
  status?: string
  statusLabel?: ReactNode
  currency?: string
  /** Storefront visibility. Missing values are treated as visible. */
  visible?: boolean
}

export type ServiceCardProps = {
  service: ServiceSummary
  /** Makes the whole photo a single accessible button. */
  onOpen?: (service: ServiceSummary) => void
  /** Dims paused or archived services, as in the gallery. */
  muted?: boolean
  className?: string
}

/** Portrait service tile from the services gallery. */
export function ServiceCard({
  service,
  onOpen,
  muted = false,
  className,
}: ServiceCardProps) {
  return (
    <article
      className={cn(
        'group relative aspect-[4/5] overflow-hidden rounded-card border border-line bg-sunken',
        muted && 'opacity-60 grayscale',
        className,
      )}
    >
      {service.image ? (
        <img
          src={service.image}
          alt=""
          className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
      ) : (
        <div
          aria-hidden="true"
          className="absolute inset-0 grid place-items-center bg-[linear-gradient(145deg,var(--surface-sunken),var(--hover))] text-muted"
        >
          <Scissors className="size-10" strokeWidth={1.4} />
        </div>
      )}

      <div
        aria-hidden="true"
        className="absolute inset-0 bg-linear-to-t from-black/75 via-black/15 to-transparent"
      />

      {service.status ? (
        <div className="absolute top-[0.6rem] left-[0.6rem] z-10">
          <StatusPill status={service.status}>
            {service.statusLabel ?? service.status}
          </StatusPill>
        </div>
      ) : null}

      <div className="pointer-events-none absolute inset-x-[0.5rem] bottom-[0.5rem] z-10 rounded-lg border border-line/70 bg-surface/85 px-[0.8rem] py-[0.6rem] text-fg shadow-card backdrop-blur-md md:inset-x-[0.65rem] md:bottom-[0.65rem] md:px-[0.95rem] md:py-[0.75rem]">
        <p className="line-clamp-2 text-label leading-[1.2] font-bold tracking-snug">
          {service.name}
        </p>
        <p className="mt-[0.45rem] flex items-center justify-between gap-[0.5rem] border-t border-line pt-[0.45rem] text-meta text-muted">
          <span>{formatDuration(service.duration)}</span>
          <span className="font-bold text-fg tabular">
            {money(service.price, service.currency)}
          </span>
        </p>
      </div>

      {onOpen ? (
        <button
          type="button"
          onClick={() => onOpen(service)}
          aria-label={`Open ${service.name}`}
          className="absolute inset-0 z-20 rounded-card focus-visible:shadow-ring focus-visible:outline-none"
        />
      ) : null}
    </article>
  )
}
