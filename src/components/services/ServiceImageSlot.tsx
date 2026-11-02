import { ImagePlus, LoaderCircle, RotateCcw, X } from 'lucide-react'
import { cn } from '../../lib/cn'

/** What a slot is showing right now. */
export type ServiceImageSlotState = 'empty' | 'uploading' | 'processing' | 'ready' | 'error'

export type ServiceImageSlotProps = {
  /** Zero-based slot position; slot 0 is the cover. */
  index: number
  state: ServiceImageSlotState
  /** Preview source: a ready variant URL or the local object URL while uploading. */
  previewUrl?: string
  /** Responsive sources for a saved image, so a preview ships the right size. */
  variants?: readonly { url: string; width: number; height: number; format: string }[]
  progress?: number
  error?: string
  /** True when this filled slot holds the cover image. */
  isCover?: boolean
  disabled?: boolean
  onAdd: () => void
  onRemove: () => void
  /** Aborts an in-flight upload without discarding the slot. */
  onCancel: () => void
  onRetry: () => void
}

const stateLabel: Record<ServiceImageSlotState, string> = {
  empty: 'empty',
  uploading: 'uploading',
  processing: 'processing',
  ready: 'ready',
  error: 'failed',
}

/**
 * One photo slot in the service form.
 *
 * Empty slots are the dashed "Add" target from the design; a filled slot shows
 * the image with a remove button, and while the pipeline runs it shows real
 * progress (bytes) or a spinner (worker producing variants) so the owner is never
 * left guessing. An upload can be stopped without losing the slot, and a failed
 * or cancelled one offers a retry that reuses the same media row.
 */
export function ServiceImageSlot({
  index,
  state,
  previewUrl,
  variants,
  progress = 0,
  error,
  isCover = false,
  disabled = false,
  onAdd,
  onRemove,
  onCancel,
  onRetry,
}: ServiceImageSlotProps) {
  if (state === 'empty') {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={onAdd}
        aria-label={`Add photo ${index + 1}`}
        className="flex aspect-[4/5] flex-col items-center justify-center gap-[0.3rem] rounded-lg border border-dashed border-line-strong bg-transparent px-[0.3rem] text-center text-meta font-semibold text-muted transition-colors hover:bg-hover hover:text-fg focus-visible:shadow-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ImagePlus className="size-[1.15rem]" aria-hidden="true" />
        <span>Add</span>
        {index === 0 ? <span className="text-caption font-normal">Cover</span> : null}
      </button>
    )
  }

  const working = state === 'uploading' || state === 'processing'

  return (
    <div
      aria-busy={working || undefined}
      className={cn(
        'relative aspect-[4/5] overflow-hidden rounded-lg border border-line bg-sunken',
        state === 'error' && 'border-danger-line',
      )}
    >
      {previewUrl ? (
        variants && variants.some((variant) => variant.format === 'webp') ? (
          <picture className="contents">
            <source
              type="image/webp"
              srcSet={variants
                .filter((variant) => variant.format === 'webp')
                .sort((left, right) => left.width - right.width)
                .map((variant) => `${variant.url} ${variant.width}w`)
                .join(', ')}
            />
            <img
              src={previewUrl}
              alt=""
              decoding="async"
              className={cn(
                'absolute inset-0 size-full object-cover',
                state !== 'ready' && 'opacity-60',
              )}
            />
          </picture>
        ) : (
          <img
            src={previewUrl}
            alt=""
            decoding="async"
            className={cn(
              'absolute inset-0 size-full object-cover',
              state !== 'ready' && 'opacity-60',
            )}
          />
        )
      ) : null}

      {working ? (
        <div className="absolute inset-0 grid place-items-center bg-scrim/40 text-[#fff]">
          <div className="flex flex-col items-center gap-[0.4rem] px-[0.4rem] text-center">
            <LoaderCircle className="size-[1.3rem] animate-spin" aria-hidden="true" />
            <span className="text-caption font-semibold">
              {state === 'uploading' ? `${progress}%` : 'Processing'}
            </span>
          </div>
        </div>
      ) : null}

      {state === 'uploading' ? (
        <div className="absolute inset-x-[0.4rem] bottom-[0.4rem] flex flex-col gap-[0.35rem]">
          <div className="h-[0.3rem] overflow-hidden rounded-pill bg-[#fff]/40">
            <div
              className="h-full rounded-pill bg-[#fff] transition-[width]"
              style={{ width: `${progress}%` }}
            />
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={disabled}
            className="self-start rounded-pill bg-[#fff]/90 px-[0.5rem] py-[0.1rem] text-caption font-semibold text-[#1c1f23] transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:shadow-ring disabled:opacity-40"
          >
            Stop
          </button>
        </div>
      ) : null}

      {isCover && state === 'ready' ? (
        <span className="absolute bottom-[0.4rem] left-[0.4rem] rounded-pill bg-inverse px-[0.5rem] py-[0.15rem] text-caption font-semibold text-on-inverse">
          Cover
        </span>
      ) : null}

      {state === 'error' ? (
        <button
          type="button"
          onClick={onRetry}
          disabled={disabled}
          className="absolute inset-0 flex flex-col items-center justify-center gap-[0.3rem] bg-surface/85 px-[0.4rem] text-center text-caption font-semibold text-danger-ink focus-visible:outline-none focus-visible:shadow-ring disabled:opacity-40"
        >
          <RotateCcw className="size-[1.05rem]" aria-hidden="true" />
          <span>{error ?? 'Upload failed. Tap to retry.'}</span>
        </button>
      ) : null}

      <button
        type="button"
        onClick={onRemove}
        disabled={disabled}
        aria-label={working ? `Cancel upload ${index + 1} and remove` : `Remove photo ${index + 1}`}
        className="absolute top-[0.4rem] right-[0.4rem] z-10 grid size-[1.7rem] place-items-center rounded-sm border-0 bg-[#fff]/92 text-[#1c1f23] shadow-card transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:shadow-ring disabled:opacity-40"
      >
        <X className="size-[0.85rem]" aria-hidden="true" />
      </button>

      <span className="sr-only">{`Photo ${index + 1}: ${stateLabel[state]}`}</span>
    </div>
  )
}
