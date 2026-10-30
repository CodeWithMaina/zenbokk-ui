import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { Button } from './button'

export type SaveBarProps = {
  /** Hides the bar when there is nothing to save. */
  dirty?: boolean
  message?: ReactNode
  saveLabel?: ReactNode
  discardLabel?: ReactNode
  saving?: boolean
  onSave: () => void
  onDiscard?: () => void
  className?: string
}

/**
 * Sticky "unsaved changes" footer for the settings forms. Render it at the end
 * of the form; it sticks to the bottom of the scroll container.
 */
export function SaveBar({
  dirty = true,
  message = 'You have unsaved changes.',
  saveLabel = 'Save changes',
  discardLabel = 'Discard',
  saving = false,
  onSave,
  onDiscard,
  className,
}: SaveBarProps) {
  if (!dirty) return null

  return (
    <div
      role="region"
      aria-label="Unsaved changes"
      className={cn(
        'sticky bottom-0 z-20 mt-[1.2rem] -mx-4 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur md:-mx-8 md:px-8',
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-[0.8rem]">
        <p className="flex min-w-0 items-center gap-[0.45rem] text-meta text-muted">
          <span
            aria-hidden="true"
            className="size-[0.45rem] shrink-0 rounded-round bg-warning"
          />
          <span className="min-w-0">{message}</span>
        </p>

        <div className="flex shrink-0 items-center gap-[0.5rem] max-sm:w-full max-sm:[&>*]:flex-1">
          {onDiscard ? (
            <Button onClick={onDiscard} disabled={saving}>
              {discardLabel}
            </Button>
          ) : null}
          <Button variant="primary" onClick={onSave} disabled={saving}>
            {saving ? 'Saving…' : saveLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
