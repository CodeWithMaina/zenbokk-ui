import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { errorMessage } from '../../lib/api/client'
import { clamp } from '../../lib/format'
import { useDebouncedValue } from '../../lib/hooks/use-debounced-value'
import { emptyProgramDraft } from '../../lib/loyalty/mappers'
import { useCardDesignPreview, useCardDesigns, useCreateProgram } from '../../lib/loyalty'
import type {
  AvailableCardDesign,
  CreateLoyaltyProgramRequest,
  LoyaltyProgram,
  LoyaltyProgramDraft,
} from '../../lib/loyalty/types'
import { Alert } from '../ui/alert'
import { Button } from '../ui/button'
import { Drawer } from '../ui/drawer'
import { LoyaltyCardGallery } from './LoyaltyCardGallery'
import { LoyaltyCardRenderer } from './LoyaltyCardRenderer'
import { LoyaltyProgramForm } from './LoyaltyProgramForm'
import type { LoyaltyProgramFormErrors } from './LoyaltyProgramForm'

export type CreateLoyaltyProgramDrawerProps = {
  open: boolean
  onClose: () => void
  /** Called with the persisted program so the page can navigate to it. */
  onCreated?: (program: LoyaltyProgram) => void
  /** Existing program names, for the "name already taken" check. */
  existingNames?: readonly string[]
  businessName?: string
}

/**
 * The creation drawer.
 *
 * Everything here is real: the card designs come from the API, the live preview
 * is rendered by the backend through the same pipeline a customer sees, and
 * "Save as draft" / "Launch program" both persist. A network failure keeps the
 * form intact and shows the server's message rather than pretending to succeed.
 */
export function CreateLoyaltyProgramDrawer({
  open,
  onClose,
  onCreated,
  existingNames = [],
  businessName,
}: CreateLoyaltyProgramDrawerProps) {
  const [draft, setDraft] = useState<LoyaltyProgramDraft>(emptyProgramDraft)
  const [errors, setErrors] = useState<LoyaltyProgramFormErrors>({})
  const [serverError, setServerError] = useState<string | null>(null)

  const designsQuery = useCardDesigns(open)
  const designs = designsQuery.data ?? []

  const patch = (changes: Partial<LoyaltyProgramDraft>) => {
    setDraft((current) => ({ ...current, ...changes }))
  }

  // The platform default is pre-selected so the preview always has a design.
  const effectiveDesignId =
    draft.cardDesignId ??
    designs.find((design) => design.isDefault)?.id ??
    designs[0]?.id ??
    null
  const selectedDesign = designs.find((design) => design.id === effectiveDesignId) ?? null

  const totalStamps = clamp(Math.floor(draft.stampsRequired || 1), 1, 100)
  const welcomeStamps = clamp(Math.floor(draft.defaultEnrollmentStamps || 0), 0, 100)

  const previewRequest = useMemo(
    () => ({
      cardDesignId: effectiveDesignId,
      programName: draft.name.trim() || 'Your program',
      rewardName: draft.rewardDescription.trim() || 'Your reward',
      businessName,
      totalStamps,
      completedStamps: Math.min(welcomeStamps, totalStamps),
    }),
    [
      effectiveDesignId,
      draft.name,
      draft.rewardDescription,
      businessName,
      totalStamps,
      welcomeStamps,
    ],
  )

  const debouncedRequest = useDebouncedValue(previewRequest, 450)
  const preview = useCardDesignPreview(debouncedRequest, open && Boolean(effectiveDesignId))
  const previewHtml = preview.data?.renderedHtml ?? selectedDesign?.previewHtml ?? null

  const validate = (launching: boolean): LoyaltyProgramFormErrors => {
    const next: LoyaltyProgramFormErrors = {}
    const name = draft.name.trim()

    if (!name) next.name = 'Give your program a name.'
    else if (existingNames.some((existing) => existing.toLowerCase() === name.toLowerCase()))
      next.name = 'A program with this name already exists.'

    if (!(draft.stampsRequired >= 1 && draft.stampsRequired <= 100))
      next.stampsRequired = 'Enter between 1 and 100 stamps.'
    else if (draft.defaultEnrollmentStamps >= draft.stampsRequired)
      next.defaultEnrollmentStamps = 'Welcome stamps must be fewer than stamps required.'

    if (draft.startDate && draft.endDate && draft.endDate <= draft.startDate)
      next.endDate = 'End date must be after the start date.'

    if (launching && !draft.rewardDescription.trim())
      next.rewardDescription = 'Add a reward before launching.'

    return next
  }

  const mutation = useCreateProgram()

  const reset = () => {
    setDraft(emptyProgramDraft())
    setErrors({})
    setServerError(null)
  }

  const close = () => {
    if (mutation.isPending) return
    reset()
    onClose()
  }

  const submit = (asDraft: boolean) => {
    const nextErrors = validate(!asDraft)
    setErrors(nextErrors)
    setServerError(null)
    if (Object.keys(nextErrors).length > 0) return

    const payload: CreateLoyaltyProgramRequest = {
      name: draft.name.trim(),
      description: draft.description.trim() || null,
      stampsRequired: totalStamps,
      rewardValue: Math.max(0, Math.floor(draft.rewardValue || 0)),
      rewardDescription: draft.rewardDescription.trim(),
      defaultEnrollmentStamps: welcomeStamps,
      programType: draft.programType,
      startsAt: draft.startDate ? `${draft.startDate}T00:00:00+03:00` : null,
      endsAt: draft.endDate ? `${draft.endDate}T23:59:59+03:00` : null,
      cardDesignId: effectiveDesignId,
    }

    mutation.mutate(
      { payload, draft: asDraft },
      {
        onSuccess: (program) => {
          toast.success(
            asDraft ? `${program.name} saved as draft` : `${program.name} launched`,
          )
          reset()
          onCreated?.(program)
          onClose()
        },
        onError: (error) => setServerError(errorMessage(error)),
      },
    )
  }

  const selectDesign = (design: AvailableCardDesign) => patch({ cardDesignId: design.id })

  const previewPane = (
    <div className="w-full max-w-[380px]">
      <LoyaltyCardRenderer
        html={previewHtml}
        designName={selectedDesign?.name}
        label="Card preview"
        values={{
          businessName,
          programName: draft.name || 'Your program',
          rewardName: draft.rewardDescription || 'Your reward',
          stampsRequired: totalStamps,
          stampsCollected: Math.min(welcomeStamps, totalStamps),
        }}
      />
      <p className="eyebrow mt-[1rem] text-center">Live preview</p>
    </div>
  )

  return (
    <Drawer
      open={open}
      onClose={close}
      title="New program"
      description="Set up how customers earn stamps and what they get."
      className="min-[1020px]:w-[min(64rem,100%)]"
      bodyClassName="p-0"
      footer={
        <>
          <Button
            variant="ghost"
            onClick={close}
            disabled={mutation.isPending}
            className="max-sm:hidden"
          >
            Cancel
          </Button>
          <div className="flex flex-1 flex-wrap items-center justify-end gap-[0.6rem] max-sm:grid max-sm:grid-cols-2">
            <Button onClick={() => submit(true)} disabled={mutation.isPending}>
              Save as draft
            </Button>
            <Button variant="primary" onClick={() => submit(false)} disabled={mutation.isPending}>
              {mutation.isPending ? 'Working…' : 'Launch program'}
            </Button>
          </div>
        </>
      }
    >
      <div className="grid min-[1020px]:grid-cols-[minmax(0,1fr)_26rem]">
        <div className="min-w-0 p-[1rem_1.2rem]">
          {serverError ? (
            <Alert tone="danger" title="Program not saved" className="mb-[1rem]">
              {serverError}
            </Alert>
          ) : null}

          {designsQuery.isError ? (
            <Alert tone="warning" title="Card designs could not be loaded" className="mb-[1rem]">
              The platform default card will be used. {errorMessage(designsQuery.error)}
            </Alert>
          ) : null}

          <div className="mb-[1.2rem] min-[1020px]:hidden">{previewPane}</div>

          <LoyaltyProgramForm
            value={draft}
            onChange={patch}
            errors={errors}
            disabled={mutation.isPending}
            designSlot={
              <LoyaltyCardGallery
                designs={designs}
                selectedId={effectiveDesignId}
                onSelect={selectDesign}
                name="lp-create-design"
                loading={designsQuery.isPending}
                error={designsQuery.error}
                onRetry={() => void designsQuery.refetch()}
              />
            }
          />
        </div>

        <aside className="hidden min-[1020px]:flex min-[1020px]:flex-col min-[1020px]:items-center min-[1020px]:justify-center min-[1020px]:gap-[1rem] min-[1020px]:border-l min-[1020px]:border-line min-[1020px]:bg-hover min-[1020px]:p-[2rem]">
          {previewPane}
        </aside>
      </div>
    </Drawer>
  )
}
