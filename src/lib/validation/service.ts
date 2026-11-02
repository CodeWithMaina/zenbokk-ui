import { z } from 'zod'

/**
 * Zod schema mirroring the backend's `CreateServiceRequestValidator` /
 * `UpdateServiceRequestValidator` (`Application/Validators/ServiceValidators.cs`).
 *
 * Keeping the two in step means a submission is never sent only to be rejected
 * for something the form could have caught — and the server still validates, so
 * the browser is never the authority.
 */

/** One photo slot, as the uploader reports it. */
export const servicePhotoSchema = z.object({
  key: z.string(),
  mediaId: z.string().optional(),
  /** Delivered URL once the variants are ready. */
  url: z.string().optional(),
  /** Object URL shown while the bytes are in flight. */
  localUrl: z.string().optional(),
  error: z.string().optional(),
})

export type ServicePhotoValue = z.infer<typeof servicePhotoSchema>

export const serviceFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Give the service a name.')
    .max(120, 'Service name must not exceed 120 characters.'),
  description: z
    .string()
    .max(500, 'Description must not exceed 500 characters.')
    .optional()
    .or(z.literal('')),
  durationMinutes: z
    .number({ error: 'Enter a duration.' })
    .int('Duration must be a whole number of minutes.')
    .min(5, 'Duration must be at least 5 minutes.')
    .max(1440, 'Duration must be 1,440 minutes or less.'),
  price: z
    .number({ error: 'Enter a price (0 for free).' })
    .min(0, 'Price must be greater than or equal to 0.')
    .max(9_999_999.99, 'That price is too large.'),
  showcase: z.boolean(),
  photos: z
    .array(servicePhotoSchema)
    .max(3, 'A service can have at most three photos.')
    .default([]),
})

export type ServiceFormValues = z.input<typeof serviceFormSchema>
export type ServiceFormOutput = z.output<typeof serviceFormSchema>

/** The ordered media ids a save sends: uploaded photos only, in slot order. */
export function serviceMediaIds(photos: readonly ServicePhotoValue[]): string[] {
  return photos
    .map((photo) => photo.mediaId)
    .filter((mediaId): mediaId is string => Boolean(mediaId))
    .slice(0, 3)
}

/** True while a slot is still uploading, which blocks saving with a clear reason. */
export function hasPendingPhoto(photos: readonly ServicePhotoValue[]): boolean {
  return photos.some((photo) => !photo.mediaId || Boolean(photo.error))
}
