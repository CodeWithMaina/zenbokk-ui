import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '../../lib/cn'
import { useMediaQuery } from '../../lib/hooks/use-media-query'
import { Button, LinkButton } from '../ui/button'
import { Drawer } from '../ui/drawer'

export type ServiceFilterDrawerProps = {
  open: boolean
  /** Apply the draft: the page writes it to the URL and closes the panel. */
  onApply?: () => void
  /** Discard the draft and close (Cancel, the close button, Escape, the scrim). */
  onClose: () => void
  /** Reset the panel's refinements — never the Active/Paused/Archived tab. */
  onClearAll?: () => void
  /** Previous name for `onClearAll`, kept for the storefront's immediate panel. */
  onReset?: () => void
  children: ReactNode
  /** Refinements currently applied to the results. */
  appliedCount?: number
  /** Refinements in the draft, so the footer can show that Apply would change things. */
  draftCount?: number
  /** e.g. `Show 12 services`, taken from the applied result set. */
  applyLabel?: ReactNode
  title?: ReactNode
  description?: ReactNode
  className?: string
  /** Id for the panel, so the Filters button can point at it with `aria-controls`. */
  panelId?: string
}

function useFilterLabels({ appliedCount = 0, draftCount = 0 }: { appliedCount?: number; draftCount?: number }) {
  const pending = draftCount !== appliedCount
  return {
    summary:
      appliedCount === 0
        ? 'No filters applied'
        : `${appliedCount} filter${appliedCount === 1 ? '' : 's'} applied`,
    pending,
  }
}

/**
 * The Services filter surface — one experience in two shapes.
 *
 *  - **900px and wider**: an inline panel beside the grid, so results stay visible
 *    while filters are adjusted.
 *  - **Below 900px**: the shared `Drawer`, which is a right-hand panel on tablets and
 *    a bottom sheet on phones (scroll locking, Escape and focus trapping come from
 *    `useOverlay`, and the footer respects the safe area).
 *
 * The panel edits a *draft*. Nothing changes the results until Apply is pressed;
 * Cancel (or closing) throws the draft away, which is why the footer states whether
 * the draft differs from what is currently applied.
 */
export function ServiceFilterDrawer({
  open,
  onApply,
  onClose,
  onClearAll,
  onReset,
  children,
  appliedCount,
  draftCount,
  applyLabel = 'Show results',
  title = 'Filters',
  description = 'Refine the catalogue you are looking at.',
  className,
  panelId,
}: ServiceFilterDrawerProps) {
  const isDesktop = useMediaQuery('(min-width: 56.25rem)')
  const { summary, pending } = useFilterLabels({ appliedCount, draftCount })
  const clearAll = onClearAll ?? onReset
  // Immediate-filtering callers (the storefront) have no draft, so Apply is just a
  // close; the owner console always passes both.
  const apply = onApply ?? onClose

  const header = (
    <>
      <div className="min-w-0">
        <h2 className="text-sheet font-bold tracking-snug">{title}</h2>
        {description ? <p className="text-meta text-muted">{description}</p> : null}
        <p className="mt-[0.35rem] text-caption text-subtle" aria-live="polite">
          {summary}
          {pending ? ' · changes not applied yet' : null}
        </p>
      </div>
      <button
        type="button"
        aria-label="Close filters"
        onClick={onClose}
        className="btn btn-ghost btn-icon -mr-[0.3rem] shrink-0"
      >
        <X className="size-[1.1rem]" aria-hidden="true" />
      </button>
    </>
  )

  const footer = (
    <div className="flex w-full flex-col gap-[0.55rem]">
      <div className="flex items-center justify-between gap-3">
        <LinkButton
          onClick={clearAll}
          disabled={!clearAll || (draftCount !== undefined && draftCount === 0)}
          className="px-[0.2rem] disabled:cursor-not-allowed disabled:opacity-35"
        >
          Clear all
        </LinkButton>
        <span className="text-caption text-subtle">
          {draftCount ? `${draftCount} selected` : null}
        </span>
      </div>
      <div className="flex items-center gap-[0.5rem]">
        <Button variant="ghost" className="flex-1 whitespace-nowrap" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" className="flex-[1.4] whitespace-nowrap" onClick={apply}>
          {applyLabel}
        </Button>
      </div>
    </div>
  )

  if (!isDesktop) {
    return (
      <Drawer
        open={open}
        onClose={onClose}
        title={title}
        description={description}
        className={className}
        closeLabel="Close filters"
        footer={footer}
      >
        {children}
      </Drawer>
    )
  }

  return (
    <aside
      id={panelId}
      aria-label={typeof title === 'string' ? title : 'Filters'}
      aria-hidden={!open}
      className={cn(
        'sticky top-[1rem] flex-none overflow-hidden transition-[width,margin,opacity] duration-300 ease-out',
        'motion-reduce:transition-none',
        open ? 'ml-[1.1rem] w-[19rem] opacity-100' : 'ml-0 w-0 opacity-0',
        className,
      )}
    >
      <div className="flex max-h-[calc(100dvh-2rem)] w-[19rem] flex-col overflow-hidden rounded-card border border-line bg-surface">
        <div className="sheet-head gap-3">{header}</div>

        <div className="sheet-body min-h-0 flex-1" tabIndex={-1}>
          {children}
        </div>

        <div className="border-t border-line px-[1.1rem] py-[0.9rem]">{footer}</div>
      </div>
    </aside>
  )
}
