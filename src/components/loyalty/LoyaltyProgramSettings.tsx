import { useState } from 'react'
import { toast } from 'sonner'
import { errorMessage } from '../../lib/api/client'
import { normalizeProgramStatus, programStatusHint } from '../../lib/loyalty/mappers'
import { useProgramLifecycle } from '../../lib/loyalty'
import type { LoyaltyProgram } from '../../lib/loyalty/types'
import { Alert } from '../ui/alert'
import { Button } from '../ui/button'
import { Switch } from '../ui/switch'
import { EditLoyaltyProgramDrawer } from './EditLoyaltyProgramDrawer'
import { ProgramConfirmationDialog } from './ProgramConfirmationDialog'

export type LoyaltyProgramSettingsProps = {
  program: LoyaltyProgram
  /** Opens the change-design drawer. */
  onChangeDesign: () => void
  /** Called after a duplicate is created, with the new program. */
  onDuplicated: (program: LoyaltyProgram) => void
  /** Called after the program is archived or deleted (navigate back to the list). */
  onRemoved: () => void
}

/**
 * The Settings tab.
 *
 * Every control has a real effect and a real endpoint: the switch activates or
 * pauses, Change design opens the design drawer, Duplicate, Archive and Delete
 * call their own routes behind a confirmation. Archived and deleted programs
 * leave the list, so the page returns to it.
 */
export function LoyaltyProgramSettings({
  program,
  onChangeDesign,
  onDuplicated,
  onRemoved,
}: LoyaltyProgramSettingsProps) {
  const { setStatus, duplicate, remove } = useProgramLifecycle()
  const [confirm, setConfirm] = useState<'archive' | 'delete' | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const status = normalizeProgramStatus(program.status)
  const active = status === 'active'
  const busy = setStatus.isPending || duplicate.isPending || remove.isPending

  const toggleActive = (next: boolean) => {
    setError(null)
    setStatus.mutate(
      { programId: program.id, action: next ? 'activate' : 'pause' },
      {
        onSuccess: () => toast.success(next ? 'Program activated' : 'Program paused'),
        onError: (mutationError) => setError(errorMessage(mutationError)),
      },
    )
  }

  const onDuplicate = () => {
    setError(null)
    duplicate.mutate(
      { programId: program.id, newName: `${program.name} (copy)` },
      {
        onSuccess: (created) => {
          toast.success('Program duplicated')
          onDuplicated(created)
        },
        onError: (mutationError) => setError(errorMessage(mutationError)),
      },
    )
  }

  const onArchive = () => {
    setError(null)
    setStatus.mutate(
      { programId: program.id, action: 'archive' },
      {
        onSuccess: () => {
          toast.success(`${program.name} archived`)
          setConfirm(null)
          onRemoved()
        },
        onError: (mutationError) => {
          setError(errorMessage(mutationError))
          setConfirm(null)
        },
      },
    )
  }

  const onDelete = () => {
    setError(null)
    remove.mutate(program.id, {
      onSuccess: () => {
        toast.success(`${program.name} deleted`)
        setConfirm(null)
        onRemoved()
      },
      onError: (mutationError) => {
        setError(errorMessage(mutationError))
        setConfirm(null)
      },
    })
  }

  const rows: {
    key: 'edit' | 'design' | 'dup' | 'arch'
    title: string
    hint: string
    onClick: () => void
    disabled: boolean
  }[] = [
    {
      key: 'edit',
      title: 'Edit program details',
      hint: 'Name, reward, stamps and schedule',
      onClick: () => setEditOpen(true),
      disabled: busy,
    },
    {
      key: 'design',
      title: 'Change design',
      hint: 'Update how the card looks',
      onClick: onChangeDesign,
      disabled: busy,
    },
    {
      key: 'dup',
      title: 'Duplicate program',
      hint: 'Create a paused copy to start from',
      onClick: onDuplicate,
      disabled: busy,
    },
    {
      key: 'arch',
      title: 'Archive program',
      hint: 'Remove it from your programs list',
      onClick: () => setConfirm('archive'),
      disabled: busy || status === 'archived',
    },
  ]

  return (
    <div>
      {error ? (
        <Alert tone="danger" title="That change did not go through" className="mb-[1rem]">
          {error}
        </Alert>
      ) : null}

      <h3 className="mb-[0.9rem] text-heading font-bold">Program settings</h3>

      <div className="card overflow-hidden p-0">
        <div className="flex items-center justify-between gap-4 border-b border-line px-[1.1rem] py-[0.9rem]">
          <span className="min-w-0 text-label font-semibold">
            Program status
            <small className="mt-[0.1rem] block text-meta font-normal text-muted">
              {programStatusHint(program.status)}
            </small>
          </span>
          <Switch
            checked={active}
            onCheckedChange={toggleActive}
            disabled={busy || status === 'archived'}
            label={active ? 'Pause program' : 'Activate program'}
          />
        </div>

        {rows.map((row) => (
          <button
            key={row.key}
            type="button"
            onClick={row.onClick}
            disabled={row.disabled}
            className="flex w-full items-center justify-between gap-4 border-b border-line px-[1.1rem] py-[0.9rem] text-left transition-colors last:border-b-0 hover:bg-hover disabled:opacity-50"
          >
            <span className="min-w-0 text-label font-semibold">
              {row.title}
              <small className="mt-[0.1rem] block text-meta font-normal text-muted">
                {row.hint}
              </small>
            </span>
            <span className="text-muted">→</span>
          </button>
        ))}
      </div>

      <div className="mt-[1rem] flex flex-wrap items-center justify-between gap-4 rounded-card border border-line bg-surface p-[1.1rem]">
        <div className="min-w-0">
          <h3 className="text-heading font-bold">Delete program</h3>
          <p className="m-0 mt-[0.15rem] max-w-[44ch] text-meta text-muted">
            Permanently removes this program and its card design assignment. This can’t be undone.
          </p>
        </div>
        <Button variant="danger" onClick={() => setConfirm('delete')} disabled={busy}>
          Delete program
        </Button>
      </div>

      <EditLoyaltyProgramDrawer
        key={editOpen ? 'edit' : 'edit-closed'}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        program={program}
      />

      <ProgramConfirmationDialog
        key={confirm === 'archive' ? 'archive' : 'archive-closed'}
        open={confirm === 'archive'}
        title="Archive this program?"
        description="It will be removed from your programs list and hidden from customers. Existing customer progress is kept."
        confirmLabel="Archive"
        onConfirm={onArchive}
        onCancel={() => setConfirm(null)}
        busy={setStatus.isPending}
      />

      <ProgramConfirmationDialog
        key={confirm === 'delete' ? 'delete' : 'delete-closed'}
        open={confirm === 'delete'}
        title="Delete this program?"
        description="This permanently removes the program and can’t be undone. Type the program’s name to confirm."
        confirmLabel="Delete program"
        tone="danger"
        confirmPhrase={program.name}
        onConfirm={onDelete}
        onCancel={() => setConfirm(null)}
        busy={remove.isPending}
      />
    </div>
  )
}
