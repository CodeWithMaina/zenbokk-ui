import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { Camera, CameraOff, LoaderCircle, RotateCcw } from 'lucide-react'
import {
  captureFrame,
  describeCameraError,
  isCameraSupported,
  isSecureCameraContext,
  startCamera,
  stopStream,
} from '../../lib/media'
import { Button } from './button'
import { Portal } from './portal'
import { useOverlay } from './use-overlay'

export type CameraCaptureDialogProps = {
  open: boolean
  /** Close without using a photo (also stops the camera). */
  onClose: () => void
  /** The confirmed still, ready for the caller's existing upload pipeline. */
  onCapture: (file: File) => void
  /** What the photo is for, e.g. "profile photo". Shown in the explanation. */
  subject?: string
}

type Phase = 'explain' | 'starting' | 'live' | 'review' | 'error'

/**
 * Take Photo: an explained, explicit camera capture for any image slot.
 *
 * The camera is never touched until the person presses the button in this dialog —
 * opening it explains *why* access is needed first. Every exit path stops the
 * hardware: closing, cancelling, Escape, and finishing a capture all release the
 * tracks, so the camera light never stays on behind a closed dialog. The confirmed
 * still is handed back as a `File` and goes through the same upload pipeline as a
 * picked file.
 */
export function CameraCaptureDialog({
  open,
  onClose,
  onCapture,
  subject = 'photo',
}: CameraCaptureDialogProps) {
  const titleId = useId()
  const descriptionId = useId()
  const panelRef = useOverlay<HTMLDivElement>(open, onClose)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [phase, setPhase] = useState<Phase>('explain')
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<{ url: string; file: File } | null>(null)

  const release = useCallback(() => {
    stopStream(streamRef.current)
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
  }, [])

  // Leaving the dialog — by any route — always releases the camera.
  useEffect(() => {
    if (open) return
    release()
    setPhase('explain')
    setError(null)
    setPreview((current) => {
      if (current) URL.revokeObjectURL(current.url)
      return null
    })
  }, [open, release])

  useEffect(() => release, [release])

  const start = useCallback(async () => {
    setError(null)
    setPhase('starting')
    try {
      const stream = await startCamera()
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play().catch(() => undefined)
      }
      setPhase('live')
    } catch (caught) {
      const described = describeCameraError(caught)
      release()
      setError(described.message)
      setPhase('error')
    }
  }, [release])

  const takePhoto = useCallback(async () => {
    const video = videoRef.current
    if (!video) return
    try {
      const file = await captureFrame(video)
      // Capture ends the session: the still is what we need, not a live feed.
      release()
      setPreview({ url: URL.createObjectURL(file), file })
      setPhase('review')
    } catch (caught) {
      setError(describeCameraError(caught).message)
    }
  }, [release])

  const retake = useCallback(() => {
    setPreview((current) => {
      if (current) URL.revokeObjectURL(current.url)
      return null
    })
    setError(null)
    setPhase('explain')
  }, [])

  const confirm = useCallback(() => {
    if (!preview) return
    const file = preview.file
    release()
    URL.revokeObjectURL(preview.url)
    setPreview(null)
    setPhase('explain')
    onCapture(file)
    onClose()
  }, [onCapture, onClose, preview, release])

  if (!open) return null

  const unsupported = !isCameraSupported()
  const insecure = !isSecureCameraContext()

  return (
    <Portal>
      <button
        type="button"
        className="scrim"
        aria-label="Cancel camera"
        tabIndex={-1}
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        className="dialog focus:outline-none"
      >
        <div className="mb-[0.7rem] flex items-center gap-[0.55rem]">
          <span className="grid size-[2.2rem] place-items-center rounded-round bg-accent-soft text-accent-ink">
            <Camera className="size-[1.05rem]" aria-hidden="true" />
          </span>
          <h2 id={titleId} className="text-heading font-semibold">
            Take a {subject}
          </h2>
        </div>

        <p id={descriptionId} className="text-meta text-muted">
          The camera is used only while this window is open, to take the still you see
          here. Nothing is recorded or uploaded until you press <b>Use this photo</b> —
          and the camera is released the moment you capture or close.
        </p>

        {phase === 'review' && preview ? (
          <div className="mt-[0.9rem]">
            <div className="overflow-hidden rounded-card border border-line bg-sunken">
              <img
                src={preview.url}
                alt={`Captured ${subject} preview`}
                className="max-h-[52vh] w-full object-contain"
              />
            </div>
            <div className="mt-[0.9rem] flex flex-wrap justify-end gap-[0.5rem]">
              <Button variant="ghost" onClick={retake}>
                <RotateCcw className="size-4" aria-hidden="true" />
                Retake
              </Button>
              <Button onClick={confirm}>Use this photo</Button>
            </div>
          </div>
        ) : (
          <div className="mt-[0.9rem]">
            <div className="relative overflow-hidden rounded-card border border-line bg-sunken">
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                aria-label="Live camera preview"
                className={phase === 'live' ? 'max-h-[52vh] w-full object-contain' : 'hidden'}
              />
              {phase !== 'live' ? (
                <div className="grid min-h-[11rem] place-items-center p-[1.1rem] text-center">
                  {phase === 'starting' ? (
                    <p className="flex items-center gap-[0.45rem] text-meta text-muted">
                      <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                      Starting the camera…
                    </p>
                  ) : (
                    <p className="flex flex-col items-center gap-[0.35rem] text-meta text-muted">
                      <CameraOff className="size-5" aria-hidden="true" />
                      {unsupported
                        ? 'This browser has no camera API.'
                        : insecure
                          ? 'The camera needs a secure (https) connection.'
                          : 'The camera is off until you allow it.'}
                    </p>
                  )}
                </div>
              ) : null}
            </div>

            {error ? (
              <p role="alert" className="mt-[0.7rem] text-meta text-danger-ink">
                {error}
              </p>
            ) : null}

            {unsupported || insecure ? (
              <p className="mt-[0.7rem] text-caption text-subtle">
                Uploading a photo from your files still works exactly as before.
              </p>
            ) : null}

            <div className="mt-[0.9rem] flex flex-wrap justify-end gap-[0.5rem]">
              <Button variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              {phase === 'live' ? (
                <Button onClick={() => void takePhoto()}>
                  <Camera className="size-4" aria-hidden="true" />
                  Capture
                </Button>
              ) : (
                <Button
                  onClick={() => void start()}
                  disabled={phase === 'starting' || unsupported || insecure}
                >
                  {error ? 'Try again' : 'Allow camera & continue'}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </Portal>
  )
}
