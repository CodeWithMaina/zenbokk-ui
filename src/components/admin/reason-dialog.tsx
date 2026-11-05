import { useState } from 'react'
import type { ReactNode } from 'react'
import { Field, Textarea } from '../ui/field'
import { ConfirmDialog } from '../ui/confirm-dialog'

export type ReasonDialogProps = {
  open: boolean
  title: ReactNode
  description?: ReactNode
  icon?: ReactNode
  /** Label for the confirm button. */
  confirmLabel?: string
  tone?: 'default' | 'danger'
  /** When true the reason must be non-empty before confirm is enabled. */
  requireReason?: boolean
  /** Placeholder for the reason field. */
  placeholder?: string
  /** Extra body content rendered above the reason field. */
  children?: ReactNode
  busy?: boolean
  onConfirm: (reason: string) => void
  onCancel: () => void
}

/**
 * Confirmation dialog that captures an administrative reason.
 *
 * High-impact platform actions (suspending a business, cancelling a
 * subscription, disabling a module) are audited server-side, so the reason the
 * administrator types here is the reason recorded against the change. The
 * dialog never invents one.
 *
 * The reason field lives in an inner component that only exists while the
 * dialog is open, so opening it for a second action can never resubmit the
 * first action's reason — the state simply does not survive the close.
 */
export function ReasonDialog({ open, ...props }: ReasonDialogProps) {
  if (!open) return null
  return <ReasonDialogBody {...props} />
}

type ReasonDialogBodyProps = Omit<ReasonDialogProps, 'open'>

function ReasonDialogBody({
  title,
  description,
  icon,
  confirmLabel = 'Confirm',
  tone = 'default',
  requireReason = false,
  placeholder = 'Why is this change being made?',
  children,
  busy = false,
  onConfirm,
  onCancel,
}: ReasonDialogBodyProps) {
  const [reason, setReason] = useState('')
  const blocked = requireReason && reason.trim().length === 0

  return (
    <ConfirmDialog
      open
      title={title}
      description={description}
      icon={icon}
      tone={tone}
      confirmLabel={busy ? 'Working…' : confirmLabel}
      onCancel={onCancel}
      onConfirm={() => {
        if (blocked || busy) return
        onConfirm(reason.trim())
      }}
    >
      {children}
      <Field
        label="Reason"
        htmlFor="admin-reason"
        optional={!requireReason}
        className={children ? 'mt-3' : undefined}
      >
        <Textarea
          id="admin-reason"
          rows={3}
          value={reason}
          placeholder={placeholder}
          onChange={(event) => setReason(event.target.value)}
        />
      </Field>
    </ConfirmDialog>
  )
}
