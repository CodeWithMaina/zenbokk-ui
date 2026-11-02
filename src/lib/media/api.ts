import { apiGet, apiRequest } from '../api/client'

/**
 * Media pipeline client (`MediaController`).
 *
 * Images never travel through JSON: the API hands back a short-lived presigned
 * PUT grant, the browser uploads the bytes straight to object storage, and the
 * server-owned row is then completed and processed into variants. Only the
 * media id is ever stored against a service, which is why a service record can
 * be re-ordered or edited without touching storage.
 */

/** Mirrors `Domain/Entities/Media.cs` → `MediaPurposes`. */
export const MEDIA_PURPOSE = {
  businessLogo: 'business-logo',
  businessCover: 'business-cover',
  businessGallery: 'business-gallery',
  userAvatar: 'user-avatar',
  serviceImage: 'service-image',
  loyaltyProgramImage: 'loyalty-program-image',
  reviewImage: 'review-image',
} as const

export type MediaPurpose = (typeof MEDIA_PURPOSE)[keyof typeof MEDIA_PURPOSE]

/** `Pending | Uploaded | Processing | Ready | Failed | Deleting | Deleted`, lower-cased. */
export type MediaStatus =
  | 'pending'
  | 'uploaded'
  | 'processing'
  | 'ready'
  | 'failed'
  | 'deleting'
  | 'deleted'

export type MediaVariant = {
  url: string
  width: number
  height: number
  format: string
  transform: string
}

export type MediaRecord = {
  id: string
  purpose: string
  status: MediaStatus | string
  visibility: string
  declaredMimeType: string | null
  detectedMimeType: string | null
  width: number | null
  height: number | null
  sizeBytes: number | null
  variants: MediaVariant[]
  createdAt: string
  updatedAt: string
}

export type MediaUploadGrant = {
  mediaId: string
  status: string
  uploadUrl: string
  requiredHeaders: Record<string, string>
  uploadGrantExpiresAt: string
}

export type CreateMediaUploadRequest = {
  purpose: MediaPurpose
  fileName: string
  declaredMimeType?: string | null
  sizeBytes: number
  /** Optional relationship hint; the service image is linked on save, not here. */
  targetType?: string | null
  targetId?: string | null
}

/**
 * A fresh idempotency key.
 *
 * Callers that retry a whole attempt (a re-tap on a failed slot) should reuse the
 * key they already hold: the server then returns the *same* media row plus a new
 * grant instead of minting an orphan. Generating one per request is only correct
 * for one-shot calls.
 */
export function newIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `media-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export const mediaApi = {
  createUpload(payload: CreateMediaUploadRequest, idempotencyKey = newIdempotencyKey()): Promise<MediaUploadGrant> {
    return apiRequest<MediaUploadGrant>('/v1/media/uploads', {
      method: 'POST',
      body: payload,
      headers: { 'Idempotency-Key': idempotencyKey },
    })
  },

  complete(mediaId: string, idempotencyKey = newIdempotencyKey()): Promise<MediaRecord> {
    return apiRequest<MediaRecord>(`/v1/media/${mediaId}/complete`, {
      method: 'POST',
      body: {},
      headers: { 'Idempotency-Key': idempotencyKey },
    })
  },

  /** A fresh grant after an expired one (the client retries the PUT once). */
  regrant(mediaId: string): Promise<MediaUploadGrant> {
    return apiRequest<MediaUploadGrant>(`/v1/media/${mediaId}/upload-grant`, { method: 'POST' })
  },

  get(mediaId: string): Promise<MediaRecord> {
    return apiGet<MediaRecord>(`/v1/media/${mediaId}`)
  },

  remove(mediaId: string): Promise<boolean> {
    return apiRequest<boolean>(`/v1/media/${mediaId}`, { method: 'DELETE' })
  },

  // ── Relationship assignment ───────────────────────────────────
  // Uploading produces a ready media row; these calls link it to the user or
  // business record. Passing no id clears the field. Only *ready* media can be
  // assigned (the server enforces it), which is why the uploader waits for the
  // processing phase before assigning.

  /** Set the caller's profile photo. */
  assignAvatar(mediaId: string): Promise<MediaRecord> {
    return apiRequest<MediaRecord>('/v1/media/user/avatar', {
      method: 'PUT',
      body: { mediaId },
    })
  },

  clearAvatar(): Promise<MediaAssignmentCleared> {
    return apiRequest<MediaAssignmentCleared>('/v1/media/user/avatar', { method: 'DELETE' })
  },

  /** Set the business logo (owner only). */
  assignLogo(mediaId: string): Promise<MediaRecord> {
    return apiRequest<MediaRecord>('/v1/media/business/logo', {
      method: 'PUT',
      body: { mediaId },
    })
  },

  clearLogo(): Promise<MediaAssignmentCleared> {
    return apiRequest<MediaAssignmentCleared>('/v1/media/business/logo', { method: 'DELETE' })
  },

  /** Set the business cover image (owner only). */
  assignCover(mediaId: string): Promise<MediaRecord> {
    return apiRequest<MediaRecord>('/v1/media/business/cover', {
      method: 'PUT',
      body: { mediaId },
    })
  },

  clearCover(): Promise<MediaAssignmentCleared> {
    return apiRequest<MediaAssignmentCleared>('/v1/media/business/cover', { method: 'DELETE' })
  },
}

/**
 * Response when a relationship field is cleared: the server returns the purpose
 * and a `Cleared` status rather than a full media record.
 */
export type MediaAssignmentCleared = {
  purpose: string
  status: string
}

// ─────────────────────────────────────────────────────────────
//  Variant selection
//  The pipeline emits each width as WebP *and* JPEG, so a caller
//  must choose deliberately rather than by array order.
// ─────────────────────────────────────────────────────────────

/** Structural shape shared by `MediaVariant`, `ImageVariant` and review variants. */
export type VariantLike = {
  url: string
  width: number
  height: number
  format: string
}

/** Lower is better: WebP first, then the JPEG fallback, then anything else. */
const FORMAT_RANK: Record<string, number> = { webp: 0, jpeg: 1, png: 2 }

function formatRank(format: string): number {
  return FORMAT_RANK[format.toLowerCase().replace('jpg', 'jpeg')] ?? 9
}

export type PickVariantOptions = {
  /** Never return a variant wider than this (avoids shipping 1280px into a 320px slot). */
  maxWidth?: number
  /** Restrict to one format. Omit to let WebP win ties. */
  format?: string
}

/**
 * The best variant for a box: the largest width that fits `maxWidth`, preferring
 * WebP when two formats share that width.
 */
export function pickVariant<T extends VariantLike>(
  variants: readonly T[],
  options: PickVariantOptions = {},
): T | null {
  const wanted = options.format?.toLowerCase().replace('jpg', 'jpeg')
  const candidates = variants.filter((variant) => {
    if (wanted && variant.format.toLowerCase().replace('jpg', 'jpeg') !== wanted) return false
    if (options.maxWidth !== undefined && variant.width > options.maxWidth) return false
    return true
  })
  if (candidates.length === 0) return null

  return [...candidates].sort((left, right) => {
    if (right.width !== left.width) return right.width - left.width
    return formatRank(left.format) - formatRank(right.format)
  })[0]
}

/** The largest ready variant — what a hero or a card cover renders. */
export function largestVariant<T extends VariantLike>(
  media: Pick<MediaRecord, 'variants'> & { variants: T[] },
): T | null {
  return pickVariant(media.variants)
}

/** A `srcset` string for one format, e.g. `url 320w, url 640w`. */
export function variantSrcSet(variants: readonly VariantLike[], format?: string): string | undefined {
  const wanted = format?.toLowerCase().replace('jpg', 'jpeg')
  const entries = variants
    .filter((variant) => !wanted || variant.format.toLowerCase().replace('jpg', 'jpeg') === wanted)
    .sort((left, right) => left.width - right.width)
  if (entries.length === 0) return undefined
  return entries.map((variant) => `${variant.url} ${variant.width}w`).join(', ')
}

export type ImageSources = {
  /** `srcset` for `<source type="image/webp">`, when WebP variants exist. */
  webpSrcSet?: string
  /** `srcset` for the `<img>` fallback. */
  jpegSrcSet?: string
  /** The single `src` fallback: the widest raster variant. */
  src?: string
  width?: number
  height?: number
}

/**
 * Everything a `<picture>` needs, derived once so every surface renders media the
 * same way: WebP where supported, JPEG otherwise, at the right width per viewport.
 */
export function imageSources(
  variants: readonly VariantLike[] | null | undefined,
  options: PickVariantOptions = {},
): ImageSources {
  const all = (variants ?? []).filter((variant) => Boolean(variant.url))
  if (all.length === 0) return {}

  const webpSrcSet = variantSrcSet(all, 'webp')
  const jpegSrcSet = variantSrcSet(all, 'jpeg')
  const fallback = pickVariant(all, { ...options, format: jpegSrcSet ? 'jpeg' : undefined })

  return {
    webpSrcSet,
    jpegSrcSet,
    src: fallback?.url,
    width: fallback?.width,
    height: fallback?.height,
  }
}
