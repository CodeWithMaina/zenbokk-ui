import type { ReactNode } from 'react'
import { Scissors } from 'lucide-react'
import { cn } from '../../lib/cn'
import type { Service } from '../../lib/services'
import { EmptyState } from '../ui/empty-state'
import { ServiceCard } from './ServiceCard'

export type ServiceGridProps = {
  services: readonly Service[]
  onOpen?: (service: Service) => void
  /** Shown when there are no services to render; the page supplies the copy. */
  empty?: ReactNode
  className?: string
}

/**
 * Responsive service grid.
 *
 * The column behaviour is the design's own: two columns on a phone, an
 * auto-fitting grid from 600px, and wider tiles from 960px — so a card keeps a
 * 4:5 portrait ratio at every size instead of stretching into a letterbox.
 */
export function ServiceGrid({ services, onOpen, empty, className }: ServiceGridProps) {
  if (services.length === 0) {
    return (
      <div className={cn('card', className)}>
        {empty ?? (
          <EmptyState
            icon={<Scissors className="size-5" />}
            title="No services yet"
            description="Add a service so clients can see what you offer and book it."
          />
        )}
      </div>
    )
  }

  return (
    <ul
      aria-label="Services"
      className={cn(
        'm-0 grid list-none grid-cols-2 gap-x-[0.7rem] gap-y-[0.9rem] p-0',
        'sm:grid-cols-[repeat(auto-fill,minmax(13.5rem,1fr))] sm:gap-x-[0.9rem] sm:gap-y-[1.1rem]',
        'lg:grid-cols-[repeat(auto-fill,minmax(15rem,1fr))]',
        className,
      )}
    >
      {services.map((service) => (
        <li key={service.id} className="min-w-0">
          <ServiceCard service={service} onOpen={onOpen} />
        </li>
      ))}
    </ul>
  )
}

export type ServiceGridSkeletonProps = {
  count?: number
  className?: string
}

/** Loading placeholder that keeps the grid's exact rhythm while data arrives. */
export function ServiceGridSkeleton({ count = 6, className }: ServiceGridSkeletonProps) {
  return (
    <div
      aria-busy="true"
      aria-label="Loading services"
      className={cn(
        'grid grid-cols-2 gap-x-[0.7rem] gap-y-[0.9rem]',
        'sm:grid-cols-[repeat(auto-fill,minmax(13.5rem,1fr))] sm:gap-x-[0.9rem] sm:gap-y-[1.1rem]',
        'lg:grid-cols-[repeat(auto-fill,minmax(15rem,1fr))]',
        className,
      )}
    >
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="skeleton aspect-[4/5] rounded-card"
        />
      ))}
    </div>
  )
}
