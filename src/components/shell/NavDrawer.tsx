import { useEffect, useId, useState } from 'react'
import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '../../lib/cn'
import { Portal } from '../ui/portal'
import { useOverlay } from '../ui/use-overlay'

/** Matches the panel's transform transition (`0.34s`) plus a small buffer. */
const EXIT_MS = 360

export type NavDrawerProps = {
  open: boolean
  onClose: () => void
  title: ReactNode
  description?: ReactNode
  closeLabel?: string
  /** Id applied to the panel, so a trigger can point `aria-controls` at it. */
  id?: string
  bodyClassName?: string
  className?: string
  children: ReactNode
}

/**
 * Side navigation drawer for phones.
 *
 * Slides in from the right over a dimming backdrop and, unlike the shared
 * `Drawer` (which becomes a bottom sheet on small screens), keeps its
 * side-anchored shape at every width — it is a navigation surface, not a form.
 *
 * Behaviour comes from `useOverlay`: background scroll is locked, Escape closes,
 * Tab stays inside the panel, and focus returns to the trigger on close. The
 * component keeps itself mounted through the closing transition (and only then
 * lets `useOverlay` restore the page), so both opening and closing animate.
 */
export function NavDrawer({
  open,
  onClose,
  title,
  description,
  closeLabel = 'Close menu',
  id,
  bodyClassName,
  className,
  children,
}: NavDrawerProps) {
  const titleId = useId()
  // `rendered` keeps the portal alive across the exit animation; `shown` flips
  // the `is-open` modifier that the CSS transitions on.
  const [rendered, setRendered] = useState(open)
  const [shown, setShown] = useState(false)
  const panelRef = useOverlay<HTMLDivElement>(rendered, onClose)

  useEffect(() => {
    if (open) {
      setRendered(true)
      // Wait a frame so the panel mounts at translateX(100%) before it animates in.
      const frame = window.requestAnimationFrame(() => setShown(true))
      return () => window.cancelAnimationFrame(frame)
    }
    setShown(false)
    const timer = window.setTimeout(() => setRendered(false), EXIT_MS)
    return () => window.clearTimeout(timer)
  }, [open])

  if (!rendered) return null

  return (
    <Portal>
      <button
        type="button"
        className={cn('nav-scrim', shown && 'is-open')}
        aria-label={closeLabel}
        tabIndex={-1}
        onClick={onClose}
      />
      <div
        ref={panelRef}
        id={id}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn('nav-panel', shown && 'is-open', className)}
      >
        <div className="nav-panel-head">
          <div className="min-w-0">
            <h2 id={titleId} className="truncate text-heading font-bold tracking-snug text-fg">
              {title}
            </h2>
            {description ? (
              <p className="mt-[0.15rem] truncate text-meta text-muted">{description}</p>
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
        <div className={cn('nav-panel-body', bodyClassName)}>{children}</div>
      </div>
    </Portal>
  )
}
