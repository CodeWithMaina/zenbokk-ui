import { useCallback, useEffect, useRef } from 'react'
import type { ChangeEvent, ReactNode } from 'react'
import { cn } from '../../lib/cn'
import type { ImageVariant } from '../../lib/api/types'
import {
  MAX_IMAGE_MB,
  MEDIA_PURPOSE,
  formatFileSize,
  largestVariant,
  resolveUploadFile,
  useMediaUpload,
} from '../../lib/media'
import type { UploadResult } from '../../lib/media'
import { FieldError, FieldHint } from '../ui/field'
import { ServiceImageSlot } from './ServiceImageSlot'
import type { ServiceImageSlotState } from './ServiceImageSlot'

/**
 * One entry in the service's ordered photo set.
 *
 * `mediaId` is what gets persisted (the array order becomes the display order,
 * so index 0 is the cover). The two URLs have different jobs: `localUrl` is an
 * object URL shown the instant a file is chosen, and `url` is the delivered
 * variant URL that replaces it once the worker has finished. Keeping them apart
 * is what lets the slot show the photo immediately *and* know whether the saved
 * image is real yet.
 */
export type ServiceImageDraft = {
  /** Local identity, stable across reorders and removals. */
  key: string
  /** Set once the media row exists; absent while uploading. */
  mediaId?: string
  /** Delivered preview URL, present once the variants are ready. */
  url?: string
  /** Object URL for an in-flight upload. Revoked as soon as it is replaced. */
  localUrl?: string
  /** Processed variants, so a saved preview ships the right size and format. */
  variants?: ImageVariant[]
  /** Set when the upload failed or was cancelled, so the slot can offer a retry. */
  error?: string
}

/** The URL to render for a slot: the delivered one, else the in-flight preview. */
export function draftImageUrl(entry?: ServiceImageDraft): string | undefined {
  return entry?.url ?? entry?.localUrl
}

export type ServiceImageUploaderProps = {
  value: readonly ServiceImageDraft[]
  onChange: (next: ServiceImageDraft[]) => void
  /** A service holds at most three photos; the API enforces the same ceiling. */
  max?: number
  disabled?: boolean
  hint?: ReactNode
  /** Surfaces validation problems (wrong type, too large) next to the slots. */
  error?: ReactNode
  onError?: (message: string | null) => void
  className?: string
}

/** A fresh, empty slot key. */
function newKey(): string {
  return `photo-${Math.random().toString(36).slice(2, 10)}`
}

/**
 * The three-photo interface from the design: three fixed slots, an Add action on
 * every empty one, a preview with a remove action on every filled one, and the
 * first image acting as the cover.
 *
 * The component is controlled — the ordered draft list lives in the form — so an
 * edit can prefill the existing images, keep the untouched ones, replace or
 * remove individual ones and submit fewer than three. Uploading happens through
 * the shared media pipeline; only the resulting media ids are persisted.
 */
export function ServiceImageUploader({
  value,
  onChange,
  max = 3,
  disabled = false,
  hint,
  error,
  onError,
  className,
}: ServiceImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const targetSlot = useRef<number | null>(null)
  const { states, pending, upload, retry, cancel, clear } = useMediaUpload(MEDIA_PURPOSE.serviceImage)

  // Object URLs are created for instant previews and must be revoked by hand —
  // the browser keeps the blob (and its memory) alive until they are.
  const objectUrls = useRef(new Set<string>())
  useEffect(
    () => () => {
      for (const url of objectUrls.current) URL.revokeObjectURL(url)
      objectUrls.current.clear()
    },
    [],
  )

  const createLocalUrl = (file: File) => {
    const url = URL.createObjectURL(file)
    objectUrls.current.add(url)
    return url
  }

  const revokeLocalUrl = (url?: string) => {
    if (url && objectUrls.current.delete(url)) URL.revokeObjectURL(url)
  }

  const limit = Math.max(1, Math.floor(max))
  const slots = Array.from({ length: limit }, (_, index) => value[index])

  const openPicker = (index: number) => {
    targetSlot.current = index
    inputRef.current?.click()
  }

  /** Fold an upload outcome into the draft list, keeping the slot's position. */
  const applyResult = useCallback(
    (key: string, slot: number, result: UploadResult) => {
      const next = [...value]
      const index = next.findIndex((entry) => entry.key === key)
      const current = index >= 0 ? next[index] : undefined

      if (!result.ok) {
        // Keep the local preview so the photo stays visible behind the error,
        // and let the slot offer a retry that reuses the same media row.
        const entry: ServiceImageDraft = {
          ...(current ?? { key }),
          key,
          error: result.cancelled ? 'Upload cancelled. Tap to retry.' : result.message,
        }
        if (index >= 0) next[index] = entry
        else next.splice(slot, 0, entry)
        onChange(next.slice(0, limit))
        onError?.(entry.error ?? null)
        return
      }

      const remote = largestVariant(result.media)?.url
      if (remote) revokeLocalUrl(current?.localUrl)

      const entry: ServiceImageDraft = {
        key,
        mediaId: result.media.id,
        url: remote,
        // Until the worker produces variants there is nothing to render remotely,
        // so the object URL stays and the slot keeps showing "processing".
        localUrl: remote ? undefined : current?.localUrl,
        variants: result.media.variants.length > 0 ? result.media.variants : current?.variants,
      }
      if (index >= 0) next[index] = entry
      else next.splice(slot, 0, entry)
      onChange(next.slice(0, limit))
      onError?.(null)
    },
    [limit, onChange, onError, value],
  )

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    const slot = Math.min(targetSlot.current ?? value.length, limit - 1)
    targetSlot.current = null

    // Validate and read the real type *before* a slot appears, so an unusable
    // file is explained immediately instead of becoming a failed slot.
    const resolved = await resolveUploadFile(file)
    if (!resolved.ok) {
      onError?.(resolved.message)
      return
    }

    // The slot appears immediately with a local preview, so a slow upload never
    // looks like a dead button.
    const key = newKey()
    const next = [...value]
    next.splice(slot, 0, { key, localUrl: createLocalUrl(file) })
    onChange(next.slice(0, limit))
    onError?.(null)

    applyResult(key, slot, await upload(key, file))
  }

  const removeAt = (index: number) => {
    const entry = value[index]
    if (!entry) return
    clear(entry.key)
    revokeLocalUrl(entry.localUrl)
    onChange(value.filter((_, position) => position !== index))
  }

  const cancelAt = (index: number) => {
    const entry = value[index]
    if (!entry) return
    cancel(entry.key)
    onChange(
      value.map((candidate) =>
        candidate.key === entry.key
          ? { ...candidate, error: 'Upload cancelled. Tap to retry.' }
          : candidate,
      ),
    )
  }

  const retryAt = (index: number) => {
    const entry = value[index]
    if (!entry) return
    onChange(
      value.map((candidate) =>
        candidate.key === entry.key ? { ...candidate, error: undefined } : candidate,
      ),
    )
    void retry(entry.key).then((result) => {
      if (result) applyResult(entry.key, index, result)
    })
  }

  /**
   * What a slot is showing. The draft is authoritative for "stored"; the hook's
   * per-key state covers the transient phases, so a remount can never leave a
   * slot spinning forever on an image that is already saved.
   */
  const stateFor = (entry: ServiceImageDraft | undefined): ServiceImageSlotState => {
    if (!entry) return 'empty'
    if (entry.error) return 'error'

    const status = states[entry.key]?.status
    if (status === 'uploading') return 'uploading'
    if (status === 'processing') return 'processing'
    if (status === 'error' || status === 'cancelled') return 'error'

    if (entry.mediaId) return entry.url ? 'ready' : 'processing'
    return 'uploading'
  }

  return (
    <div className={cn('min-w-0', className)}>
      <span className="label">
        Photos{' '}
        <span className="font-normal text-muted">· up to {limit}, the first is the cover</span>
      </span>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        tabIndex={-1}
        onChange={handleFile}
      />

      <div role="group" aria-label="Service photos" className="grid grid-cols-3 gap-[0.5rem]">
        {slots.map((entry, index) => (
          <ServiceImageSlot
            key={entry?.key ?? `empty-${index}`}
            index={index}
            state={stateFor(entry)}
            previewUrl={draftImageUrl(entry)}
            variants={entry?.variants}
            progress={entry ? (states[entry.key]?.progress ?? 0) : 0}
            error={entry?.error ?? (entry ? states[entry.key]?.error : undefined)}
            isCover={index === 0 && Boolean(entry?.mediaId)}
            disabled={disabled}
            onAdd={() => openPicker(index)}
            onRemove={() => removeAt(index)}
            onCancel={() => cancelAt(index)}
            onRetry={() => retryAt(index)}
          />
        ))}
      </div>

      <p
        className="mt-[0.5rem] min-h-[1.1rem] text-caption text-muted"
        role="status"
        aria-live="polite"
      >
        {pending > 0 ? `Uploading ${pending} photo${pending === 1 ? '' : 's'}…` : null}
      </p>

      {error ? <FieldError>{error}</FieldError> : null}
      {!error && hint ? <FieldHint>{hint}</FieldHint> : null}
      {!error && !hint ? (
        <FieldHint>
          JPEG, PNG or WebP up to {formatFileSize(MAX_IMAGE_MB * 1024 * 1024)}. Photos are saved
          when you save the service.
        </FieldHint>
      ) : null}
    </div>
  )
}