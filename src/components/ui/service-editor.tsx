import { useId, useState } from 'react'
import type { FormEvent } from 'react'
import { formatDuration } from '../../lib/format'
import { cn } from '../../lib/cn'
import { Button } from './button'
import { Field, FormGrid, Input, InputWithPrefix, Textarea } from './field'
import { OptionRow } from './option-row'
import { PhotoUploader } from './photo-uploader'
import type { PhotoUploaderPhoto } from './photo-uploader'
import { QuickChoices } from './quick-choices'
import { ServiceCard } from './service-card'

export type ServiceEditorValue = {
  name?: string
  description?: string
  duration?: number | string
  price?: number | string
  images?: readonly PhotoUploaderPhoto[]
  visible?: boolean
}

export type ServiceEditorResult = {
  name: string
  description: string
  duration: number
  price: number
  images: PhotoUploaderPhoto[]
  visible: boolean
}

export type ServiceEditorProps = {
  initialValue?: ServiceEditorValue
  onSubmit: (service: ServiceEditorResult) => void
  onCancel?: () => void
  currency?: string
  submitLabel?: string
  cancelLabel?: string
  /** Hide the live `ServiceCard` preview on narrow layouts. */
  showPreview?: boolean
  busy?: boolean
  className?: string
  formClassName?: string
}

type Draft = {
  name: string
  description: string
  duration: string
  price: string
  images: PhotoUploaderPhoto[]
  visible: boolean
}

type DraftErrors = {
  name?: string
  duration?: string
  price?: string
}

const durationPresets = [30, 45, 60, 90, 120] as const

function createDraft(value?: ServiceEditorValue): Draft {
  return {
    name: value?.name ?? '',
    description: value?.description ?? '',
    duration: value?.duration === undefined ? '60' : String(value.duration),
    price: value?.price === undefined ? '' : String(value.price),
    images: value?.images ? [...value.images] : [],
    visible: value?.visible ?? true,
  }
}

/**
 * Create/edit service form from the Services design: photos, copy, duration,
 * price, storefront visibility and a live card preview.
 */
export function ServiceEditor({
  initialValue,
  onSubmit,
  onCancel,
  currency = 'KES',
  submitLabel = 'Save service',
  cancelLabel = 'Cancel',
  showPreview = true,
  busy = false,
  className,
  formClassName,
}: ServiceEditorProps) {
  const fieldId = useId()
  const nameId = `${fieldId}-name`
  const descriptionId = `${fieldId}-description`
  const durationId = `${fieldId}-duration`
  const priceId = `${fieldId}-price`

  const [draft, setDraft] = useState<Draft>(() => createDraft(initialValue))
  const [errors, setErrors] = useState<DraftErrors>({})
  const [uploadError, setUploadError] = useState<string | null>(null)

  function update<K extends keyof Draft>(key: K, next: Draft[K]) {
    setDraft((current) => ({ ...current, [key]: next }))
  }

  function clearError(key: keyof DraftErrors) {
    setErrors((current) => {
      if (!current[key]) return current
      const next = { ...current }
      delete next[key]
      return next
    })
  }

  const numericDuration = Number(draft.duration)
  const numericPrice = Number(draft.price)
  const durationPreset =
    Number.isFinite(numericDuration) && numericDuration > 0
      ? numericDuration
      : null

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (busy) return

    const nextErrors: DraftErrors = {}
    if (!draft.name.trim()) nextErrors.name = 'Give the service a name.'
    if (!Number.isFinite(numericDuration) || numericDuration <= 0) {
      nextErrors.duration = 'Enter a duration.'
    }
    if (
      draft.price.trim() === '' ||
      !Number.isFinite(numericPrice) ||
      numericPrice < 0
    ) {
      nextErrors.price = 'Enter a price (0 for free).'
    }

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    onSubmit({
      name: draft.name.trim(),
      description: draft.description.trim(),
      duration: numericDuration,
      price: numericPrice,
      images: [...draft.images],
      visible: draft.visible,
    })
  }


  return (
    <div
      className={cn(
        'grid gap-[1.2rem]',
        showPreview && 'xl:grid-cols-[minmax(0,1fr)_16rem] xl:items-start',
        className,
      )}
    >
      <form
        onSubmit={handleSubmit}
        noValidate
        className={cn('card p-[1.1rem]', formClassName)}
      >
        <div className="flex flex-col gap-[1rem]">
          <PhotoUploader
            value={draft.images}
            onChange={(images) => {
              update('images', images)
              setUploadError(null)
            }}
            error={uploadError}
            onError={setUploadError}
            hint="Up to 3 photos. The first one is the cover."
          />

          <Field label="Name" htmlFor={nameId} error={errors.name}>
            <Input
              id={nameId}
              value={draft.name}
              maxLength={80}
              autoComplete="off"
              invalid={Boolean(errors.name)}
              placeholder="e.g. Signature Facial"
              onChange={(event) => {
                update('name', event.target.value)
                clearError('name')
              }}
            />
          </Field>

          <Field
            label="Description"
            htmlFor={descriptionId}
            optional
          >
            <Textarea
              id={descriptionId}
              value={draft.description}
              maxLength={240}
              rows={3}
              placeholder="What is included, and who is it for?"
              onChange={(event) => update('description', event.target.value)}
            />
          </Field>

          <FormGrid>
            <Field label="Duration (min)" htmlFor={durationId} error={errors.duration}>
              <Input
                id={durationId}
                type="number"
                min={5}
                step={5}
                inputMode="numeric"
                value={draft.duration}
                invalid={Boolean(errors.duration)}
                onChange={(event) => {
                  update('duration', event.target.value)
                  clearError('duration')
                }}
              />
              <QuickChoices
                options={durationPresets.map((value) => ({
                  value,
                  label: formatDuration(value),
                }))}
                value={durationPreset}
                onChange={(value) => {
                  update('duration', String(value))
                  clearError('duration')
                }}
                label="Common durations"
              />
            </Field>

            <Field label="Price" htmlFor={priceId} error={errors.price}>
              <InputWithPrefix
                id={priceId}
                prefix={currency}
                type="number"
                min={0}
                step={50}
                inputMode="numeric"
                value={draft.price}
                placeholder="0"
                invalid={Boolean(errors.price)}
                onChange={(event) => {
                  update('price', event.target.value)
                  clearError('price')
                }}
              />
            </Field>
          </FormGrid>

          <OptionRow
            title="Show on storefront"
            description="Clients can find and book this service."
            selected={draft.visible}
            disabled={busy}
            onSelectedChange={(selected) => update('visible', selected)}
          />

          <div className="flex flex-wrap justify-end gap-[0.5rem] border-t border-line pt-[1rem]">
            {onCancel ? (
              <Button onClick={onCancel} disabled={busy} className="max-sm:flex-1">
                {cancelLabel}
              </Button>
            ) : null}
            <Button
              type="submit"
              variant="primary"
              disabled={busy}
              className="max-sm:flex-1"
            >
              {busy ? 'Saving…' : submitLabel}
            </Button>
          </div>
        </div>
      </form>

      {showPreview ? (
        <aside className="min-w-0 xl:sticky xl:top-[1rem]">
          <p className="label">Preview</p>
          <ServiceCard
            service={{
              id: 'service-preview',
              name: draft.name.trim() || 'Service name',
              duration: Number.isFinite(numericDuration) ? numericDuration : 0,
              price: Number.isFinite(numericPrice) ? numericPrice : 0,
              image: draft.images[0]?.src,
              currency,
            }}
            className="max-w-[16rem]"
          />
          <p className="mt-[0.5rem] text-caption text-muted">
            The cover photo and pricing update as you type.
          </p>
        </aside>
      ) : null}
    </div>
  )
}
