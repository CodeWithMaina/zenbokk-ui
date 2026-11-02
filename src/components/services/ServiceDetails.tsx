import { cn } from '../../lib/cn'
import { serviceAvailabilityHint, serviceDurationLabel, servicePriceLabel } from '../../lib/services'
import type { Service } from '../../lib/services'
import { DescriptionList, DescriptionRow } from '../ui/description-list'
import { ServiceStatusBadge } from './ServiceStatusBadge'

export type ServiceDetailsProps = {
  service: Service
  /** Rendered under the description — the booking/edit actions. */
  actions?: React.ReactNode
  className?: string
}

/**
 * The information column of the service detail page: status, name, the
 * duration/price/storefront card, the description and the action row.
 *
 * Sticky on wide screens (the design keeps the booking actions in view while the
 * gallery is browsed), and the storefront line states the visibility the owner
 * actually set rather than assuming it matches the status.
 */
export function ServiceDetails({ service, actions, className }: ServiceDetailsProps) {
  const hint = serviceAvailabilityHint(service.status)

  return (
    <div className={cn('min-w-0', className)}>
      <ServiceStatusBadge status={service.status} className="mb-[0.6rem]" />

      <h1 className="text-title font-bold tracking-tight">{service.name}</h1>

      <section className="card mt-[1rem] p-[1.1rem]">
        <DescriptionList>
          <DescriptionRow label="Duration" value={serviceDurationLabel(service.durationMinutes)} />
          <DescriptionRow label="Price" value={servicePriceLabel(service.price)} />
          <DescriptionRow label="Storefront" value={service.showcase ? 'Visible' : 'Hidden'} />
        </DescriptionList>
      </section>

      {service.description ? (
        <p className="mt-[1rem] max-w-[46ch] leading-[1.6] text-muted">{service.description}</p>
      ) : null}

      {actions ? <div className="mt-[1.2rem] flex flex-wrap gap-[0.6rem]">{actions}</div> : null}

      {hint ? <p className="mt-[0.8rem] text-meta text-muted">{hint}</p> : null}
    </div>
  )
}
