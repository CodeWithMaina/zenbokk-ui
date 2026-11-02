import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { errorMessage } from '../../lib/api/client'
import { clamp } from '../../lib/format'
import { useDebouncedValue } from '../../lib/hooks/use-debounced-value'
import { rewardSummary } from '../../lib/loyalty/mappers'
import { useCardDesignPreview, useCardDesigns, useChangeCardDesign } from '../../lib/loyalty'
import type { AvailableCardDesign, LoyaltyProgram } from '../../lib/loyalty/types'
import { Alert } from '../ui/alert'
import { Button } from '../ui/button'
import { Drawer } from '../ui/drawer'
import { LoyaltyCardGallery } from './LoyaltyCardGallery'
import { LoyaltyCardRenderer } from './LoyaltyCardRenderer'

export type ChangeLoyaltyDesignDrawerProps = {
  open: boolean
  onClose: () => void
  program: LoyaltyProgram
}

/**
 * Change a program's card design.
 *
 * The available designs, the preview and the applied result all come from the
 * API; applying persists the selection and the program's cached card markup is
 * invalidated, so the listing and the details card update immediately.
 */
export function ChangeLoyaltyDesignDrawer({
  open,
  onClose,
  program,
}: ChangeLoyaltyDesignDrawerProps) {
  const designsQuery = useCardDesigns(open)

  const designs = useMemo(() => designsQuery.data ?? [], [designsQuery.data])
  const defaultDesignId = useMemo(
    () => designs.find((design) => design.isDefault)?.id ?? null,
    [designs],
  )

  // The selection starts on the program's current design and falls back to the
  // platform default. Mounting fresh each time the drawer opens (the caller
  // keys it) means no reset effect is needed.
  const [selectedId, setSelectedId] = useState<string | null>(program.cardDesignId)
  const [serverError, setServerError] = useState<string | null>(null)

  // Fall back to the platform default design when the program uses no design.
  const effectiveId = selectedId ?? defaultDesignId
  const selectedDesign = designs.find((design) => design.id === effectiveId) ?? null

  const totalStamps = clamp(program.stampsRequired, 1, 100)
  const request = useMemo(
    () => ({
      cardDesignId: effectiveId,
      programName: program.name,
      rewardName: rewardSummary(program),
      totalStamps,
      completedStamps: Math.min(clamp(program.defaultEnrollmentStamps, 0, 100), totalStamps),
    }),
    [effectiveId, program, totalStamps],
  )
  const debounced = useDebouncedValue(request, 400)
  const preview = useCardDesignPreview(debounced, open && Boolean(effectiveId))
  const previewHtml = preview.data?.renderedHtml ?? selectedDesign?.previewHtml ?? null

  const mutation = useChangeCardDesign(program.id)
  const unchanged = (program.cardDesignId ?? null) === (effectiveId ?? null)

  const apply = () => {
    if (!effectiveId || unchanged) {
      onClose()
      return
    }
    setServerError(null)
    mutation.mutate(
      { cardDesignId: effectiveId },
      {
        onSuccess: () => {
          toast.success('Card design updated')
          onClose()
        },
        onError: (error) => setServerError(errorMessage(error)),
      },
    )
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Change design"
      description={program.name}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} className="max-sm:hidden">
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={apply}
            disabled={mutation.isPending || designsQuery.isPending}
            className="max-sm:flex-1"
          >
            {mutation.isPending ? 'Applying…' : 'Apply design'}
          </Button>
        </>
      }
    >
      <div className="mb-[1.4rem]">
        <LoyaltyCardRenderer
          html={previewHtml}
          designName={selectedDesign?.name}
          label="Card preview"
          values={{
            programName: program.name,
            rewardName: rewardSummary(program),
            stampsRequired: totalStamps,
            stampsCollected: Math.min(
              clamp(program.defaultEnrollmentStamps, 0, 100),
              totalStamps,
            ),
          }}
        />
      </div>

      {serverError ? (
        <Alert tone="danger" title="Design not updated" className="mb-[1rem]">
          {serverError}
        </Alert>
      ) : null}

      <LoyaltyCardGallery
        designs={designs}
        selectedId={effectiveId}
        onSelect={(design: AvailableCardDesign) => setSelectedId(design.id)}
        name="lp-change-design"
        loading={designsQuery.isPending}
        error={designsQuery.error}
        onRetry={() => void designsQuery.refetch()}
      />
    </Drawer>
  )
}
