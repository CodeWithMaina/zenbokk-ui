import { Trash2 } from 'lucide-react'
import type { Service } from '../../lib/services'
import { ConfirmDialog } from '../ui/confirm-dialog'

export type ServiceDeleteDialogProps = {
  /** The service queued for deletion; null closes the dialog. */
  service: Service | null
  onConfirm: () => void
  onCancel: () => void
  /** True while the delete request is in flight. */
  busy?: boolean
}

/**
 * Confirmation for the one irreversible service action.
 *
 * Deleting is final, so the dialog says so and points at the reversible
 * alternatives (pause, archive) — an owner who only wanted to hide a service
 * should not have to discover that distinction after the fact.
 */
export function ServiceDeleteDialog({
  service,
  onConfirm,
  onCancel,
  busy = false,
}: ServiceDeleteDialogProps) {
  return (
    <ConfirmDialog
      open={service !== null}
      tone="danger"
      icon={<Trash2 className="size-5" />}
      title={service ? `Delete “${service.name}”?` : 'Delete this service?'}
      description={
        service
          ? 'This removes the service and its photos permanently. If you only want to hide it, pause or archive it instead.'
          : undefined
      }
      confirmLabel={busy ? 'Deleting…' : 'Delete'}
      cancelLabel="Keep it"
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  )
}
