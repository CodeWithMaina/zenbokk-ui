import type { ReactNode } from 'react'
import { StorefrontCallToAction } from './StorefrontCallToAction'

export type StorefrontPageProps = {
  /** Small uppercase label above the title. */
  eyebrow: string
  /** Page title — the owner's override when it set one. */
  title: string
  /** One measured paragraph under the title. */
  description?: string
  /** A control that sits at the end of the heading row. */
  action?: ReactNode
  /** The closing band. Off for pages that already end in their own call. */
  cta?: boolean
  children: ReactNode
}

/**
 * The shell every storefront page except the home hero is built in.
 *
 * The home page is the hero alone; everything else is a page with this header,
 * so the set reads as one site rather than a set of unrelated screens. The
 * heading is an `h1` — these are pages now, not blocks inside a page, which is
 * also what makes each one a real, linkable destination.
 *
 * `cta` defaults on, so a page ends by inviting the visitor to book. Pages that
 * already finish with their own call (the contact page's form) turn it off.
 */
export function StorefrontPage({
  eyebrow,
  title,
  description,
  action,
  cta = true,
  children,
}: StorefrontPageProps) {
  return (
    <div className="sf-container sf-page">
      <div className="sf-page-head">
        <div>
          <p className="sf-eyebrow">{eyebrow}</p>
          <h1 className="sf-heading sf-page-title">{title}</h1>
          {description ? <p className="sf-lead">{description}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>

      {children}

      {/* {cta ? <StorefrontCallToAction /> : null} */}
    </div>
  )
}

/**
 * A page the business's plan does not include.
 *
 * Rendered instead of firing a request that would 403. Nothing has gone wrong
 * for the visitor, so it is a panel with a way forward rather than an error —
 * and it never implies the business is broken.
 */
export function StorefrontPageUnavailable({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="sf-container">
      <div className="sf-unavailable">
        <p className="sf-eyebrow">Not available</p>
        <h1 className="sf-heading sf-page-title">{title}</h1>
        <p className="text-meta text-muted">{description}</p>
      </div>
    </div>
  )
}
