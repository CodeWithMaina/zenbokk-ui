import { describe, expect, it } from 'vitest'
import {
  addDaysToDateKey,
  browserTimeZone,
  businessDateKey,
  businessToday,
  dateKeyToParts,
  dateKeyWeekday,
  isValidTimeZone,
  resolveTimeZone,
  zonedDateKey,
  zonedMinuteOfDay,
  zonedNextDayStartUtc,
  zonedParts,
  zonedStartOfDayUtc,
  zonedTimeToUtc,
} from './timezone'

/**
 * Business-timezone arithmetic.
 *
 * The suite runs with the browser timezone at `Africa/Nairobi` (UTC+3, no DST), so a
 * business timezone that equals the browser's and one that differs are both exercised.
 * A business in Nairobi must never have an appointment shifted into another day
 * because the dashboard was opened from New York — that is what these tests pin.
 */

const NAIROBI = 'Africa/Nairobi'
const NEW_YORK = 'America/New_York'

describe('timezone resolution', () => {
  it('reads a browser timezone', () => {
    expect(browserTimeZone().length).toBeGreaterThan(0)
  })

  it('accepts only identifiers the platform knows', () => {
    expect(isValidTimeZone(NAIROBI)).toBe(true)
    expect(isValidTimeZone('America/New_York')).toBe(true)
    expect(isValidTimeZone('Mars/Olympus')).toBe(false)
    expect(isValidTimeZone('')).toBe(false)
    expect(isValidTimeZone(null)).toBe(false)
  })

  it('prefers the business timezone and falls back when it is unusable', () => {
    expect(resolveTimeZone(NEW_YORK, NAIROBI)).toBe(NEW_YORK)
    // A missing or unrecognised business timezone falls back rather than throwing.
    expect(resolveTimeZone(null, NAIROBI)).toBe(NAIROBI)
    expect(resolveTimeZone('Mars/Olympus', NAIROBI)).toBe(NAIROBI)
    expect(resolveTimeZone(undefined, 'Mars/Olympus')).toBe('UTC')
  })
})

describe('reading an instant in a timezone', () => {
  it('expresses an instant as business wall-clock parts', () => {
    // 21:30 UTC is 00:30 the next day in Nairobi (UTC+3).
    const parts = zonedParts('2026-05-12T21:30:00.000Z', NAIROBI)
    expect(parts).toMatchObject({ year: 2026, month: 5, day: 13, hour: 0, minute: 30, weekday: 3 })
  })

  it('reads minutes from local midnight', () => {
    expect(zonedMinuteOfDay('2026-05-12T06:15:00.000Z', NAIROBI)).toBe(9 * 60 + 15)
    expect(zonedMinuteOfDay('2026-05-12T06:15:00.000Z', NEW_YORK)).toBe(2 * 60 + 15)
  })
})

describe('business-local date keys', () => {
  it('keeps an instant on its business day when the business is the browser', () => {
    expect(zonedDateKey('2026-05-12T09:00:00.000Z', NAIROBI)).toBe('2026-05-12')
    expect(businessDateKey(NAIROBI, '2026-05-12T20:59:00.000Z')).toBe('2026-05-12')
  })

  it('rolls to the next business day just past business midnight', () => {
    expect(zonedDateKey('2026-05-12T21:00:00.000Z', NAIROBI)).toBe('2026-05-13')
  })

  it('does not shift a day when the business timezone differs from the browser', () => {
    // 02:00 UTC is 22:00 the previous day in New York but 05:00 the same day in Nairobi.
    expect(zonedDateKey('2026-05-12T02:00:00.000Z', NEW_YORK)).toBe('2026-05-11')
    expect(zonedDateKey('2026-05-12T02:00:00.000Z', NAIROBI)).toBe('2026-05-12')
  })

  it('handles an appointment near UTC midnight', () => {
    expect(zonedDateKey('2026-05-12T23:59:00.000Z', NAIROBI)).toBe('2026-05-13')
  })

  it('handles month and year boundaries', () => {
    expect(zonedDateKey('2026-05-31T21:00:00.000Z', NAIROBI)).toBe('2026-06-01')
    expect(zonedDateKey('2026-12-31T21:00:00.000Z', NAIROBI)).toBe('2027-01-01')
    expect(zonedDateKey('2026-12-31T21:00:00.000Z', NEW_YORK)).toBe('2026-12-31')
  })
})

describe('business-local wall-clock to UTC', () => {
  it('resolves a business-local midnight to the right UTC instant', () => {
    expect(zonedStartOfDayUtc('2026-05-12', NAIROBI).toISOString()).toBe('2026-05-11T21:00:00.000Z')
    expect(zonedNextDayStartUtc('2026-05-12', NAIROBI).toISOString()).toBe(
      '2026-05-12T21:00:00.000Z',
    )
  })

  it('uses each side of a daylight-saving change correctly', () => {
    // EST (UTC−5) before the change, EDT (UTC−4) after it.
    expect(zonedTimeToUtc({ year: 2026, month: 3, day: 7, hour: 9 }, NEW_YORK).toISOString()).toBe(
      '2026-03-07T14:00:00.000Z',
    )
    expect(zonedTimeToUtc({ year: 2026, month: 3, day: 9, hour: 9 }, NEW_YORK).toISOString()).toBe(
      '2026-03-09T13:00:00.000Z',
    )
  })

  it('resolves a non-existent and an ambiguous wall-clock time deterministically', () => {
    // The spring-forward gap (02:00–03:00 on 8 Mar 2026 does not exist).
    expect(
      zonedTimeToUtc({ year: 2026, month: 3, day: 8, hour: 2, minute: 30 }, NEW_YORK).toISOString(),
    ).toBe('2026-03-08T06:30:00.000Z')
    // The autumn overlap: the first occurrence (EDT) is chosen.
    expect(
      zonedTimeToUtc({ year: 2026, month: 11, day: 1, hour: 1, minute: 30 }, NEW_YORK).toISOString(),
    ).toBe('2026-11-01T05:30:00.000Z')
  })

  it('handles a fixed-offset timezone with no DST', () => {
    // Nairobi is a constant UTC+3 all year.
    expect(zonedTimeToUtc({ year: 2026, month: 1, day: 15, hour: 9 }, NAIROBI).toISOString()).toBe(
      '2026-01-15T06:00:00.000Z',
    )
    expect(zonedTimeToUtc({ year: 2026, month: 7, day: 15, hour: 9 }, NAIROBI).toISOString()).toBe(
      '2026-07-15T06:00:00.000Z',
    )
  })
})

describe('business "today"', () => {
  it('is the business’s date, not the viewer’s', () => {
    expect(businessToday(NAIROBI, '2026-05-12T21:30:00.000Z').getDate()).toBe(13)
    expect(businessToday(NAIROBI, '2026-05-12T20:30:00.000Z').getDate()).toBe(12)
    expect(businessToday(NEW_YORK, '2026-05-12T02:00:00.000Z').getDate()).toBe(11)
  })
})

describe('date-key arithmetic', () => {
  it('adds days across month and year boundaries', () => {
    expect(addDaysToDateKey('2026-05-31', 1)).toBe('2026-06-01')
    expect(addDaysToDateKey('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDaysToDateKey('2026-03-01', -1)).toBe('2026-02-28')
    expect(addDaysToDateKey('not-a-date', 1)).toBe('not-a-date')
  })

  it('computes the weekday of a key', () => {
    // 11 May 2026 is a Monday.
    expect(dateKeyWeekday('2026-05-11')).toBe(1)
    expect(dateKeyWeekday('2026-05-10')).toBe(0)
  })

  it('parses a key and rejects a malformed one', () => {
    expect(dateKeyToParts('2026-05-12')).toEqual({ year: 2026, month: 5, day: 12 })
    expect(dateKeyToParts('12/05/2026')).toBeNull()
  })
})
