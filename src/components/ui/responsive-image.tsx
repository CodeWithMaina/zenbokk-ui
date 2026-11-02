import { cn } from '../../lib/cn'
import { imageSources } from '../../lib/media'
import type { VariantLike } from '../../lib/media'

export type ResponsiveImageProps = {
  /**
   * Processed variants from the API (`ServiceImage.variants`,
   * `MediaRecord.variants`, …). When empty, `src` is rendered alone.
   */
  variants?: readonly VariantLike[] | null
  /** A ready single URL, used when no variants are known (or as the last resort). */
  src?: string | null
  alt?: string
  /** Lets the browser pick a width for the slot, e.g. `(min-width: 1024px) 33vw, 100vw`. */
  sizes?: string
  /** Never ship a variant wider than the slot can display. */
  maxWidth?: number
  loading?: 'lazy' | 'eager'
  fetchPriority?: 'high' | 'low' | 'auto'
  /** Intrinsic size, when known — reserves space and prevents layout shift. */
  width?: number
  height?: number
  className?: string
  draggable?: boolean
}

/**
 * One image, delivered at the right size and format.
 *
 * The pipeline produces every image as WebP *and* JPEG at 320/640/1280, but a
 * plain `<img src>` throws that away and downloads the largest file into the
 * smallest slot. This component turns the variants into a `<picture>` with a
 * WebP `srcset` and a JPEG fallback, so the browser fetches one correctly sized
 * file — and it renders nothing when there is no image, so a caller never has to
 * branch.
 *
 * The `<picture>` wrapper is `display: contents`, so it is layout-transparent:
 * the `<img>` keeps its own classes and positioning exactly as before.
 */
export function ResponsiveImage({
  variants,
  src,
  alt = '',
  sizes,
  maxWidth,
  loading = 'lazy',
  fetchPriority,
  width,
  height,
  className,
  draggable = false,
}: ResponsiveImageProps) {
  const sources = imageSources(variants, { maxWidth })
  const resolved = sources.src ?? src ?? undefined
  if (!resolved) return null

  const intrinsicWidth = width ?? sources.width
  const intrinsicHeight = height ?? sources.height

  const image = (
    <img
      src={resolved}
      srcSet={sources.jpegSrcSet ?? undefined}
      sizes={sources.jpegSrcSet ? sizes : undefined}
      alt={alt}
      loading={loading}
      decoding="async"
      fetchPriority={fetchPriority}
      width={intrinsicWidth}
      height={intrinsicHeight}
      draggable={draggable}
      className={className}
    />
  )

  if (!sources.webpSrcSet) return image

  return (
    <picture className="contents">
      <source type="image/webp" srcSet={sources.webpSrcSet} sizes={sizes} />
      {image}
    </picture>
  )
}

export type ResponsiveImageFrameProps = ResponsiveImageProps & {
  /** Classes for the wrapper that owns the aspect ratio. */
  frameClassName?: string
  /** `4/5` etc. — the slot's aspect ratio. */
  aspect?: string
}

/**
 * The framed variant: an aspect-ratio box with the image cover-filled, so a
 * grid of mixed photo shapes stays perfectly regular.
 */
export function ResponsiveImageFrame({
  aspect = '4/5',
  frameClassName,
  className,
  ...image
}: ResponsiveImageFrameProps) {
  return (
    <div
      className={cn('relative overflow-hidden bg-sunken', frameClassName)}
      style={{ aspectRatio: aspect }}
    >
      <ResponsiveImage {...image} className={cn('size-full object-cover', className)} />
    </div>
  )
}
