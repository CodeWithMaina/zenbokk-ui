import { useId } from 'react'
import type { ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { cn } from '../../lib/cn'
import { Button } from './button'
import { Portal } from './portal'
import { useOverlay } from './use-overlay'

export type ActionSheetAction = {
  label: string
  description?: string
  icon?: ReactNode
  onSelect: () => void
  destructive?: boolean
  disabled?: boolean
}

export type ActionSheetProps = {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  actions: readonly ActionSheetAction[]
  cancelLabel?: string
}

/**
 * Bottom action sheet from the phones in the Clients design. The `.dialog`
 * recipe centres it on desktop and docks it to the bottom on phones.
 */
export function ActionSheet({
  open,
  onClose,
  title,
  description,
  actions,
  cancelLabel = 'Cancel',
}: ActionSheetProps) {
  const titleId = useId()
  const panelRef = useOverlay<HTMLDivElement>(open, onClose)

  if (!open) return null

  return (
    <Portal>
      <button
        type="button"
        className="scrim"
        aria-label={cancelLabel}
        tabIndex={-1}
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        className="dialog focus:outline-none"
      >
        {title ? (
          <div className="mb-[0.4rem]">
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
        ) : null}

        <div className="-mx-[1.4rem]">
          {actions.map((action, index) => (
            <button
              key={index}
              type="button"
              disabled={action.disabled}
              onClick={() => {
                action.onSelect()
                onClose()
              }}
              className={cn(
                'flex w-full items-center gap-[0.8rem] border-t border-line px-[1.4rem] py-[0.85rem] text-left transition-colors hover:bg-hover focus-visible:bg-hover focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40',
                action.destructive ? 'text-danger-ink' : 'text-fg',
              )}
            >
              {action.icon ? (
                <span className="shrink-0" aria-hidden="true">
                  {action.icon}
                </span>
              ) : null}
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{action.label}</span>
                {action.description ? (
                  <span className="mt-[0.1rem] block text-meta text-muted">
                    {action.description}
                  </span>
                ) : null}
              </span>
              <ChevronRight
                className="size-4 shrink-0 text-muted"
                aria-hidden="true"
              />
            </button>
          ))}
        </div>

        <Button className="mt-3 w-full" onClick={onClose}>
          {cancelLabel}
        </Button>
      </div>
    </Portal>
  )
}
