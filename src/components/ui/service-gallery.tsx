import { useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, ImageIcon } from 'lucide-react'
import { clamp } from '../../lib/format'
import { cn } from '../../lib/cn'
import { EmptyState } from './empty-state'

export type GalleryImage = {
  src: string
  alt?: string
}

export type ServiceGalleryProps = {
  images: readonly GalleryImage[]
  /** Accessible name for the carousel. */
  label?: string
  aspect?: 'portrait' | 'square' | 'wide'
  /** Thumbnail strip is desktop-only. */
  showThumbs?: boolean
  className?: string
}

const aspectClass = {
  portrait: 'aspect-[4/5]',
  square: 'aspect-square',
  wide: 'aspect-[16/10]',
} as const

/** Swipeable photo gallery: scroll-snap track, arrows, dots and thumbnails. */
export function ServiceGallery({
  images,
  label = 'Service photos',
  aspect = 'portrait',
  showThumbs = true,
  className,
}: ServiceGalleryProps) {
  const [index, setIndex] = useState(0)
  const trackRef = useRef<HTMLDivElement>(null)
  const count = images.length
  const current = count === 0 ? 0 : clamp(index, 0, count - 1)

  if (count === 0) {
    return (
      <EmptyState
        icon={<ImageIcon className="size-5" />}
        title="No photos yet"
        description="Add photos so clients can see the service."
        className={cn('rounded-card border border-dashed border-line', className)}
      />
    )
  }

  const goTo = (next: number) => {
    const safe = clamp(next, 0, count - 1)
    setIndex(safe)
    const track = trackRef.current
    const reduced = window.matchMedia?.(
      '(prefers-reduced-motion: reduce)',
    ).matches
    track?.scrollTo({
      left: safe * track.clientWidth,
      behavior: reduced ? 'auto' : 'smooth',
    })
  }

  return (
    <div className={cn('min-w-0', className)}>
      <div
        className={cn(
          'group relative overflow-hidden bg-sunken max-md:-mx-4 md:rounded-card md:border md:border-line',
          aspectClass[aspect],
        )}
        role="region"
        aria-roledescription="carousel"
        aria-label={label}
      >
        <div
          ref={trackRef}
          className="absolute inset-0 flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          tabIndex={0}
          onScroll={(event) => {
            const track = event.currentTarget
            if (track.clientWidth === 0) return
            const next = Math.round(track.scrollLeft / track.clientWidth)
            setIndex(clamp(next, 0, count - 1))
          }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowLeft') {
              event.preventDefault()
              goTo(current - 1)
            } else if (event.key === 'ArrowRight') {
              event.preventDefault()
              goTo(current + 1)
            }
          }}
          aria-label={`${label}, ${current + 1} of ${count}`}
        >
          {images.map((image, imageIndex) => (
            <img
              key={`${image.src}-${imageIndex}`}
              src={image.src}
              alt={image.alt ?? ''}
              loading={imageIndex === 0 ? 'eager' : 'lazy'}
              draggable={false}
              className="block h-full w-full shrink-0 snap-start object-cover"
            />
          ))}
        </div>

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-[1rem] top-[0.9rem] flex gap-[0.25rem]"
        >
          {images.map((_, imageIndex) => (
            <i
              key={imageIndex}
              className={cn(
                'h-[2px] flex-1 bg-white/50 transition-colors',
                imageIndex === current && 'bg-white',
              )}
            />
          ))}
        </div>

        {current > 0 ? (
          <button
            type="button"
            aria-label="Previous photo"
            onClick={() => goTo(current - 1)}
            className="absolute top-1/2 left-[0.7rem] hidden size-[2.8rem] -translate-y-1/2 place-items-center rounded-ico border border-line bg-surface/90 text-fg opacity-0 shadow-card backdrop-blur transition-opacity group-hover:opacity-100 hover:opacity-100 focus-visible:opacity-100 focus-visible:shadow-ring focus-visible:outline-none [@media(hover:hover)]:grid"
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
          </button>
        ) : null}

        {current < count - 1 ? (
          <button
            type="button"
            aria-label="Next photo"
            onClick={() => goTo(current + 1)}
            className="absolute top-1/2 right-[0.7rem] hidden size-[2.8rem] -translate-y-1/2 place-items-center rounded-ico border border-line bg-surface/90 text-fg opacity-0 shadow-card backdrop-blur transition-opacity group-hover:opacity-100 hover:opacity-100 focus-visible:opacity-100 focus-visible:shadow-ring focus-visible:outline-none [@media(hover:hover)]:grid"
          >
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      {showThumbs && count > 1 ? (
        <div className="mt-[0.5rem] hidden grid-cols-3 gap-[0.5rem] md:grid">
          {images.map((image, imageIndex) => (
            <button
              key={`${image.src}-thumb-${imageIndex}`}
              type="button"
              onClick={() => goTo(imageIndex)}
              aria-label={`View photo ${imageIndex + 1}`}
              aria-current={imageIndex === current}
              className={cn(
                'aspect-square overflow-hidden rounded-md border border-line bg-sunken transition-opacity focus-visible:shadow-ring focus-visible:outline-none',
                imageIndex === current
                  ? 'opacity-100'
                  : 'opacity-55 hover:opacity-100',
              )}
            >
              <img
                src={image.src}
                alt=""
                loading="lazy"
                className="size-full object-cover"
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
