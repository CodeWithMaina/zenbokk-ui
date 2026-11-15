import { Skeleton } from '../../ui/skeleton'

/**
 * The main About card: the `h1` title, the business's description, a row of
 * service tags, and a closing row with one accent action and a small price note.
 *
 * Every piece is optional and simply absent when the business has not published
 * it, so the card never shows an empty box. The action row is shown when there is
 * either a bookable action or a price note to state.
 */
export function AboutCard({
  title,
  description,
  tags,
  note,
  ctaLabel,
  ctaHref,
}: {
  title: string
  description: string | null
  tags: string[]
  note: string | null
  ctaLabel: string | null
  ctaHref: string | null
}) {
  const bookable = Boolean(ctaLabel && ctaHref)
  const showActions = bookable || Boolean(note)

  return (
    <section className="ab-card" aria-labelledby="ab-title">
      <h1 id="ab-title" className="ab-title">
        {title}
      </h1>

      {description ? <p className="ab-desc">{description}</p> : null}

      {tags.length > 0 ? (
        <ul className="ab-tags" aria-label="Services">
          {tags.map((tag) => (
            <li key={tag}>{tag}</li>
          ))}
        </ul>
      ) : null}

      {showActions ? (
        <div className="ab-cta">
          {bookable ? (
            <a className="ab-cta-btn" href={ctaHref as string}>
              {ctaLabel}
            </a>
          ) : null}
          {note ? <small className="ab-cta-note">{note}</small> : null}
        </div>
      ) : null}
    </section>
  )
}

/** The card's shape, held while its data loads — no empty box, no layout jump. */
export function AboutCardSkeleton() {
  return (
    <div className="ab-card ab-card-skeleton" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>
      <Skeleton className="h-[2.2rem] w-[70%]" />
      <Skeleton className="h-[0.9rem] w-full" />
      <Skeleton className="h-[0.9rem] w-[85%]" />
      <Skeleton className="h-[2.2rem] w-full rounded-card" />
    </div>
  )
}
