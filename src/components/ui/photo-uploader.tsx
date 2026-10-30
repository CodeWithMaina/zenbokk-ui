import { useRef, useState } from 'react'
import type { ChangeEvent, ReactNode } from 'react'
import { ImagePlus, LoaderCircle, X } from 'lucide-react'
import { cn } from '../../lib/cn'
import { FieldError, FieldHint } from './field'

export type PhotoUploaderPhoto = {
  /** Optional stable id. Falls back to the array index. */
  id?: string
  src: string
  alt?: string
}

export type PhotoUploaderProps = {
  value: readonly PhotoUploaderPhoto[]
  onChange: (photos: PhotoUploaderPhoto[]) => void
  max?: number
  label?: ReactNode
  hint?: ReactNode
  error?: ReactNode
  accept?: string
  maxSizeMb?: number
  addLabel?: string
  removeLabel?: (index: number) => string
  onError?: (message: string) => void
  className?: string
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result)
      else reject(new Error('The selected file could not be read.'))
    }
    reader.onerror = () =>
      reject(reader.error ?? new Error('The selected file could not be read.'))
    reader.readAsDataURL(file)
  })
}

/**
 * Up to `max` photo slots with in-browser previews. Photos are emitted as
 * data URLs, which keeps the component usable without an upload endpoint.
 */
export function PhotoUploader({
  value,
  onChange,
  max = 3,
  label = 'Photos',
  hint,
  error,
  accept = 'image/*',
  maxSizeMb = 5,
  addLabel = 'Add photo',
  removeLabel = (index) => `Remove photo ${index + 1}`,
  onError,
  className,
}: PhotoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const targetSlot = useRef<number | null>(null)
  const [busy, setBusy] = useState(false)

  const limit = Math.max(1, Math.floor(max))

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    if (!file.type.startsWith('image/')) {
      onError?.('Choose an image file.')
      return
    }

    if (file.size > maxSizeMb * 1024 * 1024) {
      onError?.(`Choose an image smaller than ${maxSizeMb} MB.`)
      return
    }

    setBusy(true)
    try {
      const src = await readAsDataUrl(file)
      const slot = Math.min(targetSlot.current ?? value.length, value.length)
      const next = [...value]
      next.splice(slot, 0, { src, alt: file.name })
      onChange(next.slice(0, limit))
    } catch (readError) {
      onError?.(
        readError instanceof Error
          ? readError.message
          : 'The selected file could not be read.',
      )
    } finally {
      targetSlot.current = null
      setBusy(false)
    }
  }

  return (
    <div className={cn('min-w-0', className)}>
      <span className="label">{label}</span>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        tabIndex={-1}
        onChange={handleFile}
      />

      <div
        role="group"
        aria-label={typeof label === 'string' ? label : 'Photos'}
        className="grid grid-cols-3 gap-[0.5rem]"
      >
        {Array.from({ length: limit }, (_, index) => {
          const photo = value[index]

          if (photo) {
            return (
              <div
                key={photo.id ?? `${photo.src.slice(0, 24)}-${index}`}
                className="relative aspect-[4/3] overflow-hidden rounded-lg border border-line bg-sunken"
              >
                <img
                  src={photo.src}
                  alt={photo.alt ?? ''}
                  className="size-full object-cover"
                />
                <button
                  type="button"
                  aria-label={removeLabel(index)}
                  disabled={busy}
                  onClick={() => onChange(value.filter((_, i) => i !== index))}
                  className="absolute top-[0.3rem] right-[0.3rem] grid size-[1.45rem] place-items-center rounded-round bg-inverse/90 text-on-inverse shadow-card transition-opacity hover:opacity-80 focus-visible:shadow-ring focus-visible:outline-none disabled:opacity-40"
                >
                  <X className="size-3" aria-hidden="true" />
                </button>
              </div>
            )
          }

          return (
            <button
              key={`empty-${index}`}
              type="button"
              disabled={busy}
              aria-label={`${addLabel} ${index + 1}`}
              onClick={() => {
                targetSlot.current = index
                inputRef.current?.click()
              }}
              className="flex aspect-[4/3] flex-col items-center justify-center gap-[0.2rem] rounded-lg border border-dashed border-line bg-sunken text-muted transition-colors hover:border-muted hover:text-fg focus-visible:shadow-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? (
                <LoaderCircle
                  className="size-[1.2rem] animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <ImagePlus className="size-[1.2rem]" aria-hidden="true" />
              )}
              <span className="text-caption">{addLabel}</span>
            </button>
          )
        })}
      </div>

      {error ? <FieldError>{error}</FieldError> : null}
      {!error && hint ? <FieldHint>{hint}</FieldHint> : null}
    </div>
  )
}
