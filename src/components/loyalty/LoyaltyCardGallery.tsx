import { CreditCard, RefreshCw } from 'lucide-react'
import { cn } from '../../lib/cn'
import { errorMessage } from '../../lib/api/client'
import type { AvailableCardDesign } from '../../lib/loyalty/types'
import { Alert } from '../ui/alert'
import { Button } from '../ui/button'
import { Skeleton } from '../ui/skeleton'
import { LoyaltyCardRenderer } from './LoyaltyCardRenderer'

export type LoyaltyCardGalleryProps = {
  designs: readonly AvailableCardDesign[]
  /** The currently selected design id, or null for the platform default. */
  selectedId: string | null
  onSelect: (design: AvailableCardDesign) => void
  /** Radio-group name, so two galleries on one screen do not collide. */
  name: string
  loading?: boolean
  error?: unknown
  onRetry?: () => void
  label?: string
  className?: string
}

const GROUP_CLASS =
  'grid grid-cols-[repeat(auto-fill,minmax(9.75rem,1fr))] gap-[0.5rem] ' +
  'max-[600px]:flex max-[600px]:overflow-x-auto max-[600px]:snap-x max-[600px]:snap-mandatory max-[600px]:gap-[0.5rem] max-[600px]:pb-[0.4rem]'

/**
 * The card-design picker.
 *
 * Every option is a real design fetched from the API, previewed with the exact
 * HTML the server renders for a customer — so the selector can never show a
 * design a business cannot actually use. The platform default is grouped
 * separately from the business's own designs, matching the design reference.
 */
export function LoyaltyCardGallery({
  designs,
  selectedId,
  onSelect,
  name,
  loading = false,
  error,
  onRetry,
  label = 'Card design',
  className,
}: LoyaltyCardGalleryProps) {
  if (loading) {
    return (
      <div className={cn('min-w-0', className)} aria-busy="true" aria-label="Loading card designs">
        <p className="mb-[0.55rem] text-[0.82rem] font-semibold">{label}</p>
        <div className={GROUP_CLASS}>
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-[7.6rem] rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={cn('min-w-0', className)}>
        <p className="mb-[0.55rem] text-[0.82rem] font-semibold">{label}</p>
        <Alert tone="danger" title="Card designs could not be loaded">
          <p>{errorMessage(error)}</p>
          {onRetry ? (
            <Button size="sm" className="mt-[0.6rem]" onClick={onRetry}>
              <RefreshCw className="size-3.5" aria-hidden="true" />
              Try again
            </Button>
          ) : null}
        </Alert>
      </div>
    )
  }

  if (designs.length === 0) {
    return (
      <div className={cn('min-w-0', className)}>
        <p className="mb-[0.55rem] text-[0.82rem] font-semibold">{label}</p>
        <div className="rounded-lg border border-dashed border-line px-4 py-6 text-center">
          <CreditCard className="mx-auto size-5 text-muted" aria-hidden="true" />
          <p className="mt-[0.4rem] text-meta font-semibold">No card designs available</p>
          <p className="mt-[0.1rem] text-caption text-muted">
            The platform default card will be used.
          </p>
        </div>
      </div>
    )
  }

  const defaults = designs.filter((design) => design.isDefault)
  const custom = designs.filter((design) => !design.isDefault)

  const group = (title: string, items: readonly AvailableCardDesign[]) => {
    if (items.length === 0) return null
    return (
      <>
        <p className="mt-[0.4rem] mb-[0.55rem] text-[0.82rem] font-semibold">{title}</p>
        <div className={GROUP_CLASS}>
          {items.map((design) => (
            <label
              key={design.id}
              className="group relative block cursor-pointer max-[600px]:w-[9.75rem] max-[600px]:shrink-0 max-[600px]:snap-start"
            >
              <input
                type="radio"
                name={name}
                value={design.id}
                checked={selectedId === design.id}
                onChange={() => onSelect(design)}
                className="peer sr-only"
              />
              <div className="rounded-lg border border-line bg-surface p-[0.7rem] transition-colors group-hover:bg-hover peer-checked:border-accent peer-checked:bg-selected peer-focus-visible:shadow-ring">
                <div className="mx-auto h-[76px] w-[127px] overflow-hidden rounded-xs">
                  <LoyaltyCardRenderer
                    html={design.previewHtml}
                    designName={design.name}
                    designWidth={380}
                  />
                </div>
                <span className="mt-[0.5rem] block truncate text-label font-semibold">
                  {design.name}
                </span>
                {design.isDefault ? (
                  <span className="text-caption text-muted">Default</span>
                ) : null}
              </div>
            </label>
          ))}
        </div>
      </>
    )
  }

  return (
    <div className={cn('min-w-0', className)}>
      {group('Default', defaults)}
      {group('Your designs', custom)}
    </div>
  )
}
