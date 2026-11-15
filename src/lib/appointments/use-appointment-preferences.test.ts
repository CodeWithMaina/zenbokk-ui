import { beforeEach, describe, expect, it } from 'vitest'
import {
  DEFAULT_APPOINTMENT_PREFERENCES,
  readAppointmentPreferences,
} from './use-appointment-preferences'

/**
 * Stored view preferences.
 *
 * The rule these protect: a preference survives a reload, and a value the UI no longer
 * understands falls back to the default instead of breaking the module. Anything that
 * describes a question asked right now (a search term, a date range) is deliberately
 * NOT remembered, so nothing here should ever restore one.
 */

const BUSINESS = '11111111-1111-4111-8111-111111111111'
const OTHER_BUSINESS = '22222222-2222-4222-8222-222222222222'

describe('appointment preferences', () => {
  beforeEach(() => window.localStorage.clear())

  it('starts from the defaults when nothing has been chosen', () => {
    expect(readAppointmentPreferences(BUSINESS)).toEqual(DEFAULT_APPOINTMENT_PREFERENCES)
  })

  it('restores a saved view, granularity and order', () => {
    window.localStorage.setItem(
      `punched.appointments.preferences.v1.${BUSINESS}`,
      JSON.stringify({ view: 'table', mode: 'month', sort: 'created-desc' }),
    )

    expect(readAppointmentPreferences(BUSINESS)).toEqual({
      view: 'table',
      mode: 'month',
      sort: 'created-desc',
    })
  })

  it('keeps one business’s preference out of another business', () => {
    window.localStorage.setItem(
      `punched.appointments.preferences.v1.${BUSINESS}`,
      JSON.stringify({ view: 'cards' }),
    )

    expect(readAppointmentPreferences(OTHER_BUSINESS).view).toBe(
      DEFAULT_APPOINTMENT_PREFERENCES.view,
    )
  })

  it('falls back for a value the UI no longer knows', () => {
    window.localStorage.setItem(
      `punched.appointments.preferences.v1.${BUSINESS}`,
      JSON.stringify({ view: 'board', mode: 'fortnight', sort: 'vibes' }),
    )

    expect(readAppointmentPreferences(BUSINESS)).toEqual(DEFAULT_APPOINTMENT_PREFERENCES)
  })

  it('survives a corrupt entry rather than throwing', () => {
    window.localStorage.setItem(`punched.appointments.preferences.v1.${BUSINESS}`, '{not json')

    expect(() => readAppointmentPreferences(BUSINESS)).not.toThrow()
    expect(readAppointmentPreferences(BUSINESS)).toEqual(DEFAULT_APPOINTMENT_PREFERENCES)
  })
})
