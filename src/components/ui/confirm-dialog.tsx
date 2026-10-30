import { useId } from 'react'
import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { Button } from './button'
import { Portal } from './portal'
import { useOverlay } from './use-overlay'

export type ConfirmDialogProps = {
  open: boolean
  title: ReactNode
  description?: ReactNode
  /** Optional icon in a tinted circle above the title. */
  icon?: ReactNode
  children?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'default' | 'danger'
  onConfirm: () => void
  onCancel: () => void
}

/** Small modal confirmation, e.g. archiving a client or deleting a service. */
export function ConfirmDialog({
  open,
  title,
  description,
  icon,
  children,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'default',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId()
  const descriptionId = useId()
  const panelRef = useOverlay<HTMLDivElement>(open, onCancel)
  const danger = tone === 'danger'

  if (!open) return null

  return (
    <Portal>
      <button
        type="button"
        className="scrim"
        aria-label={cancelLabel}
        tabIndex={-1}
        onClick={onCancel}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className="dialog focus:outline-none"
      >
        {icon ? (
          <div
            className={cn(
              'mb-[0.9rem] grid size-11 place-items-center rounded-round',
              danger
                ? 'bg-danger-soft text-danger-ink'
                : 'bg-accent-soft text-accent-ink',
            )}
            aria-hidden="true"
          >
            {icon}
          </div>
        ) : null}
        <h2
          id={titleId}
          className="text-heading font-bold tracking-snug text-fg"
        >
          {title}
        </h2>
        {description ? (
          <p id={descriptionId} className="mt-[0.4rem] text-meta text-muted">
            {description}
          </p>
        ) : null}
        {children ? <div className="mt-4">{children}</div> : null}
        <div className="mt-5 flex flex-wrap justify-end gap-[0.6rem]">
          <Button
            onClick={onCancel}
            data-autofocus={danger || undefined}
            className="max-sm:flex-1"
          >
            {cancelLabel}
          </Button>
          <Button
            variant={danger ? 'dangerSolid' : 'primary'}
            onClick={onConfirm}
            data-autofocus={!danger || undefined}
            className="max-sm:flex-1"
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Portal>
  )
}
