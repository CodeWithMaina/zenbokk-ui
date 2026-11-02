import { ApiError, errorMessage } from '../api/client'
import { mediaApi, newIdempotencyKey } from './api'
import type { MediaPurpose, MediaRecord, MediaUploadGrant } from './api'

/**
 * Client-side half of the media pipeline.
 *
 * The limits mirror the server's `MediaLimitOptions` defaults for the same
 * purpose; they exist to fail fast and explain the problem before a byte is
 * sent. The server re-validates everything — a rejected upload is always the
 * authority, never this file.
 */
export const MEDIA_LIMITS = {
  /** `MediaLimitOptions.SupportedInputMimeTypes`. */
  supportedTypes: ['image/jpeg', 'image/png', 'image/webp'] as const,
  /** `MediaLimitOptions.Purposes['service-image'].MaxBytes`. */
  serviceImageMaxBytes: 8_388_608,
  /** `MediaLimitOptions.Purposes['user-avatar'].MaxBytes`. */
  userAvatarMaxBytes: 5_242_880,
  /** `MediaLimitOptions.Purposes['business-logo'].MaxBytes`. */
  businessLogoMaxBytes: 5_242_880,
  /** `MediaLimitOptions.Purposes['business-cover'].MaxBytes`. */
  businessCoverMaxBytes: 10_485_760,
  /** How many variants the processing pipeline produces (`VariantWidths`). */
  variantWidths: [320, 640, 1280] as const,
} as const

export const MAX_IMAGE_MB = Math.round(MEDIA_LIMITS.serviceImageMaxBytes / (1024 * 1024))

/** `4.2 MB` — for a validation message a person can act on. */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  const megabytes = bytes / (1024 * 1024)
  // `8 MB` reads better than `8.0 MB` for a round limit; keep one decimal otherwise.
  return `${Number.isInteger(megabytes) ? megabytes : megabytes.toFixed(1)} MB`
}

export type SupportedImageType = (typeof MEDIA_LIMITS.supportedTypes)[number]

/**
 * Identifies an image from its magic bytes.
 *
 * The browser's `File.type` is a hint, not a fact: it is empty for some camera
 * and OS-generated files and wrong for a mislabelled one. The server detects the
 * real type and rejects any mismatch with the declared type, so reading the
 * header here removes a whole class of otherwise-inexplicable upload failures.
 */
export function sniffImageType(bytes: Uint8Array): SupportedImageType | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg'
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) {
    return 'image/png'
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    return 'image/webp'
  }
  return null
}

/**
 * Validates a chosen file against the same rules the server enforces.
 * Returns a message to show the user, or null when the file is acceptable.
 */
export function validateImageFile(
  file: Pick<File, 'type' | 'size' | 'name'>,
  maxBytes: number = MEDIA_LIMITS.serviceImageMaxBytes,
): string | null {
  const type = file.type.toLowerCase()
  if (type && !(MEDIA_LIMITS.supportedTypes as readonly string[]).includes(type)) {
    return 'Choose a JPEG, PNG or WebP image.'
  }
  if (file.size <= 0) return 'That file is empty. Choose another image.'
  if (file.size > maxBytes) {
    return `Images must be smaller than ${formatFileSize(maxBytes)} — that one is ${formatFileSize(file.size)}.`
  }
  return null
}

export type ResolvedUploadFile =
  | { ok: true; declaredType: SupportedImageType; sizeBytes: number }
  | { ok: false; message: string }

/**
 * Validates the file *and* resolves the type the server will detect, so the
 * declaration always matches and a mislabelled file is explained before it is
 * uploaded rather than rejected after the bytes have crossed the network.
 */
export async function resolveUploadFile(
  file: File,
  maxBytes: number = MEDIA_LIMITS.serviceImageMaxBytes,
): Promise<ResolvedUploadFile> {
  const basic = validateImageFile(file, maxBytes)
  if (basic) return { ok: false, message: basic }

  let header: Uint8Array
  try {
    header = new Uint8Array(await file.slice(0, 12).arrayBuffer())
  } catch {
    return { ok: false, message: 'That file could not be read. Choose another image.' }
  }

  const sniffed = sniffImageType(header)
  if (!sniffed) return { ok: false, message: 'That file is not a JPEG, PNG or WebP image.' }

  return { ok: true, declaredType: sniffed, sizeBytes: file.size }
}

/** How many times the byte transfer is attempted before giving up. */
const PUT_ATTEMPTS = 3
/** Backoff before each attempt (the first is immediate). */
const PUT_BACKOFF_MS = [0, 600, 1800]
/** A single PUT that stalls is abandoned rather than left to hang the slot. */
const PUT_TIMEOUT_MS = 120_000

function abortError(): ApiError {
  return new ApiError('UPLOAD_ABORTED', 'The upload was cancelled.')
}

/** Transient failures worth another attempt: no response, timeout, 408, 429, 5xx. */
function isRetryablePutStatus(status: number): boolean {
  return status === 0 || status === 408 || status === 429 || status >= 500
}

/** One `PUT` of the bytes to storage, reporting progress and honouring abort. */
function putOnce(
  grant: MediaUploadGrant,
  file: File,
  onProgress?: (percent: number) => void,
  signal?: AbortSignal,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest()
    request.open('PUT', grant.uploadUrl, true)
    request.timeout = PUT_TIMEOUT_MS
    // Only the headers the grant asked for: the signature covers them, so an
    // extra Authorization header would invalidate the presigned PUT.
    for (const [header, value] of Object.entries(grant.requiredHeaders ?? {})) {
      request.setRequestHeader(header, value)
    }

    request.upload.onprogress = (event) => {
      if (!event.lengthComputable) return
      onProgress?.(Math.round((event.loaded / event.total) * 100))
    }

    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        resolve()
        return
      }
      reject(
        new ApiError(
          `STORAGE_${request.status}`,
          'The image could not be uploaded. Please try again.',
          request.status,
        ),
      )
    }

    request.onerror = () =>
      reject(new ApiError('STORAGE_NETWORK', 'The upload was interrupted. Please try again.'))
    request.ontimeout = () =>
      reject(new ApiError('STORAGE_TIMEOUT', 'The upload timed out. Please try again.'))
    request.onabort = () => reject(abortError())

    signal?.addEventListener('abort', () => request.abort(), { once: true })
    request.send(file)
  })
}

/**
 * Uploads the bytes with bounded retries.
 *
 * A dropped connection, a 5xx or a timeout is retried with backoff because the
 * PUT targets one immutable key, so a retry can never duplicate the object. A
 * rejected grant (401/403) is retried with a *fresh* grant, which is what makes a
 * grant that expired mid-upload self-heal. Progress restarts on each attempt so
 * the bar never lies about how much has actually been sent.
 */
async function putToStorage(
  grant: MediaUploadGrant,
  file: File,
  mediaId: string,
  onProgress?: (percent: number) => void,
  signal?: AbortSignal,
): Promise<void> {
  let current = grant

  for (let attempt = 0; attempt < PUT_ATTEMPTS; attempt += 1) {
    const backoff = PUT_BACKOFF_MS[attempt] ?? PUT_BACKOFF_MS[PUT_BACKOFF_MS.length - 1]
    if (backoff > 0) await sleep(backoff, signal)
    onProgress?.(0)

    try {
      await putOnce(current, file, onProgress, signal)
      return
    } catch (error) {
      if (signal?.aborted) throw abortError()

      const status = error instanceof ApiError ? error.status : 0
      const isLast = attempt === PUT_ATTEMPTS - 1
      if (isLast) throw error

      if (status === 401 || status === 403) {
        // The grant expired or was rejected: mint a new one and continue.
        current = await mediaApi.regrant(mediaId)
        continue
      }
      if (!isRetryablePutStatus(status)) throw error
    }
  }
}

/** Abortable delay, so cancellation is immediate rather than after the timer. */
function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortError())
      return
    }
    const timer = window.setTimeout(() => {
      cleanup()
      resolve()
    }, ms)
    const onAbort = () => {
      cleanup()
      reject(abortError())
    }
    const cleanup = () => {
      window.clearTimeout(timer)
      signal?.removeEventListener('abort', onAbort)
    }
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

/** Where an upload currently is. */
export type UploadPhase = 'uploading' | 'processing' | 'ready'

export type UploadResult =
  | { ok: true; media: MediaRecord; ready: boolean }
  | { ok: false; message: string; code: string; cancelled: boolean }

/**
 * Polling schedule for the worker.
 *
 * The first checks are quick because the worker is usually only a second or two
 * behind, and the delays then grow so a slow image does not hammer the API. The
 * budget bounds the whole wait; past it the upload is reported as *accepted but
 * still processing* rather than failed, because `uploaded`/`processing` is an
 * attachable state and the next read picks the variants up.
 */
const POLL_DELAYS_MS = [250, 400, 650, 1000, 1500, 2000]
const POLL_BUDGET_MS = 20_000

export type UploadMediaOptions = {
  file: File
  purpose: MediaPurpose
  targetType?: string | null
  targetId?: string | null
  /**
   * Stable key for this slot's attempt. Reuse it when retrying so the server
   * returns the same media row instead of creating an orphan.
   */
  idempotencyKey?: string
  onProgress?: (percent: number) => void
  onPhase?: (phase: UploadPhase) => void
  signal?: AbortSignal
}

/**
 * Runs one image end to end: validate → grant → upload → complete → await variants.
 *
 * Never throws: every outcome is a discriminated result, so a slot can render the
 * exact message (including "cancelled") without depending on state that may have
 * been captured before the upload started.
 */
export async function uploadMedia(options: UploadMediaOptions): Promise<UploadResult> {
  const { file, purpose, onProgress, onPhase, signal } = options
  const idempotencyKey = options.idempotencyKey ?? newIdempotencyKey()
  // `POST /media/uploads` and `POST /media/{id}/complete` are different
  // requests, and the server's idempotency store is unique per key with a
  // request fingerprint — so one key cannot serve both (it would be rejected as
  // IDEMPOTENCY_CONFLICT). Each step therefore gets its own key, derived from
  // the attempt's key so retrying the whole attempt stays idempotent.
  const completionKey = `${idempotencyKey}:complete`

  try {
    // Read the real type first so the declared type always matches what the
    // server will detect — and so a mislabelled file fails before any bytes move.
    const resolved = await resolveUploadFile(file)
    if (!resolved.ok) {
      return { ok: false, message: resolved.message, code: 'INVALID_FILE', cancelled: false }
    }

    onPhase?.('uploading')
    onProgress?.(0)

    const grant = await mediaApi.createUpload(
      {
        purpose,
        fileName: file.name,
        declaredMimeType: resolved.declaredType,
        sizeBytes: resolved.sizeBytes,
        targetType: options.targetType ?? null,
        targetId: options.targetId ?? null,
      },
      idempotencyKey,
    )

    await putToStorage(grant, file, grant.mediaId, onProgress, signal)
    onProgress?.(100)

    onPhase?.('processing')
    let record = await mediaApi.complete(grant.mediaId, completionKey)

    const deadline = Date.now() + POLL_BUDGET_MS
    let step = 0

    while (record.status !== 'ready') {
      if (record.status === 'failed') {
        return {
          ok: false,
          message: 'That image could not be processed. Try a different photo.',
          code: 'MEDIA_PROCESSING_FAILED',
          cancelled: false,
        }
      }
      if (Date.now() >= deadline) {
        return { ok: true, media: record, ready: false }
      }
      await sleep(POLL_DELAYS_MS[Math.min(step, POLL_DELAYS_MS.length - 1)], signal)
      step += 1
      record = await mediaApi.get(grant.mediaId)
    }

    onPhase?.('ready')
    return { ok: true, media: record, ready: true }
  } catch (error) {
    if (error instanceof ApiError && error.code === 'UPLOAD_ABORTED') {
      return { ok: false, message: 'The upload was cancelled.', code: error.code, cancelled: true }
    }
    return {
      ok: false,
      message: uploadErrorMessage(error),
      code: error instanceof ApiError ? error.code : 'UPLOAD_FAILED',
      cancelled: false,
    }
  }
}

/** Uniform message for any upload failure, so every caller reports it the same way. */
export function uploadErrorMessage(error: unknown): string {
  return errorMessage(error, 'The image could not be uploaded. Please try again.')
}
