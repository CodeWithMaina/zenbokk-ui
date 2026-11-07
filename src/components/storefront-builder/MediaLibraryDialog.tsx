import { useState } from 'react'
import { ImageOff, X } from 'lucide-react'
import { Button } from '../ui/button'
import { cn } from '../../lib/cn'
import { useStorefrontGallery } from '../../lib/storefront/use-storefront-public'

/**
 * The Media library dialog.
 *
 * Real media, not mock data: it lists the business's own published gallery
 * through the same anonymous, business-scoped read the public storefront uses,
 * with a search box. Choosing an image hands its media id back to the caller,
 * which attaches it to the storefront (for example the hero background) — no
 * `URL.createObjectURL`, no placeholder tiles.
 */
export function MediaLibraryDialog({
  open,
  businessId,
  enabled,
  onClose,
  onSelect,
}: {
  open: boolean
  businessId: string
  enabled: boolean
  onClose: () => void
  onSelect: (mediaId: string) => void
}) {
  const [query, setQuery] = useState('')
  const gallery = useStorefrontGallery(businessId, enabled && open)

  if (!open) return null

  const needle = query.trim().toLowerCase()
  const images = (gallery.data?.images ?? []).filter((image) => image.variants.length > 0)
  const visible = needle
    ? images.filter((image) => (image.caption ?? '').toLowerCase().includes(needle))
    : images

  return (
    <div
      className="sfb-modal-backdrop"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="sfb-modal" role="dialog" aria-modal="true" aria-label="Media library">
        <header className="sfb-modal-head">
          <div>
            <p className="text-heading font-bold tracking-snug">Media library</p>
            <p className="text-caption text-subtle">Pick an image from your gallery.</p>
          </div>
          <Button variant="ghost" size="icon" aria-label="Close" onClick={onClose}>
            <X className="size-4" aria-hidden="true" />
          </Button>
        </header>

        <div className="p-[0.6rem] pt-0">
          <input
            type="search"
            aria-label="Search media"
            placeholder="Search media…"
            className="w-full rounded-md border border-line bg-bg px-[0.6rem] py-[0.45rem] text-meta"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        <div className="sfb-modal-body p-[0.6rem] pt-0">
          {!enabled ? (
            <p className="text-meta text-muted">The Gallery module is not enabled, so there is no media to pick from.</p>
          ) : gallery.isPending ? (
            <p className="text-meta text-muted">Loading your media…</p>
          ) : visible.length === 0 ? (
            <p className="inline-flex items-center gap-[0.4rem] text-meta text-muted">
              <ImageOff className="size-4" aria-hidden="true" />
              {images.length === 0 ? 'No images in your gallery yet.' : 'No image matches that search.'}
            </p>
          ) : (
            <ul className="grid grid-cols-3 gap-[0.5rem]">
              {visible.map((image) => {
                const url = image.variants[0]?.url
                return (
                  <li key={image.mediaId}>
                    <button
                      type="button"
                      className={cn('sfb-media-tile')}
                      onClick={() => onSelect(image.mediaId)}
                      title={image.caption ?? 'Use this image'}
                    >
                      {url ? <img src={url} alt={image.caption ?? ''} loading="lazy" /> : null}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
