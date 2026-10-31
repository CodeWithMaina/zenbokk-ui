import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export type StorefrontSectionProps = {
  /** Anchor target, e.g. `services`. */
  id: string
  /** Small label above the heading. */
  eyebrow: string
  /** Owner-configured title; falls back to the default for the section. */
  title?: string | null
  /** Owner-configured description; falls back to the default. */
  description?: string | null
  /** The fallbacks used when the owner has not overridden them. */
  defaultTitle: string
  defaultDescription?: string
  children: ReactNode
  className?: string
}

/**
 * The shell every storefront section is built in: one anchor, one eyebrow, one
 * heading, one measure. Sections differ only in their body, which is what keeps
 * a page assembled from owner configuration looking like one page.
 */
export function StorefrontSection({
  id,
  eyebrow,
  title,
  description,
  defaultTitle,
  defaultDescription,
  children,
  className,
}: StorefrontSectionProps) {
  const body = description ?? defaultDescription

  return (
    <section id={id} className={cn('scroll-mt-24 border-t border-line bg-surface', className)}>
      <div className="mx-auto w-full max-w-(--container-page) px-gutter py-[clamp(1.75rem,5vw,3rem)]">
        <div className="max-w-[38rem]">
          <p className="eyebrow">{eyebrow}</p>
          <h2 className="display mt-[0.35rem] text-title">{title || defaultTitle}</h2>
          {body ? <p className="mt-[0.5rem] text-meta text-muted">{body}</p> : null}
        </div>
        <div className="mt-[1.2rem]">{children}</div>
      </div>
    </section>
  )
}
