import { useState } from 'react'
import { History, Loader2 } from 'lucide-react'
import { ConfirmDialog } from '../ui/confirm-dialog'
import { formatDateTime } from '../../lib/format'
import type { StorefrontRevision } from '../../lib/api/types'

/**
 * Confirmation for the one destructive action in the builder.
 *
 * It spells out exactly what will happen — which version, when it was saved, by
 * whom, that the current draft is replaced, and that the live storefront is
 * *not* — and warns when the editor holds unsaved changes. The dialog stays open
 * (with an error) unless the caller reports success.
 */
export function RevisionRestoreDialog({
  revision,
  hasUnsavedChanges,
  onCancel,
  onConfirm,
}: {
  revision: StorefrontRevision | null
  hasUnsavedChanges: boolean
  onCancel: () => void
  onConfirm: (revision: StorefrontRevision) => Promise<boolean>
}) {
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  if (!revision) return null

  const confirm = async () => {
    setBusy(true)
    setFailed(false)
    const ok = await onConfirm(revision)
    setBusy(false)
    if (!ok) setFailed(true)
  }

  const savedBy = revision.createdByName ? ` by ${revision.createdByName}` : ''

  return (
    <ConfirmDialog
      open
      icon={<History className="size-5" aria-hidden="true" />}
      title={`Restore version #${revision.revisionNumber}?`}
      description={`Saved ${formatDateTime(revision.createdAt)}${savedBy}.`}
      confirmLabel={busy ? 'Restoring…' : 'Restore this version'}
      cancelLabel="Keep my draft"
      onConfirm={() => void confirm()}
      onCancel={onCancel}
    >
      <ul className="grid gap-[0.3rem] text-meta text-muted">
        <li>Your current draft is replaced by this version.</li>
        <li>Your live storefront does not change — publish when you are ready.</li>
        <li>Your current draft stays recoverable in the version history.</li>
      </ul>

      {hasUnsavedChanges ? (
        <p className="mt-[0.7rem] rounded-md border border-warning bg-warning-soft px-[0.7rem] py-[0.55rem] text-meta text-warning-ink">
          You have unsaved editor changes. They will be replaced as well.
        </p>
      ) : null}

      {failed ? (
        <p role="alert" className="mt-[0.7rem] text-meta text-danger-ink">
          That version could not be restored. Nothing was changed.
        </p>
      ) : null}

      {busy ? (
        <p className="mt-[0.6rem] flex items-center gap-[0.4rem] text-meta text-muted">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          Restoring…
        </p>
      ) : null}
    </ConfirmDialog>
  )
}
