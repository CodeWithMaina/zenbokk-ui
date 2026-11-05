import type { CSSProperties } from 'react'
import type { StorefrontTheme } from '../../lib/api/types'
import { defaultTheme } from '../../lib/storefront-builder/defaults'
import type { TemplateDefinition } from '../../lib/storefront-builder/templates'
import { cn } from '../../lib/cn'

/**
 * A faithful, miniature *rendering* of a template.
 *
 * This is not a screenshot or a recoloured placeholder: it draws the template's
 * own design tokens (palette, heading/body fonts, radius, button shape) and its
 * own header / hero / footer variants and section blueprint, in order — so two
 * templates never look alike in the gallery. The public storefront renders the
 * same design language at full size through `StorefrontRenderer`.
 */

const RADIUS: Record<string, string> = { sharp: '2px', soft: '8px', round: '18px' }
const BTN_RADIUS: Record<string, string> = {
  square: '2px',
  rounded: '7px',
  pill: '999px',
  outline: '7px',
  filled: '7px',
}

function fontStack(font: string): string {
  switch (font) {
    case 'Newsreader':
      return "'Newsreader', Georgia, 'Times New Roman', serif"
    case 'Georgia':
      return "Georgia, 'Times New Roman', serif"
    case 'system-ui':
      return 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif'
    default:
      return "'Figtree', system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
  }
}

function frameVars(theme: StorefrontTheme): CSSProperties {
  return {
    '--tp-primary': theme.primary,
    '--tp-secondary': theme.secondary,
    '--tp-accent': theme.accent,
    '--tp-bg': theme.background,
    '--tp-surface': theme.surface,
    '--tp-text': theme.text,
    '--tp-muted': theme.mutedText,
    '--tp-border': theme.border,
    '--tp-radius': RADIUS[theme.radius] ?? RADIUS.soft,
    '--tp-btn-radius': BTN_RADIUS[theme.buttonStyle] ?? BTN_RADIUS.rounded,
    '--tp-font-heading': fontStack(theme.headingFont),
    '--tp-font-body': fontStack(theme.bodyFont),
    '--tp-weight': String(theme.headingWeight),
    '--tp-scale': String(theme.headingScale === 'display' ? 1.18 : theme.headingScale === 'compact' ? 0.86 : 1),
  } as CSSProperties
}

/** Header chrome, drawn per variant. */
function HeaderSkeleton({ variant }: { variant: string }) {
  return (
    <div className={cn('tp-header', `is-${variant}`)}>
      <span className="tp-brand-dot" />
      <span className="tp-brand-line" />
      <span className="tp-nav">
        <i /><i /><i />
      </span>
      <span className="tp-nav-cta" />
    </div>
  )
}

/** Hero composition, drawn per variant. */
function HeroSkeleton({ variant }: { variant: string }) {
  const copy = (
    <div className="tp-hero-copy">
      <span className="tp-eyebrow" />
      <span className="tp-hero-title" />
      <span className="tp-hero-title is-short" />
      <span className="tp-hero-lead" />
      <span className="tp-hero-actions">
        <span className="tp-btn is-solid" />
        <span className="tp-btn is-outline" />
      </span>
    </div>
  )

  if (variant === 'split') {
    return (
      <div className="tp-hero is-split">
        <div className="tp-hero-media" />
        <div className="tp-hero-pad">{copy}</div>
      </div>
    )
  }
  if (variant === 'editorial') {
    return (
      <div className="tp-hero is-editorial">
        <div className="tp-hero-pad">{copy}</div>
        <div className="tp-hero-media is-offset" />
      </div>
    )
  }
  if (variant === 'minimal') {
    return <div className="tp-hero is-minimal"><div className="tp-hero-pad">{copy}</div></div>
  }
  if (variant === 'gradient') {
    return <div className="tp-hero is-gradient"><div className="tp-hero-pad is-center">{copy}</div></div>
  }

  const centered = variant === 'centered' || variant === 'premium'
  return (
    <div className={cn('tp-hero', `is-${variant}`)}>
      <div className="tp-hero-media" />
      <div className={cn('tp-hero-pad', centered && 'is-center')}>
        {variant === 'premium' ? <span className="tp-hero-rule" /> : null}
        {copy}
      </div>
      {variant === 'video' ? <span className="tp-play" /> : null}
      {variant === 'carousel' ? (
        <span className="tp-dots"><i /><i /><i /></span>
      ) : null}
    </div>
  )
}

/** Section body shape, driven by the section key + variant. */
function SectionSkeleton({ sectionKey, variant }: { sectionKey: string; variant: string }) {
  const heading = (
    <div className={cn('tp-sec-head', (variant === 'centered' || variant === 'quote') && 'is-center')}>
      <span className="tp-sec-title" />
      <span className="tp-sec-lead" />
    </div>
  )

  if (sectionKey === 'testimonials' || variant === 'quote') {
    return (
      <>
        {heading}
        <div className={cn('tp-quote', variant === 'quote' && 'is-plain')}>
          <span className="tp-stars" />
          <span className="tp-line" />
          <span className="tp-line is-short" />
        </div>
      </>
    )
  }

  if (sectionKey === 'about' || sectionKey === 'booking' || sectionKey === 'contact' || sectionKey === 'richtext') {
    const flipped = sectionKey === 'about' && variant === 'image-right'
    return (
      <>
        {heading}
        <div className={cn('tp-split', flipped && 'is-flipped', variant === 'centered' && 'is-center')}>
          <div className="tp-split-copy">
            <span className="tp-line" /><span className="tp-line" /><span className="tp-line is-short" />
            <span className="tp-btn is-solid" />
          </div>
          <div className="tp-split-media" />
        </div>
      </>
    )
  }

  if (sectionKey === 'announcement' || variant === 'banner') {
    return <div className="tp-banner"><span className="tp-line is-invert" /></div>
  }

  if (
    sectionKey === 'faq' || sectionKey === 'social' || sectionKey === 'newsletter' ||
    sectionKey === 'loyalty' || sectionKey === 'hours' || sectionKey === 'embed'
  ) {
    return (
      <>
        {heading}
        <div className="tp-rows">
          <span className="tp-row" /><span className="tp-row" /><span className="tp-row" />
        </div>
      </>
    )
  }

  // services / team / gallery / promotions / stats — a card grid, shaped by variant.
  const columns =
    variant === 'list' ? 1 : variant === 'featured' ? 2 : variant === 'circles' ? 4 : 3
  const tall =
    sectionKey === 'gallery' || sectionKey === 'team' ||
    variant === 'image-cards' || variant === 'masonry'
  const count = variant === 'list' ? 3 : columns === 4 ? 4 : 3
  return (
    <>
      {heading}
      <div
        className={cn('tp-grid', variant === 'scroller' && 'is-scroller', variant === 'list' && 'is-list')}
        style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
      >
        {Array.from({ length: count }).map((_, index) => (
          <span
            key={index}
            className={cn('tp-card', tall && 'is-tall', variant === 'list' && 'is-row')}
            style={variant === 'masonry' && index % 3 === 0 ? { gridRow: 'span 2' } : undefined}
          />
        ))}
      </div>
    </>
  )
}

/** Footer chrome, drawn per variant. */
function FooterSkeleton({ variant }: { variant: string }) {
  if (variant === 'minimal') {
    return <div className="tp-footer is-minimal"><span className="tp-line is-invert is-short" /></div>
  }
  if (variant === 'centered') {
    return (
      <div className="tp-footer is-centered">
        <span className="tp-brand-dot" />
        <span className="tp-line is-invert is-short" />
      </div>
    )
  }
  if (variant === 'contact') {
    return (
      <div className="tp-footer is-contact">
        <div className="tp-foot-col"><span className="tp-line is-invert" /><span className="tp-line is-invert is-short" /></div>
        <div className="tp-foot-col"><span className="tp-line is-invert is-short" /><span className="tp-line is-invert is-short" /></div>
      </div>
    )
  }
  if (variant === 'editorial') {
    return (
      <div className="tp-footer is-editorial">
        <span className="tp-foot-word" />
        <div className="tp-foot-cols">
          <span className="tp-line is-invert is-short" />
          <span className="tp-line is-invert is-short" />
          <span className="tp-line is-invert is-short" />
        </div>
      </div>
    )
  }
  // columns | dark
  return (
    <div className={cn('tp-footer', `is-${variant}`)}>
      <div className="tp-foot-col"><span className="tp-brand-dot" /><span className="tp-line is-invert" /></div>
      <div className="tp-foot-col"><span className="tp-line is-invert is-short" /><span className="tp-line is-invert is-short" /></div>
      <div className="tp-foot-col"><span className="tp-line is-invert is-short" /><span className="tp-line is-invert is-short" /></div>
    </div>
  )
}

export function TemplatePreviewFrame({
  template,
  className,
}: {
  template: TemplateDefinition
  className?: string
}) {
  const theme: StorefrontTheme = { ...defaultTheme(), ...template.theme }
  return (
    <div
      className={cn('tp-frame', className)}
      style={frameVars(theme)}
      aria-hidden="true"
      data-template={template.id}
    >
      <HeaderSkeleton variant={template.headerVariant} />
      <HeroSkeleton variant={template.heroVariant} />
      <div className="tp-body">
        {template.blueprint.slice(0, 4).map((entry, index) => (
          <div key={`${entry.key}-${index}`} className={cn('tp-section', `sf-${entry.key}`)}>
            <SectionSkeleton sectionKey={entry.key} variant={entry.variant} />
          </div>
        ))}
      </div>
      <FooterSkeleton variant={template.footerVariant} />
    </div>
  )
}

