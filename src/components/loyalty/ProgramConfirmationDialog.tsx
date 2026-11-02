import { useState } from 'react'
import type { ReactNode } from 'react'
import { ConfirmDialog } from '../ui/confirm-dialog'
import { Input } from '../ui/field'

export type ProgramConfirmationDialogProps = {
  open: boolean
  title: ReactNode
  description?: ReactNode
  confirmLabel: string
  tone?: 'default' | 'danger'
  /**
   * When set, the confirm button stays disabled until the user types this text
   * exactly — the design's guard for irreversible actions such as deleting a
   * program that has customers and history.
   */
  confirmPhrase?: string
  onConfirm: () => void
  onCancel: () => void
  /** Marks the confirm action as in flight (disables it, prevents double submit). */
  busy?: boolean
}

/**
 * Confirmation dialog for the program lifecycle. Deleting a program asks the
 * owner to type its name, so a destructive action is never one stray click away.
 */
export function ProgramConfirmationDialog({
  open,
  title,
  description,
  confirmLabel,
  tone = 'default',
  confirmPhrase,
  onConfirm,
  onCancel,
  busy = false,
}: ProgramConfirmationDialogProps) {
  const [typed, setTyped] = useState('')

  const phraseSatisfied =
    !confirmPhrase || typed.trim().toLowerCase() === confirmPhrase.trim().toLowerCase()

  return (
    <ConfirmDialog
      open={open}
      title={title}
      description={description}
      tone={tone}
      confirmLabel={busy ? 'Working…' : confirmLabel}
      onCancel={onCancel}
      onConfirm={() => {
        if (phraseSatisfied && !busy) onConfirm()
      }}
    >
      {confirmPhrase ? (
        <div className="min-w-0">
          <label className="label" htmlFor="program-confirm-phrase">
            Type “{confirmPhrase}” to confirm
          </label>
          <Input
            id="program-confirm-phrase"
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            autoComplete="off"
            invalid={typed.length > 0 && !phraseSatisfied}
          />
        </div>
      ) : null}
      {phraseSatisfied ? null : (
        <span className="sr-only" role="status">
          Confirmation text does not match yet.
        </span>
      )}
    </ConfirmDialog>
  )
}
