import type { PublicLandingPageSection } from '../../../lib/api/types'

/**
 * Read the business's booking rules out of its landing-page copy.
 *
 * The backend has no structured policy or booking-rule fields yet, so a rule can
 * only live in a section description: the `about` section carries the deposit and
 * arrival rules, the `booking` section carries the cancellation rule. This reads
 * at most one rule of each kind from those sentences and refuses to guess — a
 * rule whose headline (a number) cannot be read from the text is dropped rather
 * than invented, so the caller can simply render nothing.
 *
 * The `body` is always the original sentence, never a rewrite.
 *
 * TODO: replace this heuristic with structured policy / booking-rule fields on
 * the backend (the `about` and `booking` section DTOs) and delete this file.
 */

export type BusinessRule = {
  /** A short headline read from the sentence, e.g. `30% deposit`. */
  headline: string
  /** The full original sentence the headline was read from. */
  body: string
}

/** Only these sections are allowed to carry policy copy. */
const RULE_SECTIONS = new Set(['about', 'booking'])

const APOSTROPHE = '\u2019'

/** Sentences, trimmed, with terminal punctuation kept. */
function sentences(text: string): string[] {
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
}

function firstMatch(list: string[], pattern: RegExp): string | null {
  return list.find((sentence) => pattern.test(sentence)) ?? null
}

/** At most three rules: deposit, arrival, cancellation. */
export function parseBusinessRules(sections: PublicLandingPageSection[]): BusinessRule[] {
  const corpus = sections
    .filter((section) => RULE_SECTIONS.has(section.key.toLowerCase()))
    .map((section) => (section.description ?? '').trim())
    .filter((text) => text.length > 0)
    .join(' ')

  if (!corpus) return []

  const list = sentences(corpus)
  const claimed = new Set<string>()
  const rules: BusinessRule[] = []

  const take = (
    pattern: RegExp,
    headline: (sentence: string) => string | null,
  ) => {
    const sentence = firstMatch(list, pattern)
    if (!sentence || claimed.has(sentence)) return
    const head = headline(sentence)
    if (!head) return
    claimed.add(sentence)
    rules.push({ headline: head, body: sentence })
  }

  take(/\bdeposit\b/i, (sentence) => {
    const percent = sentence.match(/(\d+(?:[.,]\d+)?)\s*%/)
    return percent ? `${percent[1]}% deposit` : null
  })

  take(/\b(arriv\w*|lateness|late|early)\b/i, (sentence) => {
    const minutes = sentence.match(/(\d+)\s*(?:min(?:ute)?s?|mins?)\b/i)
    if (!minutes) return null
    if (/\bearly\b/i.test(sentence)) return `Arrive ${minutes[1]} minutes early`
    if (/\blate\b/i.test(sentence)) return `${minutes[1]} minutes late`
    return `${minutes[1]} minutes`
  })

  take(/\b(cancel\w*|reschedul\w*)\b/i, (sentence) => {
    const window = sentence.match(/(\d+)\s*(hours?|hrs?|days?)\b/i)
    if (!window) return null
    const unit = /^d/i.test(window[2]) ? 'days' : 'hours'
    return `${window[1]} ${unit}${APOSTROPHE} notice`
  })

  return rules
}
