import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, X } from 'lucide-react'
import type { PublicGalleryImage } from '../../lib/api/types'
import { useStorefront } from '../../lib/storefront'
import { sectionContent } from '../../lib/storefront/sections'
import { useStorefrontGallery } from '../../lib/storefront/use-storefront-public'
import { ResponsiveImage, ResponsiveImageFrame } from '../ui/responsive-image'
import { StorefrontPage, StorefrontPageUnavailable } from './StorefrontPage'
import { StorefrontEmptyState, StorefrontErrorState, StorefrontSkeletonGrid } from './StorefrontStates'

/**
 * The business's published photo gallery.
 *
 * Every image arrives already resolved by the server (ordered, with ready
 * variants), so this component never builds a URL and never fetches per image.
 * An image still processing has no variants and is skipped rather than rendered
 * as a broken tile.
 *
 * The gallery is gated on the business's own entitlement: a business that does
 * not publish a gallery is not offered a dead link.
 */
export function StorefrontGallery() {
  const { businessId, landingPage, can } = useStorefront()
  const { title, description } = sectionContent(landingPage, 'gallery')
  const gallery = useStorefrontGallery(businessId, can('gallery'))
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const images = (gallery.data?.images ?? []).filter((image) => image.variants.length > 0)

  if (!can('gallery')) {
    return (
      <StorefrontPageUnavailable
        title="This business doesn’t publish a gallery"
        description="There are no photos to browse here. Call the studio and they’ll show you their work directly."
      />
    )
  }

  return (
    <StorefrontPage
      eyebrow="Our work"
      title={title || 'Gallery'}
      description={description ?? 'A look at what happens here, photographed by the team.'}
    >
      {gallery.isPending ? (
        <StorefrontSkeletonGrid variant="services" count={6} />
      ) : gallery.isError ? (
        <StorefrontErrorState
          title="The gallery didn’t load"
          description="Refresh the page to try again."
          onRetry={() => void gallery.refetch()}
        />
      ) : images.length === 0 ? (
        <StorefrontEmptyState
          title="No photos yet"
          description="This business hasn’t published any gallery photos yet."
        />
      ) : (
        <ul className="grid grid-cols-2 gap-[0.6rem] sm:grid-cols-3 lg:gap-[0.8rem]">
          {images.map((image, index) => (
            <li key={image.mediaId}>
              <button
                type="button"
                className="group block w-full cursor-zoom-in rounded-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                onClick={() => setOpenIndex(index)}
                aria-label={
                  // The caption is part of what the image is, so a screen
                  // reader hears it with the tile.
                  image.caption
                    ? `Open image ${index + 1} of ${images.length}: ${image.caption}`
                    : `Open image ${index + 1} of ${images.length}`
                }
              >
                <ResponsiveImageFrame
                  aspect="1/1"
                  variants={image.variants}
                  alt=""
                  sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 48vw"
                  maxWidth={640}
                  frameClassName="rounded-card transition-transform duration-300 group-hover:scale-[1.02]"
                />
              </button>
            </li>
          ))}
        </ul>
      )}

      {openIndex !== null && images[openIndex] ? (
        <GalleryLightbox
          images={images}
          index={openIndex}
          onIndexChange={setOpenIndex}
          onClose={() => setOpenIndex(null)}
        />
      ) : null}
    </StorefrontPage>
  )
}

/**
 * A focused image viewer.
 *
 * Keyboard-complete: Escape closes, the arrow keys move between images, and
 * focus moves to the close button on open and returns to whatever opened it on
 * close. The page behind is inert (`aria-hidden` is not used because the dialog
 * is rendered as a sibling overlay, and background scroll is locked instead).
 */
function GalleryLightbox({
  images,
  index,
  onIndexChange,
  onClose,
}: {
  images: PublicGalleryImage[]
  index: number
  onIndexChange: (index: number) => void
  onClose: () => void
}) {
  const titleId = useId()
  const closeRef = useRef<HTMLButtonElement>(null)
  const restoreRef = useRef<HTMLElement | null>(null)

  const goPrevious = useCallback(() => {
    onIndexChange((index - 1 + images.length) % images.length)
  }, [index, images.length, onIndexChange])

  const goNext = useCallback(() => {
    onIndexChange((index + 1) % images.length)
  }, [index, images.length, onIndexChange])

  useEffect(() => {
    restoreRef.current = document.activeElement as HTMLElement | null
    closeRef.current?.focus()

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault()
        goPrevious()
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        goNext()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      restoreRef.current?.focus?.()
    }
  }, [goNext, goPrevious, onClose])

  const current = images[index]

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-[color-mix(in_srgb,var(--bg)_92%,transparent)] p-[1rem] backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={onClose}
    >
      <p id={titleId} className="sr-only">
        Gallery image {index + 1} of {images.length}
      </p>

      <div
        className="relative w-full max-w-[60rem]"
        onClick={(event) => event.stopPropagation()}
      >
        <ResponsiveImage
          variants={current.variants}
          alt={current.caption ?? ''}
          sizes="(min-width: 1024px) 60rem, 96vw"
          loading="eager"
          className="mx-auto max-h-[80svh] w-auto rounded-card object-contain"
        />

        {current.caption ? (
          <p className="mt-[0.6rem] text-center text-meta text-muted">{current.caption}</p>
        ) : null}

        <button
          ref={closeRef}
          type="button"
          className="btn btn-ghost absolute top-[0.6rem] right-[0.6rem] no-underline"
          onClick={onClose}
          aria-label="Close gallery viewer"
        >
          <X className="size-4" aria-hidden="true" />
        </button>

        {images.length > 1 ? (
          <>
            <button
              type="button"
              className="btn btn-ghost absolute top-1/2 left-[0.4rem] -translate-y-1/2 no-underline"
              onClick={goPrevious}
              aria-label="Previous image"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              className="btn btn-ghost absolute top-1/2 right-[0.4rem] -translate-y-1/2 no-underline"
              onClick={goNext}
              aria-label="Next image"
            >
              <ArrowRight className="size-4" aria-hidden="true" />
            </button>
          </>
        ) : null}
      </div>
    </div>
  )
}
