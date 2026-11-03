/**
 * Hero presentation helpers.
 *
 * The design's headline sets its last clause in italic gold ("Unhurried care,
 * *beautifully* booked."). That emphasis is a *style*, not content: the owner
 * writes one sentence and the storefront decides how to set it. Splitting at the
 * last comma reproduces the design's cadence from whatever the owner actually
 * typed, and a title without a comma simply renders unemphasised rather than
 * being padded out with invented words.
 */

export type HeroHeadline = {
  /** Everything before the last comma. */
  lead: string
  /** The clause that carries the emphasis, or null when there is only one clause. */
  emphasis: string | null
}

export function heroHeadline(title: string): HeroHeadline {
  const trimmed = title.trim()
  const comma = trimmed.lastIndexOf(',')

  if (comma <= 0 || comma === trimmed.length - 1) {
    return { lead: trimmed, emphasis: null }
  }

  return {
    lead: trimmed.slice(0, comma + 1),
    emphasis: trimmed.slice(comma + 1).trim() || null,
  }
}

/**
 * The facts strip under the hero.
 *
 * Only facts the backend actually confirmed are passed in; an owner with no
 * phone number and no address gets a shorter strip, not placeholder text.
 */
export function heroFacts(facts: (string | null | undefined)[]): string[] {
  return facts.filter((fact): fact is string => Boolean(fact && fact.trim()))
}
