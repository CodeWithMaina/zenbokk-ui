import type { CSSProperties, ReactNode } from 'react'
import type { StorefrontTheme } from '../../lib/api/types'
import { cn } from '../../lib/cn'

/**
 * Applies the owner's design tokens to a storefront subtree as CSS variables.
 *
 * Everything the public storefront draws reads these variables (see the `.sf-*`
 * recipes in `index.css`), so changing a colour, font, radius or spacing in the
 * builder restyles the whole page without touching a single component. Values are
 * set as inline custom properties on a wrapper rather than a global stylesheet, so
 * two storefronts on the same page could never bleed into each other.
 */

const RADIUS: Record<string, string> = { sharp: '2px', soft: '0.65rem', round: '1.4rem' }
const SHADOW: Record<string, string> = {
  none: 'none',
  soft: '0 10px 30px -18px rgba(0,0,0,0.35)',
  strong: '0 24px 60px -24px rgba(0,0,0,0.55)',
}
const SECTION_SPACE: Record<string, string> = {
  compact: '2.25rem',
  normal: '3.25rem',
  comfortable: '4.5rem',
  generous: '5.75rem',
}
const CONTAINER_PAD: Record<string, string> = {
  compact: '1rem',
  normal: '1.5rem',
  comfortable: '2rem',
  generous: '2.75rem',
}
const LINE_HEIGHT: Record<string, string> = { tight: '1.45', normal: '1.65', relaxed: '1.85' }
const LETTER_SPACING: Record<string, string> = { tight: '-0.01em', normal: '0', wide: '0.02em' }
const HEADING_SCALE: Record<string, [string, string, string]> = {
  compact: ['1.5rem', '1.9rem', '2.4rem'],
  balanced: ['1.7rem', '2.2rem', '3rem'],
  display: ['2rem', '2.8rem', '3.8rem'],
  editorial: ['1.9rem', '2.6rem', '3.6rem'],
}
const BUTTON_RADIUS: Record<string, string> = {
  square: '2px',
  rounded: '0.55rem',
  pill: '999px',
  outline: '0.55rem',
  filled: '0.55rem',
}

/** A CSS font stack for the curated pairings, falling back gracefully. */
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

export function themeStyleVars(theme: StorefrontTheme): CSSProperties {
  const scale = HEADING_SCALE[theme.headingScale] ?? HEADING_SCALE.balanced
  const dark = theme.mode === 'dark'
  return {
    '--sf-primary': theme.primary,
    '--sf-secondary': theme.secondary,
    '--sf-accent': theme.accent,
    // Dark mode keeps the brand colours (primary, accent, buttons) but drops the
    // page onto a near-black canvas, so a storefront set to dark actually reads
    // as dark rather than a light theme with a renamed flag.
    '--sf-bg': dark ? `color-mix(in srgb, #0b0b0d 92%, ${theme.primary})` : theme.background,
    '--sf-surface': dark ? `color-mix(in srgb, #16171b 88%, ${theme.primary})` : theme.surface,
    '--sf-text': dark ? '#f4f4f2' : theme.text,
    '--sf-muted': dark ? 'rgba(244, 244, 242, 0.62)' : theme.mutedText,
    '--sf-btn-bg': theme.buttonBackground,
    '--sf-btn-text': theme.buttonText,
    '--sf-border': dark ? 'rgba(255, 255, 255, 0.14)' : theme.border,
    '--sf-font-heading': fontStack(theme.headingFont),
    '--sf-font-body': fontStack(theme.bodyFont),
    '--sf-heading-weight': String(theme.headingWeight),
    '--sf-body-weight': String(theme.bodyWeight),
    '--sf-h1': scale[2],
    '--sf-h2': scale[1],
    '--sf-h3': scale[0],
    '--sf-line': LINE_HEIGHT[theme.lineHeight] ?? LINE_HEIGHT.normal,
    '--sf-tracking': LETTER_SPACING[theme.letterSpacing] ?? LETTER_SPACING.normal,
    '--sf-width': `${theme.contentWidth}px`,
    '--sf-pad': CONTAINER_PAD[theme.containerPadding] ?? CONTAINER_PAD.normal,
    '--sf-section-space': SECTION_SPACE[theme.sectionSpacing] ?? SECTION_SPACE.comfortable,
    '--sf-radius': theme.radiusPx != null ? `${theme.radiusPx}px` : (RADIUS[theme.radius] ?? RADIUS.soft),
    '--sf-btn-radius': BUTTON_RADIUS[theme.buttonStyle] ?? BUTTON_RADIUS.rounded,
    '--sf-shadow': SHADOW[theme.shadow] ?? SHADOW.soft,
    '--sf-card-border': theme.cardStyle === 'flat' ? 'transparent' : theme.border,
    '--sf-base-font': `${theme.baseFontSize}px`,
    '--sf-gradient': `linear-gradient(135deg, ${theme.gradientFrom}, ${theme.gradientTo})`,
    // Motion. `--sf-dur` drives every entrance/hover transition.
    '--sf-dur': `${theme.durationMs ?? 600}ms`,
  } as CSSProperties
}

export function StorefrontThemeStyle({
  theme,
  children,
  className,
}: {
  theme: StorefrontTheme
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn('sf-root', className)}
      style={themeStyleVars(theme)}
      data-sf-template
      data-sf-mode={theme.mode === 'dark' ? 'dark' : 'light'}
    >
      {children}
    </div>
  )
}
