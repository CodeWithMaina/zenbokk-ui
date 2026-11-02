import { cn } from '../../lib/cn'
import { ServiceCard } from '../ui/service-card'

export type ServicePreviewProps = {
  name: string
  duration: number
  price: number
  image?: string
  /** `active` while creating; the service's real status when editing. */
  status?: string
  className?: string
}

/**
 * Live card preview shown beside the form on wide screens.
 *
 * It renders the same tile the grid uses, so what the owner sees here is exactly
 * what a visitor will see — including how the cover photo is cropped.
 */
export function ServicePreview({
  name,
  duration,
  price,
  image,
  status = 'active',
  className,
}: ServicePreviewProps) {
  return (
    <aside className={cn('min-w-0', className)}>
      <p className="label">Preview</p>
      <ServiceCard
        service={{
          id: 'service-preview',
          name: name.trim() || 'Service name',
          duration: Number.isFinite(duration) ? duration : 0,
          price: Number.isFinite(price) ? price : 0,
          image,
          status: status !== 'active' ? status : undefined,
          statusLabel: status,
        }}
        muted={status !== 'active'}
        className="max-w-[16rem]"
      />
      <p className="mt-[0.5rem] text-caption text-muted">
        The cover photo and pricing update as you type.
      </p>
    </aside>
  )
}
