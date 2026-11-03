import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, Eye, EyeOff, ImagePlus, Loader2, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { errorMessage } from '../../lib/api/client'
import { cn } from '../../lib/cn'
import { MEDIA_PURPOSE, mediaApi, useMediaUpload } from '../../lib/media'
import type { BusinessMediaEntry } from '../../lib/media'
import { Alert } from '../ui/alert'
import { Button } from '../ui/button'
import { SectionCard } from '../ui/card'
import { EmptyState } from '../ui/empty-state'
import { PageHeader } from '../ui/page-header'
import { ResponsiveImage } from '../ui/responsive-image'
import { Skeleton } from '../ui/skeleton'
import { Switch } from '../ui/switch'

/**
 * The owner's gallery.
 *
 * Uploading and publishing are two separate acts on purpose. An image is
 * uploaded into the media pipeline, attached to the gallery, and then published
 * — so a shoot can be prepared and revealed later, and a single image can be
 * taken off the public page without losing its caption or its position.
 *
 * The browser never builds a storage URL: it uploads through the existing
 * presigned-grant pipeline and renders the variants the server returns. Every
 * change invalidates both the owner's gallery query and the public storefront
 * queries, so the business's page reflects the edit without manual intervention.
 */
export function GalleryManager() {
  const queryClient = useQueryClient()
  const uploads = useMediaUpload(MEDIA_PURPOSE.businessGallery)
  const fileInput = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const gallery = useQuery({
    queryKey: ['media', 'gallery'],
    queryFn: () => mediaApi.gallery(),
  })
  const capacity = useQuery({
    queryKey: ['media', 'gallery', 'capacity'],
    queryFn: () => mediaApi.galleryCapacity(),
  })

  const entries = gallery.data ?? []
  const full = capacity.data?.remaining !== null && (capacity.data?.remaining ?? 1) <= 0

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ['media', 'gallery'] })
    // The public gallery is its own cache entry under the storefront prefix.
    void queryClient.invalidateQueries({ queryKey: ['storefront'] })
  }

  const attach = useMutation({
    mutationFn: (mediaId: string) => mediaApi.attachGallery(mediaId, { sortOrder: entries.length }),
    onSuccess: refresh,
    onError: (cause) => setError(errorMessage(cause, 'That image could not be added to the gallery.')),
  })

  const update = useMutation({
    mutationFn: (input: { mediaId: string; caption?: string; isVisible?: boolean; sortOrder?: number }) =>
      mediaApi.updateGalleryEntry(input.mediaId, {
        caption: input.caption,
        isVisible: input.isVisible,
        sortOrder: input.sortOrder,
      }),
    onSuccess: refresh,
    onError: (cause) => setError(errorMessage(cause, 'That change could not be saved.')),
  })

  const remove = useMutation({
    mutationFn: (mediaId: string) => mediaApi.detachGallery(mediaId),
    onSuccess: () => {
      toast('Image removed from the gallery.')
      refresh()
    },
    onError: (cause) => setError(errorMessage(cause, 'That image could not be removed.')),
  })

  async function onFiles(selected: FileList | null) {
    if (!selected || selected.length === 0) return
    setError(null)
    setNotice(null)

    for (const file of Array.from(selected)) {
      const key = `${file.name}:${file.size}:${file.lastModified}`
      const result = await uploads.upload(key, file)
      if (!result.ok) {
        setError(result.message)
        continue
      }

      if (!result.ready) {
        // The row exists but the worker has not produced variants yet, and the
        // gallery only accepts processed media. Say so rather than pretending.
        setNotice(`${file.name} is still processing. Try again in a moment.`)
        continue
      }

      attach.mutate(result.media.id)
    }

    if (fileInput.current) fileInput.current.value = ''
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= entries.length) return
    const entry = entries[index]
    // The server rewrites the whole dense order around the requested position.
    update.mutate({ mediaId: entry.mediaId, sortOrder: target })
  }

  return (
    <div>
      <PageHeader
        title="Gallery"
        description="Photos on your public page. Upload, caption, reorder, and choose what visitors can see."
        actions={
          <>
            <input
              ref={fileInput}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="sr-only"
              aria-label="Add photos"
              onChange={(event) => void onFiles(event.target.files)}
            />
            <Button
              variant="primary"
              onClick={() => fileInput.current?.click()}
              disabled={uploads.pending > 0 || full}
            >
              {uploads.pending > 0 ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <ImagePlus className="size-4" aria-hidden="true" />
              )}
              Add photos
            </Button>
          </>
        }
      />

      {error ? (
        <Alert tone="danger" className="mb-4" onDismiss={() => setError(null)}>
          {error}
        </Alert>
      ) : null}
      {notice ? (
        <Alert tone="info" className="mb-4" onDismiss={() => setNotice(null)}>
          {notice}
        </Alert>
      ) : null}

      <SectionCard
        title="Photos"
        description={
          capacity.data
            ? capacity.data.limit === null
              ? `${entries.length} in the gallery`
              : `${entries.length} of ${capacity.data.limit} used`
            : undefined
        }
        contentClassName="mt-3"
      >
        {gallery.isPending ? (
          <div className="grid gap-[0.8rem] sm:grid-cols-2" aria-busy="true" aria-live="polite">
            <span className="sr-only">Loading your gallery…</span>
            <Skeleton className="h-[9rem] rounded-card" />
            <Skeleton className="h-[9rem] rounded-card" />
          </div>
        ) : gallery.isError ? (
          <Alert tone="danger" title="Your gallery didn’t load">
            {errorMessage(gallery.error, 'Refresh the page to try again.')}
          </Alert>
        ) : entries.length === 0 ? (
          <EmptyState
            icon={<ImagePlus className="size-5" />}
            title="No photos yet"
            description="Add a few photos of your work. They appear on your public page as soon as you publish them."
          />
        ) : (
          <ul className="grid list-none gap-[0.9rem] p-0">
            {entries.map((entry, index) => (
              <GalleryRow
                key={entry.mediaId}
                entry={entry}
                index={index}
                total={entries.length}
                saving={update.isPending || remove.isPending}
                onCaption={(caption) => update.mutate({ mediaId: entry.mediaId, caption })}
                onVisibility={(isVisible) => update.mutate({ mediaId: entry.mediaId, isVisible })}
                onMove={(direction) => move(index, direction)}
                onRemove={() => remove.mutate(entry.mediaId)}
              />
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  )
}

type GalleryRowProps = {
  entry: BusinessMediaEntry
  index: number
  total: number
  saving: boolean
  onCaption: (caption: string) => void
  onVisibility: (isVisible: boolean) => void
  onMove: (direction: -1 | 1) => void
  onRemove: () => void
}

/** One gallery image: its thumbnail, caption, publication state and controls. */
function GalleryRow({
  entry,
  index,
  total,
  saving,
  onCaption,
  onVisibility,
  onMove,
  onRemove,
}: GalleryRowProps) {
  return (
    <li className="grid gap-[0.8rem] rounded-card border border-line p-[0.8rem] sm:grid-cols-[7rem_1fr]">
      <div className="overflow-hidden rounded-card bg-sunken">
        {entry.media && entry.media.variants.length > 0 ? (
          <ResponsiveImage
            variants={entry.media.variants}
            alt={entry.caption ?? ''}
            sizes="7rem"
            maxWidth={320}
            className="aspect-square size-full object-cover"
          />
        ) : (
          <span className="grid aspect-square place-items-center text-caption text-subtle">
            Processing
          </span>
        )}
      </div>

      <div className="min-w-0">
        <label className="label" htmlFor={`caption-${entry.mediaId}`}>
          Caption <span className="text-subtle">(optional)</span>
        </label>
        <input
          id={`caption-${entry.mediaId}`}
          className="input"
          type="text"
          maxLength={200}
          defaultValue={entry.caption ?? ''}
          placeholder="A short description of this photo"
          // Saved on blur: typing must not fire a request per keystroke.
          onBlur={(event) => {
            const next = event.target.value
            if (next === (entry.caption ?? '')) return
            onCaption(next)
          }}
        />

        <div className="mt-[0.7rem] flex flex-wrap items-center gap-[0.6rem]">
          <Switch
            label={
              entry.isVisible
                ? `Hide photo ${index + 1} from the public page`
                : `Publish photo ${index + 1}`
            }
            checked={entry.isVisible}
            disabled={saving}
            onCheckedChange={onVisibility}
          />
          <span
            className={cn(
              'inline-flex items-center gap-[0.25rem] text-caption',
              entry.isVisible ? 'text-success-ink' : 'text-subtle',
            )}
          >
            {entry.isVisible ? (
              <Eye className="size-3.5" aria-hidden="true" />
            ) : (
              <EyeOff className="size-3.5" aria-hidden="true" />
            )}
            {entry.isVisible ? 'Published' : 'Hidden'}
          </span>

          <span className="ml-auto flex items-center gap-[0.3rem]">
            <Button
              variant="ghost"
              size="sm"
              aria-label={`Move photo ${index + 1} earlier`}
              disabled={index === 0 || saving}
              onClick={() => onMove(-1)}
            >
              <ArrowUp className="size-4" aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              aria-label={`Move photo ${index + 1} later`}
              disabled={index === total - 1 || saving}
              onClick={() => onMove(1)}
            >
              <ArrowDown className="size-4" aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              aria-label={`Remove photo ${index + 1}`}
              disabled={saving}
              onClick={onRemove}
            >
              <Trash2 className="size-4" aria-hidden="true" />
            </Button>
          </span>
        </div>
      </div>
    </li>
  )
}
