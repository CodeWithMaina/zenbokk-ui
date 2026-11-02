import { ServiceCard as ServiceTile } from '../ui/service-card'
import type { Service } from '../../lib/services'
import { isServiceMuted, serviceCoverUrl, serviceCoverVariants } from '../../lib/services'

export type ServiceCardProps = {
  service: Service
  onOpen?: (service: Service) => void
  className?: string
}

/**
 * One service tile in the grid.
 *
 * This is the adapter between the API's service row and the shared portrait
 * tile: it resolves the cover (the first image), the duration/price pair and the
 * status pill, so the tile itself stays a pure presentational component that the
 * design gallery also renders.
 */
export function ServiceCard({ service, onOpen, className }: ServiceCardProps) {
  return (
    <ServiceTile
      className={className}
      service={{
        id: service.id,
        name: service.name,
        duration: service.durationMinutes,
        price: service.price,
        image: serviceCoverUrl(service),
        imageVariants: serviceCoverVariants(service),
        // Only paused and archived services carry a pill, exactly as in the design.
        status: isServiceMuted(service.status) ? service.status : undefined,
        statusLabel: service.status,
        visible: service.showcase,
      }}
      muted={isServiceMuted(service.status)}
      onOpen={onOpen ? () => onOpen(service) : undefined}
    />
  )
}
