import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

/**
 * The public-surface root: the canvas the marketing pages paint.
 *
 * Everything inside it is authored at the desktop size the design reads on
 * paper and scaled as a whole (see `.pn-canvas` in `src/index.css`), which is
 * also why this component exists at all — a page must not be allowed to opt out
 * of the scale and drift away from the others.
 */
export function PublicCanvas({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={cn('pn-canvas', className)}>{children}</div>
}

/**
 * The marketing measure. Stays in px (not rem) on purpose: the canvas is a
 * fixed-width composition that is scaled, not a fluid console layout, so
 * `--public-measure` is deliberately not part of the rem scale.
 */
export function Container({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'mx-auto w-full max-w-(--public-measure) px-5 sm:px-8 lg:px-12',
        className,
      )}
    >
      {children}
    </div>
  )
}
