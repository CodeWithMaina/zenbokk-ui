import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '../../lib/cn'
import { useMediaQuery } from '../../lib/hooks/use-media-query'
import { Button, LinkButton } from '../ui/button'
import { Drawer } from '../ui/drawer'

export type ServiceFilterDrawerProps = {
  open: boolean
  onClose: () => void
  children: ReactNode
  title?: ReactNode
  description?: ReactNode
  onReset?: () => void
  resetLabel?: string
  /** Usually the result count, e.g. `Show 4 services`. */
  applyLabel?: ReactNode
  className?: string
  /** Id for the panel, so the Filters button can point at it with `aria-controls`. */
  panelId?: string
}

/**
 * Responsive filter panel.
 *
 * The design has two behaviours for the same control, and which one applies is
 * decided by viewport, not by two components:
 *
 *  - **900px and wider** — an inline panel that *pushes* the grid sideways. The
 *    list stays visible while filters are adjusted, which is the whole point on a
 *    desktop.
 *  - **Below 900px** — an overlay drawer (a right-hand panel on tablets, a bottom
 *    sheet on phones), reusing the shared `Drawer`, so scroll locking, Escape and
 *    focus trapping come from `useOverlay` rather than being re-implemented.
 *
 * The breakpoint is the design's own 900px (56.25rem), not Tailwind's `lg`.
 */
export function ServiceFilterDrawer({
  open,
  onClose,
  children,
  title = 'Filters',
  description = 'Narrow your services',
  onReset,
  resetLabel = 'Reset',
  applyLabel = 'Show results',
  className,
  panelId,
}: ServiceFilterDrawerProps) {
  const isDesktop = useMediaQuery('(min-width: 56.25rem)')

  if (!isDesktop) {
    return (
      <Drawer
        open={open}
        onClose={onClose}
        title={title}
        description={description}
        className={className}
        footer={
          <div className="flex w-full items-center justify-between gap-3">
            <LinkButton
              onClick={onReset}
              disabled={!onReset}
              className="px-[0.2rem] disabled:cursor-not-allowed disabled:opacity-35"
            >
              {resetLabel}
            </LinkButton>
            <Button variant="primary" onClick={onClose}>
              {applyLabel}
            </Button>
          </div>
        }
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
        'sticky top-[1rem] flex-none overflow-hidden transition-[width,margin,opacity] duration-[450ms] ease-out',
        'motion-reduce:transition-none',
        open ? 'ml-[1.1rem] w-[18rem] opacity-100' : 'ml-0 w-0 opacity-0',
        className,
      )}
    >
      <div className="flex max-h-[calc(100dvh-2rem)] w-[18rem] flex-col overflow-hidden rounded-card border border-line bg-surface">
        <div className="sheet-head gap-3">
          <div className="min-w-0">
            <h2 className="text-sheet font-bold tracking-snug">{title}</h2>
            {description ? <p className="text-meta text-muted">{description}</p> : null}
          </div>
          <button
            type="button"
            aria-label="Close filters"
            onClick={onClose}
            className="btn btn-ghost btn-icon -mr-[0.3rem] shrink-0"
          >
            <X className="size-[1.1rem]" aria-hidden="true" />
          </button>
        </div>

        <div className="sheet-body min-h-0 flex-1" tabIndex={-1}>
          {children}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-line px-[1.1rem] py-[0.9rem]">
          <LinkButton
            onClick={onReset}
            disabled={!onReset}
            className="px-[0.2rem] disabled:cursor-not-allowed disabled:opacity-35"
          >
            {resetLabel}
          </LinkButton>
          <Button variant="primary" onClick={onClose}>
            {applyLabel}
          </Button>
        </div>
      </div>
    </aside>
  )
}
