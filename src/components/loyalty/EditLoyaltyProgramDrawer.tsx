import { useState } from 'react'
import { toast } from 'sonner'
import { errorMessage } from '../../lib/api/client'
import { toDateInputValue } from '../../lib/format'
import { PROGRAM_TYPE_OPTIONS } from '../../lib/loyalty/mappers'
import { useUpdateProgram } from '../../lib/loyalty'
import type { LoyaltyProgram, LoyaltyProgramDraft, ProgramType } from '../../lib/loyalty/types'
import { Alert } from '../ui/alert'
import { Button } from '../ui/button'
import { Drawer } from '../ui/drawer'
import { LoyaltyProgramForm } from './LoyaltyProgramForm'
import type { LoyaltyProgramFormErrors } from './LoyaltyProgramForm'

export type EditLoyaltyProgramDrawerProps = {
  open: boolean
  onClose: () => void
  program: LoyaltyProgram
  /** Other program names, for the "name already taken" check. */
  existingNames?: readonly string[]
}

function isProgramType(value: string): value is ProgramType {
  return PROGRAM_TYPE_OPTIONS.some((option) => option.value === value)
}

/** Seed the form from the persisted program. */
function draftFromProgram(program: LoyaltyProgram): LoyaltyProgramDraft {
  return {
    name: program.name,
    description: program.description ?? '',
    programType: isProgramType(program.programType) ? program.programType : 'stamp',
    startDate: program.startsAt ? toDateInputValue(new Date(program.startsAt)) : '',
    endDate: program.endsAt ? toDateInputValue(new Date(program.endsAt)) : '',
    stampsRequired: program.stampsRequired,
    defaultEnrollmentStamps: program.defaultEnrollmentStamps,
    rewardDescription: program.rewardDescription,
    rewardValue: program.rewardValue,
    cardDesignId: program.cardDesignId,
  }
}

/**
 * Edit a program's configuration.
 *
 * Uses the same form as creation and PATCHes only what the endpoint accepts.
 * One backend rule is surfaced rather than hidden: `UpdateLoyaltyProgramRequest`
 * applies a schedule date when one is present but cannot remove one, so clearing
 * an existing date is reported as a validation message instead of silently
 * appearing to work.
 */
export function EditLoyaltyProgramDrawer({
  open,
  onClose,
  program,
  existingNames = [],
}: EditLoyaltyProgramDrawerProps) {
  const [draft, setDraft] = useState<LoyaltyProgramDraft>(() => draftFromProgram(program))
  const [errors, setErrors] = useState<LoyaltyProgramFormErrors>({})
  const [serverError, setServerError] = useState<string | null>(null)

  const mutation = useUpdateProgram(program.id)

  const patch = (changes: Partial<LoyaltyProgramDraft>) => {
    setDraft((current) => ({ ...current, ...changes }))
  }

  const validate = (): LoyaltyProgramFormErrors => {
    const next: LoyaltyProgramFormErrors = {}
    const name = draft.name.trim()

    if (!name) next.name = 'Give your program a name.'
    else if (
      existingNames.some((existing) => existing.toLowerCase() === name.toLowerCase())
    )
      next.name = 'A program with this name already exists.'

    if (!(draft.stampsRequired >= 1 && draft.stampsRequired <= 100))
      next.stampsRequired = 'Enter between 1 and 100 stamps.'
    else if (draft.defaultEnrollmentStamps >= draft.stampsRequired)
      next.defaultEnrollmentStamps = 'Welcome stamps must be fewer than stamps required.'

    if (draft.startDate && draft.endDate && draft.endDate <= draft.startDate)
      next.endDate = 'End date must be after the start date.'

    if (program.startsAt && !draft.startDate)
      next.startDate = 'A start date can be changed but not removed.'
    if (program.endsAt && !draft.endDate)
      next.endDate = 'An end date can be changed but not removed.'

    if (!draft.rewardDescription.trim()) next.rewardDescription = 'Add a reward.'

    return next
  }

  const submit = () => {
    const nextErrors = validate()
    setErrors(nextErrors)
    setServerError(null)
    if (Object.keys(nextErrors).length > 0) return

    mutation.mutate(
      {
        name: draft.name.trim(),
        description: draft.description.trim() || null,
        stampsRequired: draft.stampsRequired,
        rewardValue: Math.max(0, Math.floor(draft.rewardValue || 0)),
        rewardDescription: draft.rewardDescription.trim(),
        defaultEnrollmentStamps: draft.defaultEnrollmentStamps,
        programType: draft.programType,
        startsAt: draft.startDate ? `${draft.startDate}T00:00:00+03:00` : undefined,
        endsAt: draft.endDate ? `${draft.endDate}T23:59:59+03:00` : undefined,
      },
      {
        onSuccess: () => {
          toast.success('Program updated')
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
      title="Edit program"
      description={program.name}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={mutation.isPending} className="max-sm:hidden">
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={submit}
            disabled={mutation.isPending}
            className="max-sm:flex-1"
          >
            {mutation.isPending ? 'Saving…' : 'Save changes'}
          </Button>
        </>
      }
    >
      {serverError ? (
        <Alert tone="danger" title="Changes not saved" className="mb-[1rem]">
          {serverError}
        </Alert>
      ) : null}

      <LoyaltyProgramForm
        value={draft}
        onChange={patch}
        errors={errors}
        disabled={mutation.isPending}
      />
    </Drawer>
  )
}
