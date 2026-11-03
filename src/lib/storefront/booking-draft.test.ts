import { describe, expect, it } from 'vitest'
import {
  BOOKING_STEPS,
  clearBookingDraft,
  emptyDraft,
  readBookingDraft,
  writeBookingDraft,
} from './booking-draft'

/**
 * The in-progress booking ("the lineup").
 *
 * It lives in `sessionStorage` so it survives the sign-in round trip and the OTP
 * step, and it is keyed per business so browsing two storefronts in two tabs
 * cannot mix their lineups. Those two properties are what make the guest flow
 * possible at all, so they are asserted rather than assumed.
 */
const BUSINESS_A = '11111111-1111-1111-1111-111111111111'
const BUSINESS_B = '22222222-2222-2222-2222-222222222222'

describe('booking draft', () => {
  it('is empty when nothing has been chosen', () => {
    expect(readBookingDraft(BUSINESS_A)).toEqual(emptyDraft)
  })

  it('round-trips a lineup', () => {
    writeBookingDraft(BUSINESS_A, {
      serviceIds: ['s1', 's2'],
      staffId: 'st1',
      startsAt: '2026-05-12T09:30:00Z',
      notes: 'Allergic to almond oil',
      step: 'details',
    })

    expect(readBookingDraft(BUSINESS_A)).toEqual({
      serviceIds: ['s1', 's2'],
      staffId: 'st1',
      startsAt: '2026-05-12T09:30:00Z',
      notes: 'Allergic to almond oil',
      step: 'details',
    })
  })

  it('keeps two businesses’ lineups apart', () => {
    writeBookingDraft(BUSINESS_A, { ...emptyDraft, serviceIds: ['a1'], step: 'services' })
    writeBookingDraft(BUSINESS_B, { ...emptyDraft, serviceIds: ['b1'], step: 'time' })

    expect(readBookingDraft(BUSINESS_A).serviceIds).toEqual(['a1'])
    expect(readBookingDraft(BUSINESS_B).serviceIds).toEqual(['b1'])

    clearBookingDraft(BUSINESS_A)
    expect(readBookingDraft(BUSINESS_A).serviceIds).toEqual([])
    // Clearing one business must not touch the other.
    expect(readBookingDraft(BUSINESS_B).serviceIds).toEqual(['b1'])
  })

  it('survives corrupt or partial stored data', () => {
    window.sessionStorage.setItem('punched.booking-draft.' + BUSINESS_A, 'not json')
    expect(readBookingDraft(BUSINESS_A)).toEqual(emptyDraft)

    window.sessionStorage.setItem(
      'punched.booking-draft.' + BUSINESS_A,
      JSON.stringify({ serviceIds: ['ok', 7, '', null], step: 'nonsense' }),
    )
    expect(readBookingDraft(BUSINESS_A)).toEqual({ ...emptyDraft, serviceIds: ['ok'] })
  })

  it('resumes an old draft at the payment step instead of the start', () => {
    // `review` was the final step's name before it became a real payment step.
    window.sessionStorage.setItem(
      'punched.booking-draft.' + BUSINESS_A,
      JSON.stringify({ ...emptyDraft, serviceIds: ['s1'], step: 'review' }),
    )

    expect(readBookingDraft(BUSINESS_A).step).toBe('payment')
    expect(readBookingDraft(BUSINESS_A).serviceIds).toEqual(['s1'])
  })

  it('knows the five steps of the wizard', () => {
    expect(BOOKING_STEPS).toEqual(['services', 'staff', 'time', 'details', 'payment'])
  })
})
