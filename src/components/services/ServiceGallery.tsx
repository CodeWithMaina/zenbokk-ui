import { ImageIcon } from 'lucide-react'
import { cn } from '../../lib/cn'
import { serviceGalleryImages } from '../../lib/services'
import type { Service } from '../../lib/services'
import { EmptyState } from '../ui/empty-state'
import { ServiceGallery as Gallery } from '../ui/service-gallery'

export type ServiceGalleryProps = {
  service: Pick<Service, 'name' | 'images'>
  className?: string
}

/**
 * The service's photo gallery.
 *
 * One to three images, swiped on touch and stepped with the arrows on a pointer
 * device, with position indicators and desktop thumbnails — the interaction is
 * the shared `ServiceGallery`, so the storefront and the console cannot drift.
 * A service with no photos (a valid state) gets an explanation instead of an
 * empty frame.
 */
export function ServiceGallery({ service, className }: ServiceGalleryProps) {
  const images = serviceGalleryImages(service)

  if (images.length === 0) {
    return (
      <EmptyState
        icon={<ImageIcon className="size-5" />}
        title="No photos yet"
        description={`Add up to three photos so clients can see ${service.name} before booking.`}
        className={cn('rounded-card border border-dashed border-line', className)}
      />
    )
  }

  return (
    <Gallery
      images={images}
      label={`${service.name} photos`}
      aspect="portrait"
      showThumbs
      className={className}
    />
  )
}
