import { useRef, useState } from 'react'
import type { ChangeEvent, ReactNode } from 'react'
import { ImagePlus, LoaderCircle, Trash2 } from 'lucide-react'
import { errorMessage } from '../../lib/api/client'
import { cn } from '../../lib/cn'
import { MEDIA_LIMITS, useMediaUpload, useResolvedImage, validateImageFile } from '../../lib/media'
import type { MediaPurpose } from '../../lib/media'
import { Avatar } from '../ui/avatar'
import { Button } from '../ui/button'
import { FieldError, FieldHint } from '../ui/field'
import { Progress } from '../ui/progress'

export type SettingsMediaUploaderProps = {
  /** Media purpose the upload is created with (`user-avatar`, `business-logo`…). */
  purpose: MediaPurpose
  /** The currently assigned media id, if any. */
  mediaId?: string | null
  /** Legacy fallback URL (used until a media id is assigned). */
  url?: string | null
  /** Preview treatment: round avatar, square logo, or a wide cover strip. */
  shape?: 'circle' | 'square' | 'cover'
  /** Button text, e.g. "Change photo". */
  uploadLabel: string
  /** Accessible name for the hidden file input. */
  inputLabel: string
  hint?: ReactNode
  /** Initials shown when there is no image (circle/square only). */
  fallbackName?: string
  /** Set false to render only the controls, letting the parent own the preview. */
  showPreview?: boolean
  /** Per-purpose byte limit, mirrored from the server's `MediaLimitOptions`. */
  maxBytes?: number
  disabled?: boolean
  /** Called with the ready media id after a successful upload. */
  onUploaded: (mediaId: string) => Promise<void> | void
  /** When provided, renders a Remove action for the current image. */
  onRemoved?: () => Promise<void> | void
  className?: string
}

const SLOT = 'media'


/**
 * Single-slot image uploader for the Settings module (profile photo, business
 * logo, cover image).
 *
 * Runs the real media pipeline — validate → grant → upload → complete → await
 * variants — and only calls `onUploaded` once the server reports the media is
 * *ready*, because the relationship endpoints refuse anything else. Progress,
 * cancellation and cleanup are handled by `useMediaUpload`; the parent owns the
 * assignment call so the same uploader serves avatars, logos and covers.
 */
export function SettingsMediaUploader({
  purpose,
  mediaId,
  url,
  shape = 'circle',
  uploadLabel,
  inputLabel,
  hint,
  fallbackName,
  showPreview = true,
  maxBytes = MEDIA_LIMITS.serviceImageMaxBytes,
  disabled = false,
  onUploaded,
  onRemoved,
  className,
}: SettingsMediaUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const uploads = useMediaUpload(purpose)
  const resolved = useResolvedImage({ mediaId, url })
  const [localError, setLocalError] = useState<string | null>(null)

  const state = uploads.states[SLOT]
  const busy = state?.status === 'uploading' || state?.status === 'processing'
  const hasImage = Boolean(resolved.src)

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setLocalError(null)

    const validation = validateImageFile(file, maxBytes)
    if (validation) {
      setLocalError(validation)
      return
    }

    const result = await uploads.upload(SLOT, file)
    if (!result.ok) {
      // A cancelled upload clears its own state; only surface real failures.
      setLocalError(result.cancelled ? null : result.message)
      return
    }

    try {
      await onUploaded(result.media.id)
      uploads.clear(SLOT)
    } catch (error) {
      setLocalError(
        errorMessage(error, 'The image uploaded but could not be saved. Try again.'),
      )
    }
  }

  const handleRemove = async () => {
    if (!onRemoved) return
    setLocalError(null)
    try {
      await onRemoved()
      uploads.clear(SLOT)
    } catch (error) {
      setLocalError(errorMessage(error, 'The image could not be removed. Try again.'))
    }
  }

  const errorText = localError ?? (state?.status === 'error' ? state.error : undefined)

  return (
    <div className={cn('min-w-0', className)}>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        tabIndex={-1}
        aria-label={inputLabel}
        onChange={handleFile}
      />


      <div className="flex flex-wrap items-center gap-[1rem]">
        {showPreview ? (
          <>
            {shape === 'cover' ? (
              <div className="relative aspect-[16/7] w-full max-w-[22rem] overflow-hidden rounded-card border border-line bg-sunken">
                {resolved.src ? (
                  <img src={resolved.src} alt="" className="size-full object-cover" />
                ) : (
                  <span className="grid size-full place-items-center text-caption text-muted">
                    No cover image yet
                  </span>
                )}
              </div>
            ) : (
              <Avatar
                name={fallbackName ?? ''}
                src={resolved.src ?? undefined}
                size="xl"
                shape={shape === 'square' ? 'square' : 'circle'}
                decorative={false}
              />
            )}
          </>
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col items-start gap-[0.45rem]">
          <div className="flex flex-wrap gap-[0.5rem]">
            <Button
              onClick={() => inputRef.current?.click()}
              disabled={disabled || busy}
            >
              {busy ? (
                <LoaderCircle className="size-[0.95rem] animate-spin" aria-hidden="true" />
              ) : (
                <ImagePlus className="size-[0.95rem]" aria-hidden="true" />
              )}
              {busy ? 'Uploading…' : uploadLabel}
            </Button>

            {onRemoved && hasImage ? (
              <Button
                variant="ghost"
                onClick={() => void handleRemove()}
                disabled={disabled || busy}
              >
                <Trash2 className="size-[0.95rem]" aria-hidden="true" />
                Remove
              </Button>
            ) : null}
          </div>

          {hint ? <FieldHint>{hint}</FieldHint> : null}
        </div>
      </div>

      {busy ? (
        <Progress
          className="mt-[0.8rem]"
          value={state?.progress ?? 0}
          label={state?.status === 'processing' ? 'Processing image…' : 'Uploading…'}
          ariaLabel="Upload progress"
        />
      ) : null}

      {errorText ? <FieldError>{errorText}</FieldError> : null}
    </div>
  )
}
