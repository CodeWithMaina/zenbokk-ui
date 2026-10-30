import { useId } from 'react'
import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '../../lib/cn'
import { Portal } from './portal'
import { useOverlay } from './use-overlay'

export type DrawerProps = {
  open: boolean
  onClose: () => void
  title: ReactNode
  description?: ReactNode
  /** Optional sticky footer, typically cancel + save buttons. */
  footer?: ReactNode
  children: ReactNode
  closeLabel?: string
  bodyClassName?: string
  className?: string
}

/**
 * Right-hand drawer that becomes a bottom sheet on phones (`.drawer` recipe).
 * Use for add/edit forms.
 */
export function Drawer({
  open,
  onClose,
  title,
  description,
  footer,
  children,
  closeLabel = 'Close',
  bodyClassName,
  className,
}: DrawerProps) {
  const titleId = useId()
  const panelRef = useOverlay<HTMLDivElement>(open, onClose)

  if (!open) return null

  return (
    <Portal>
      <button
        type="button"
        className="scrim"
        aria-label={closeLabel}
        tabIndex={-1}
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn('drawer', className)}
      >
        <div className="sheet-head gap-4">
          <div className="min-w-0">
            <h2
              id={titleId}
              className="text-heading font-bold tracking-snug text-fg"
            >
              {title}
            </h2>
            {description ? (
              <p className="mt-[0.15rem] text-meta text-muted">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            aria-label={closeLabel}
            onClick={onClose}
            className="btn btn-ghost btn-icon -mr-[0.4rem] shrink-0"
          >
            <X className="size-[1.1rem]" aria-hidden="true" />
          </button>
        </div>
        <div className={cn('sheet-body', bodyClassName)}>{children}</div>
        {footer ? <div className="sheet-foot">{footer}</div> : null}
      </div>
    </Portal>
  )
}
