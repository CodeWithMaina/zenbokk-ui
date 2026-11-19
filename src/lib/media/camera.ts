/**
 * Contextual camera capture for the existing media pipeline.
 *
 * This module only produces a `File` from a live camera frame — it never uploads and
 * never stores anything. The caller hands that file to the same `useMediaUpload`
 * pipeline a picked file goes through (validate → grant → PUT → complete → variants),
 * so a captured photo is indistinguishable from an uploaded one once it reaches the
 * server, and no second storage mechanism exists.
 *
 * Permissions are never requested here: `startCamera` is only called after the user
 * has explicitly asked to use the camera in the dialog. Nothing on this page touches
 * `getUserMedia` at import time or on mount.
 */

/** Why the camera could not be used, in terms the UI can explain. */
export type CameraErrorCode =
  | 'unsupported'
  | 'insecure'
  | 'denied'
  | 'no-camera'
  | 'in-use'
  | 'unknown'

export class CameraError extends Error {
  readonly code: CameraErrorCode

  constructor(code: CameraErrorCode, message: string) {
    super(message)
    this.name = 'CameraError'
    this.code = code
  }
}

/** True when this browser exposes a camera API at all. */
export function isCameraSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    typeof navigator.mediaDevices !== 'undefined' &&
    typeof navigator.mediaDevices.getUserMedia === 'function'
  )
}

/**
 * `getUserMedia` is only available in a secure context (HTTPS, or `localhost`).
 * On a plain-HTTP host the API can exist and still refuse, so it is checked up
 * front to give an accurate explanation instead of a permission error.
 */
export function isSecureCameraContext(): boolean {
  if (typeof window === 'undefined') return false
  return window.isSecureContext !== false
}

/** Turn a rejected `getUserMedia` into something a person can act on. */
export function describeCameraError(error: unknown): CameraError {
  if (error instanceof CameraError) return error

  const name = error instanceof DOMException ? error.name : ''
  switch (name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
    case 'SecurityError':
      return new CameraError(
        'denied',
        'Camera access was blocked. Allow the camera for this site in your browser settings, then try again.',
      )
    case 'NotFoundError':
    case 'DevicesNotFoundError':
    case 'OverconstrainedError':
      return new CameraError(
        'no-camera',
        'No camera was found on this device. You can still choose a photo from your files.',
      )
    case 'NotReadableError':
    case 'TrackStartError':
      return new CameraError(
        'in-use',
        'The camera is being used by another app. Close that app and try again, or choose a photo from your files.',
      )
    default:
      return new CameraError(
        'unknown',
        error instanceof Error && error.message
          ? error.message
          : 'The camera could not be started. You can still choose a photo from your files.',
      )
  }
}

/** Request the rear camera where the device has one, and a sensible resolution. */
export async function startCamera(): Promise<MediaStream> {
  if (!isCameraSupported()) {
    throw new CameraError('unsupported', 'This browser cannot use a camera.')
  }
  if (!isSecureCameraContext()) {
    throw new CameraError(
      'insecure',
      'The camera only works on a secure (https) connection. You can still choose a photo from your files.',
    )
  }

  try {
    return await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1280 },
        height: { ideal: 1280 },
      },
      audio: false,
    })
  } catch (error) {
    throw describeCameraError(error)
  }
}

/** Stop every track. Safe to call twice, and safe with nothing. */
export function stopStream(stream: MediaStream | null | undefined): void {
  if (!stream) return
  for (const track of stream.getTracks()) {
    try {
      track.stop()
    } catch {
      // A track that is already ended throws in some browsers; nothing to do.
    }
  }
}

/** Longest edge of the still. Keeps a 12 MP phone frame inside the upload limits. */
const MAX_EDGE = 1600
const JPEG_QUALITY = 0.9

/**
 * Draw the current frame to a canvas and return it as a JPEG `File`.
 *
 * The source is cropped to the video's own aspect ratio (never stretched), and the
 * still is scaled down to at most `MAX_EDGE` on its long edge so a high-resolution
 * phone camera does not produce a file the server would reject for size.
 */
export async function captureFrame(
  video: HTMLVideoElement,
  fileName?: string,
): Promise<File> {
  const width = video.videoWidth
  const height = video.videoHeight
  if (!width || !height) {
    throw new CameraError('unknown', 'The camera has not produced an image yet. Try again.')
  }

  const scale = Math.min(1, MAX_EDGE / Math.max(width, height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(width * scale)
  canvas.height = Math.round(height * scale)

  const context = canvas.getContext('2d')
  if (!context) {
    throw new CameraError('unknown', 'This browser could not prepare the photo. Try again.')
  }

  context.drawImage(video, 0, 0, canvas.width, canvas.height)

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY),
  )
  if (!blob) {
    throw new CameraError('unknown', 'This browser could not prepare the photo. Try again.')
  }

  return new File([blob], fileName ?? `camera-${Date.now()}.jpg`, {
    type: 'image/jpeg',
    lastModified: Date.now(),
  })
}
