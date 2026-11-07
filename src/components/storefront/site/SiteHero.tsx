import type { PublicBusinessProfile, StorefrontConfig, StorefrontHero } from '../../../lib/api/types'
import { normaliseHeroLayout } from '../../../lib/storefront-builder/catalog'
import { cn } from '../../../lib/cn'

/**
 * The storefront hero — the prototype's `.hro` system.
 *
 * All nine layouts are distinct compositions, not aliases:
 * - `overlay`       full-bleed image behind the copy
 * - `centered`      full-bleed image, centred copy
 * - `split`         copy beside a portrait image
 * - `split-reverse` image first
 * - `minimal`       oversized type on the page background, no image
 * - `gradient`      brand gradient, no image
 * - `facts`         full-bleed image with a glass facts band over it
 * - `collage`       copy beside a three-tile collage
 * - `booking`       full-bleed image with a booking panel over it
 */

export type HeroFact = { value: string; label: string }

export type SiteHeroProps = {
  config: StorefrontConfig
  business: PublicBusinessProfile
  /** The hero to draw: the page's own, or the storefront-wide one. */
  hero: StorefrontHero
  imageUrl?: string | null
  collageImages?: string[]
  facts?: HeroFact[]
  primaryHref: string
  secondaryHref: string
  onNavigate?: (href: string) => void
}

const HEIGHTS: Record<string, string> = {
  compact: 'is-ht-compact',
  standard: '',
  tall: 'is-ht-tall',
  screen: 'is-ht-tall',
}

export function SiteHero({
  business,
  hero,
  imageUrl,
  collageImages = [],
  facts = [],
  primaryHref,
  secondaryHref,
  onNavigate,
}: SiteHeroProps) {
  const layout = normaliseHeroLayout(hero.variant)

  const eyebrow = hero.eyebrow
  const heading = hero.heading || business.name
  const copy = hero.description ?? hero.subheading

  const buttonProps = (href: string) =>
    onNavigate
      ? { href, onClick: (event: React.MouseEvent) => { event.preventDefault(); onNavigate(href) } }
      : { href }

  const actions = (
    <span className="sf-bts">
      {hero.primaryCtaLabel ? (
        <a className="sf-bt" {...buttonProps(primaryHref)}>{hero.primaryCtaLabel}</a>
      ) : null}
      {hero.secondaryCtaLabel ? (
        <a className="sf-bt is-ol" {...buttonProps(secondaryHref)}>{hero.secondaryCtaLabel}</a>
      ) : null}
    </span>
  )

  const head = (
    <div className="sf-hc">
      {eyebrow ? <p className="sf-eb">{eyebrow}</p> : null}
      <h1>{heading}</h1>
      {copy ? <p>{copy}</p> : null}
      {actions}
    </div>
  )

  const style = {
    '--sf-hi': imageUrl ? `url(${imageUrl})` : 'none',
    '--sf-hc': hero.backgroundColor || '#000',
    '--sf-ho': String(Math.min(Math.max((hero.overlayOpacity ?? 55) / 100, 0), 1)),
  } as React.CSSProperties

  const media = (
    <div className="sf-mw">
      <div className="sf-im" />
      {facts[0] ? (
        <span className="sf-bdg">
          <b>{facts[0].value}</b>
          {facts[0].label}
        </span>
      ) : null}
    </div>
  )

  if (layout === 'minimal') {
    return (
      <section className="sf-hro sf-hl-minimal is-lh" data-sf-hero="minimal">
        {head}
        <div className="sf-mq" aria-hidden="true">
          <div>
            <span>{business.category}</span>
            <span>{business.name}</span>
            <span>{business.location || business.category}</span>
            <span>{business.name}</span>
          </div>
        </div>
      </section>
    )
  }

  if (layout === 'gradient') {
    return (
      <section className={cn('sf-hro sf-hl-gradient', HEIGHTS[hero.height] ?? '')} data-sf-hero="gradient">
        <span className="sf-bl b1" aria-hidden="true" />
        <span className="sf-bl b2" aria-hidden="true" />
        <span className="sf-bl b3" aria-hidden="true" />
        {head}
      </section>
    )
  }

  if (layout === 'split' || layout === 'split-reverse') {
    return (
      <section
        className={cn('sf-hro is-lh', layout === 'split' ? 'sf-hl-split' : 'sf-hl-splitr')}
        style={style}
        data-sf-hero={layout}
      >
        {head}
        {media}
      </section>
    )
  }

  if (layout === 'collage') {
    const tiles = collageImages.slice(0, 3)
    return (
      <section className="sf-hro sf-hl-collage is-lh" style={style} data-sf-hero="collage">
        {head}
        <div className="sf-mw">
          <div className="sf-col">
            {(tiles.length > 0 ? tiles : [imageUrl ?? '']).map((src, index) => (
              <div key={index} style={src ? { backgroundImage: `url(${src})` } : undefined} />
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (layout === 'facts') {
    return (
      <section className={cn('sf-hro sf-hl-facts', HEIGHTS[hero.height] ?? '')} style={style} data-sf-hero="facts">
        <div className="sf-bgi" aria-hidden="true" />
        <div className="sf-shd" aria-hidden="true" />
        <div className="sf-hc">
          {eyebrow ? <p className="sf-eb">{eyebrow}</p> : null}
          <h1>{heading}</h1>
          {copy ? <p>{copy}</p> : null}
        </div>
        {facts.length > 0 ? (
          <div className="sf-fct">
            {facts.slice(0, 4).map((fact) => (
              <div key={fact.label}>
                <b>{fact.value}</b>
                {fact.label}
              </div>
            ))}
          </div>
        ) : null}
      </section>
    )
  }

  if (layout === 'booking') {
    return (
      <section className={cn('sf-hro sf-hl-booking', HEIGHTS[hero.height] ?? '')} style={style} data-sf-hero="booking">
        <div className="sf-bgi" aria-hidden="true" />
        <div className="sf-shd" aria-hidden="true" />
        <div className="sf-hc">
          {eyebrow ? <p className="sf-eb">{eyebrow}</p> : null}
          <h1>{heading}</h1>
          {copy ? <p>{copy}</p> : null}
        </div>
        <div className="sf-bk2">
          {facts.slice(0, 3).map((fact) => (
            <div key={fact.label}>
              <small>{fact.label}</small>
              {fact.value}
            </div>
          ))}
          <a className="sf-bt" {...buttonProps(primaryHref)}>{hero.primaryCtaLabel || 'Book now'}</a>
        </div>
      </section>
    )
  }

  // overlay (default) and centered: a full-bleed image behind the copy.
  return (
    <section
      className={cn('sf-hro', layout === 'centered' ? 'sf-hl-centered' : 'sf-hl-overlay', HEIGHTS[hero.height] ?? '')}
      style={style}
      data-sf-hero={layout}
    >
      <div className="sf-bgi" aria-hidden="true" />
      <div className="sf-shd" aria-hidden="true" />
      <div className="sf-hc">
        {eyebrow ? <p className="sf-eb">{eyebrow}</p> : null}
        <h1>{heading}</h1>
        {copy ? <p>{copy}</p> : null}
        {actions}
      </div>
    </section>
  )
}
