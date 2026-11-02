import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Alert } from '../ui/alert'
import { Button } from '../ui/button'
import { Field, FormGrid, Input, InputWithPrefix, Textarea } from '../ui/field'
import { OptionRow } from '../ui/option-row'
import { QuickChoices } from '../ui/quick-choices'
import { formatDuration } from '../../lib/format'
import { serviceDurationLabel } from '../../lib/services'
import type { Service } from '../../lib/services'
import { hasPendingPhoto, serviceFormSchema, serviceMediaIds } from '../../lib/validation/service'
import type { ServiceFormValues } from '../../lib/validation/service'
import { ServiceImageUploader, draftImageUrl } from './ServiceImageUploader'
import type { ServiceImageDraft } from './ServiceImageUploader'
import { ServicePreview } from './ServicePreview'

export type ServiceFormResult = {
  name: string
  description: string | null
  durationMinutes: number
  price: number
  showcase: boolean
  /** Ordered media ids — index 0 is the cover. */
  mediaIds: string[]
}

export type ServiceFormProps = {
  mode: 'create' | 'edit'
  /** The service being edited, used to prefill every field. */
  service?: Service
  onSubmit: (result: ServiceFormResult) => void | Promise<void>
  onCancel: () => void
  /** True while the save request is in flight. */
  busy?: boolean
  /** Server-side failure (validation or otherwise), shown above the fields. */
  error?: string | null
  className?: string
}

const durationPresets = [30, 45, 60, 90, 120] as const

/** The ordered photo slots from an existing service, so an edit starts filled. */
function photosFrom(service?: Service): ServiceImageDraft[] {
  if (!service) return []
  return service.images.map((image) => ({
    key: `saved-${image.mediaId}`,
    mediaId: image.mediaId,
    url: image.url ?? undefined,
    // Carry the variants so the preview renders the right size and format.
    variants: image.variants,
  }))
}

/**
 * Create/edit service form from the design: photos, copy, duration, price,
 * storefront visibility, a live card preview and a phone-sized action bar.
 *
 * Validation runs twice on purpose — zod catches what the browser can know, and
 * the API's own validator is the authority; a rejected save renders the server's
 * message rather than pretending the input was fine.
 */
export function ServiceForm({
  mode,
  service,
  onSubmit,
  onCancel,
  busy = false,
  error,
  className,
}: ServiceFormProps) {
  const [photos, setPhotos] = useState<ServiceImageDraft[]>(() => photosFrom(service))
  const [photoError, setPhotoError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: {
      name: service?.name ?? '',
      description: service?.description ?? '',
      durationMinutes: service?.durationMinutes ?? 60,
      price: service?.price ?? undefined,
      showcase: service?.showcase ?? true,
    },
  })

  // A different service (or a fresh create) resets the slot model, which lives
  // outside RHF because an upload is a process, not a form value.
  useEffect(() => {
    setPhotos(photosFrom(service))
    setPhotoError(null)
  }, [service])

  const values = watch()
  const duration = Number(values.durationMinutes)
  const price = Number(values.price)
  const pendingPhoto = hasPendingPhoto(photos)

  const submit = handleSubmit(async (formValues) => {
    if (pendingPhoto) {
      setPhotoError('Wait for every photo to finish uploading before saving.')
      return
    }
    setPhotoError(null)

    await onSubmit({
      name: formValues.name.trim(),
      description: formValues.description?.trim() ? formValues.description.trim() : null,
      durationMinutes: Number(formValues.durationMinutes),
      price: Number(formValues.price),
      showcase: Boolean(formValues.showcase),
      mediaIds: serviceMediaIds(photos),
    })
  })

  return (
    <div className={className}>
      <form
        noValidate
        onSubmit={submit}
        className="grid gap-[1.4rem] lg:grid-cols-[minmax(0,36rem)_17rem] lg:items-start lg:gap-[2.4rem]"
      >
        <div className="card p-[1.1rem]">
          {error ? (
            <Alert tone="danger" title="The service could not be saved" className="mb-[1.1rem]">
              {error}
            </Alert>
          ) : null}

          <ServiceImageUploader
            value={photos}
            onChange={(next) => {
              setPhotos(next)
              setPhotoError(null)
            }}
            error={photoError ?? undefined}
            onError={(message) => setPhotoError(message)}
            disabled={busy}
            className="mb-[1.2rem]"
          />

          <Field
            label="Name"
            htmlFor="service-name"
            error={errors.name?.message}
            className="mb-[1.2rem]"
          >
            <Input
              id="service-name"
              autoComplete="off"
              maxLength={120}
              placeholder="Creative Colour"
              invalid={Boolean(errors.name)}
              {...register('name')}
            />
          </Field>

          <Field
            label="Description"
            htmlFor="service-description"
            optional
            error={errors.description?.message}
            className="mb-[1.2rem]"
          >
            <Textarea
              id="service-description"
              rows={3}
              maxLength={500}
              placeholder="What is included, and who is it for?"
              invalid={Boolean(errors.description)}
              {...register('description')}
            />
          </Field>

          <FormGrid className="mb-[1.2rem]">
            <Field
              label="Duration (min)"
              htmlFor="service-duration"
              error={errors.durationMinutes?.message}
            >
              <Input
                id="service-duration"
                type="number"
                inputMode="numeric"
                min={5}
                step={5}
                invalid={Boolean(errors.durationMinutes)}
                {...register('durationMinutes', { valueAsNumber: true })}
              />
              <QuickChoices
                label="Common durations"
                options={durationPresets.map((value) => ({ value, label: formatDuration(value) }))}
                value={Number.isFinite(duration) && duration > 0 ? duration : null}
                onChange={(value) =>
                  setValue('durationMinutes', value, { shouldValidate: true, shouldDirty: true })
                }
              />
            </Field>

            <Field label="Price" htmlFor="service-price" error={errors.price?.message}>
              <InputWithPrefix
                id="service-price"
                prefix="KES"
                type="number"
                inputMode="numeric"
                min={0}
                step={50}
                placeholder="0"
                invalid={Boolean(errors.price)}
                {...register('price', { valueAsNumber: true })}
              />
            </Field>
          </FormGrid>

          <OptionRow
            title="Show on storefront"
            description="Clients can find and book this service."
            selected={Boolean(values.showcase)}
            disabled={busy}
            onSelectedChange={(selected) => setValue('showcase', selected, { shouldDirty: true })}
          />

          {/* Phone action bar: fixed to the bottom, matching the design. */}
          <div className="mt-[1.2rem] flex gap-[0.6rem] max-sm:fixed max-sm:inset-x-0 max-sm:bottom-0 max-sm:z-30 max-sm:mt-0 max-sm:border-t max-sm:border-line max-sm:bg-surface/95 max-sm:px-4 max-sm:py-[0.6rem] max-sm:pb-[calc(0.6rem+env(safe-area-inset-bottom))] max-sm:backdrop-blur sm:justify-end">
            <Button onClick={onCancel} disabled={busy} className="max-sm:flex-1 sm:min-w-[7rem]">
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={busy || isSubmitting || pendingPhoto}
              className="max-sm:flex-1 sm:min-w-[9rem]"
            >
              {busy || isSubmitting
                ? 'Saving…'
                : mode === 'create'
                  ? 'Create service'
                  : 'Save changes'}
            </Button>
          </div>
        </div>

        <ServicePreview
          className="hidden lg:sticky lg:top-[1.5rem] lg:block"
          name={values.name ?? ''}
          duration={Number.isFinite(duration) ? duration : 0}
          price={Number.isFinite(price) ? price : 0}
          image={draftImageUrl(photos[0])}
          status={service?.status ?? 'active'}
        />
      </form>

      {/* On phones the preview is hidden, so the duration is stated inline. */}
      <p className="mt-[0.8rem] text-caption text-muted lg:hidden">
        {serviceDurationLabel(Number.isFinite(duration) && duration > 0 ? duration : 0)} · the first
        photo is the cover.
      </p>
    </div>
  )
}
