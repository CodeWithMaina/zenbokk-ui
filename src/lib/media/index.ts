/**
 * Media module: the shared image pipeline (grant → upload → complete → variants).
 *
 * Nothing in this folder knows about services, logos or avatars — it exposes the
 * media contract and a progress-aware upload hook, and feature modules pass
 * their own purpose and slots.
 */
export {
  MEDIA_PURPOSE,
  imageSources,
  largestVariant,
  mediaApi,
  newIdempotencyKey,
  pickVariant,
  variantSrcSet,
} from './api'
export type {
  BusinessMediaEntry,
  CreateMediaUploadRequest,
  GalleryCapacity,
  ImageSources,
  MediaPurpose,
  MediaRecord,
  MediaStatus,
  MediaUploadGrant,
  MediaVariant,
  PickVariantOptions,
  UpdateGalleryEntryRequest,
  VariantLike,
} from './api'
export {
  MAX_IMAGE_MB,
  MEDIA_LIMITS,
  formatFileSize,
  resolveUploadFile,
  sniffImageType,
  uploadErrorMessage,
  uploadMedia,
  validateImageFile,
} from './upload'
export type {
  ResolvedUploadFile,
  SupportedImageType,
  UploadMediaOptions,
  UploadPhase,
  UploadResult,
} from './upload'
export { useMediaUpload } from './use-media-upload'
export type { MediaUploadState, MediaUploads } from './use-media-upload'
export { useResolvedImage } from './use-resolved-image'
export type { ResolvedImage } from './use-resolved-image'
