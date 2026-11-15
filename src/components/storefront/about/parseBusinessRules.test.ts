import { describe, expect, it } from 'vitest'
import type { PublicLandingPageSection } from '../../../lib/api/types'
import { parseBusinessRules } from './parseBusinessRules'

/**
 * Rule parsing.
 *
 * The policy text lives in free-text section descriptions until the backend
 * exposes structured fields, so the parser must read the numbers out of real
 * sentences — and refuse to invent one it cannot find.
 */

function section(key: string, description: string | null): PublicLandingPageSection {
  return { key, order: 0, title: null, description }
}

describe('parseBusinessRules', () => {
  it('reads deposit, arrival and cancellation from the about and booking copy', () => {
    const rules = parseBusinessRules([
      section('services', 'Walk-ins are welcome before noon.'),
      section(
        'about',
        'A 30% deposit secures bridal and braiding appointments. Arrive 10 minutes early so we can settle you in.',
      ),
      section('booking', 'Cancel or reschedule with 24 hours notice and keep your deposit.'),
    ])

    expect(rules.map((rule) => rule.headline)).toEqual([
      '30% deposit',
      'Arrive 10 minutes early',
      '24 hours\u2019 notice',
    ])
    // The body is the original sentence, never a rewrite.
    expect(rules[0].body).toBe('A 30% deposit secures bridal and braiding appointments.')
    expect(rules[1].body).toBe('Arrive 10 minutes early so we can settle you in.')
    expect(rules[2].body).toBe('Cancel or reschedule with 24 hours notice and keep your deposit.')
  })

  it('reads a lateness headline when the copy uses “late”, not “early”', () => {
    const rules = parseBusinessRules([
      section('about', 'Arrivals more than 20 minutes late may be shortened or rescheduled.'),
    ])
    expect(rules).toHaveLength(1)
    expect(rules[0].headline).toBe('20 minutes late')
  })

  it('ignores sections that are not about or booking', () => {
    const rules = parseBusinessRules([
      section('gallery', 'A 50% deposit is required. Cancel with 2 hours notice please.'),
      section('services', 'Arrive 5 minutes early.'),
    ])
    expect(rules).toEqual([])
  })

  it('never invents a rule it cannot read a number for', () => {
    const rules = parseBusinessRules([
      section('about', 'A deposit secures your appointment. Please arrive early.'),
      section('booking', 'You can cancel at any point.'),
    ])
    expect(rules).toEqual([])
  })

  it('does not reuse one sentence for two rules', () => {
    const rules = parseBusinessRules([
      section('about', 'Pay a 40% deposit and arrive 15 minutes early to be safe.'),
    ])
    // The single sentence is claimed by the deposit rule; arrival finds no other.
    expect(rules.map((rule) => rule.headline)).toEqual(['40% deposit'])
  })

  it('returns nothing when there is no policy copy at all', () => {
    expect(parseBusinessRules([section('about', null), section('booking', '')])).toEqual([])
    expect(parseBusinessRules([])).toEqual([])
  })
})
