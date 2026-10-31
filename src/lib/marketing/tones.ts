/**
 * PUBLIC SURFACE — shared tone vocabulary.
 *
 * The marketing screens all speak in the same four pastel "washes" plus the
 * forest dark moment. Those values are tokens in `src/index.css`
 * (`--tone-blue`, `--tone-pink`, …), defined per theme, so this module is only
 * the name → `var()` map. The `-deep` sibling is the saturated accent used for
 * icons and marks sitting on that wash; both are declared per theme so the
 * pastel palette keeps working in the dark theme.
 */

export const PUBLIC_TONES = ['blue', 'pink', 'purple', 'beige'] as const

export type PublicTone = (typeof PUBLIC_TONES)[number]

/** Wash background for a tone. */
export function toneWash(tone: PublicTone): string {
  return `var(--tone-${tone})`
}

/** Saturated accent for icons/marks sitting on that wash. */
export function toneDeep(tone: PublicTone): string {
  return `var(--tone-${tone}-deep)`
}

/**
 * A low-opacity ink tint that reads as the card stock between the holes on a
 * ticket panel — `color-mix` rather than a hardcoded white, so it stays correct
 * on a pastel wash, the page canvas and the forest panel alike.
 */
export const toneChip = 'color-mix(in srgb, var(--fg) 12%, transparent)'
