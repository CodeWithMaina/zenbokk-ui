import { describe, expect, it } from 'vitest'
import {
  ALL_DATES_LABEL,
  calendarPeriod,
  periodDayCount,
  periodLabel,
  presetPeriodUnit,
  shiftPeriod,
  shiftPeriodAnchor,
} from './date-nav'
import type { Period } from './date-nav'

/**
 * The date-navigation model.
 *
 * These are the rules that decide which dates the whole screen is showing, so they
 * are tested directly: month lengths, year transitions, leap years, and the promise
 * that a custom range keeps its own duration when it steps.
 */

const day = (year: number, month: number, date: number) => new Date(year, month, date)
const show = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`

describe('presetPeriodUnit', () => {
  it('maps each preset to the step it takes', () => {
    expect(presetPeriodUnit('today')).toBe('day')
    expect(presetPeriodUnit('tomorrow')).toBe('day')
    expect(presetPeriodUnit('week')).toBe('week')
    expect(presetPeriodUnit('nextweek')).toBe('week')
    expect(presetPeriodUnit('month')).toBe('month')
    expect(presetPeriodUnit('nextmonth')).toBe('month')
    expect(presetPeriodUnit('custom')).toBe('custom')
  })

  it('reports no step for the unbounded preset', () => {
    // "All dates" has no previous or next, so the toolbar must disable the arrows.
    expect(presetPeriodUnit('all')).toBeNull()
  })
})

describe('calendarPeriod', () => {
  it('bounds a month by its real first and last day', () => {
    const period = calendarPeriod('month', day(2026, 10, 10))
    expect(period.unit).toBe('month')
    expect(show(period.from)).toBe('2026-11-01')
    expect(show(period.to)).toBe('2026-11-30')
  })

  it('knows February in a leap year has 29 days', () => {
    expect(show(calendarPeriod('month', day(2028, 1, 5)).to)).toBe('2028-02-29')
    expect(show(calendarPeriod('month', day(2027, 1, 5)).to)).toBe('2027-02-28')
  })

  it('treats a week as Monday-first, matching the grid', () => {
    // Sunday 15 Nov 2026 belongs to the week that starts Monday 9 Nov.
    const period = calendarPeriod('week', day(2026, 10, 15))
    expect(show(period.from)).toBe('2026-11-09')
    expect(show(period.to)).toBe('2026-11-15')
  })

  it('makes a day period one day long', () => {
    const period = calendarPeriod('day', day(2026, 10, 10))
    expect(show(period.from)).toBe('2026-11-10')
    expect(periodDayCount(period.from, period.to)).toBe(1)
  })
})

describe('shiftPeriod', () => {
  it('steps a day, a week and a month by one', () => {
    expect(show(shiftPeriod(calendarPeriod('day', day(2026, 10, 10)), 1).from)).toBe('2026-11-11')
    expect(show(shiftPeriod(calendarPeriod('week', day(2026, 10, 10)), 1).from)).toBe('2026-11-16')
    const month = shiftPeriod(calendarPeriod('month', day(2026, 10, 10)), -1)
    expect(show(month.from)).toBe('2026-10-01')
    expect(show(month.to)).toBe('2026-10-31')
  })

  it('rolls across a year boundary in both directions', () => {
    const forward = shiftPeriod(calendarPeriod('month', day(2026, 11, 20)), 1)
    expect(show(forward.from)).toBe('2027-01-01')
    const back = shiftPeriod(calendarPeriod('month', day(2027, 0, 15)), -1)
    expect(show(back.from)).toBe('2026-12-01')
  })

  it('clamps a 31-day month into February instead of spilling into March', () => {
    const february = shiftPeriod(calendarPeriod('month', day(2027, 0, 31)), 1)
    expect(show(february.from)).toBe('2027-02-01')
    expect(show(february.to)).toBe('2027-02-28')
    // …and the same step in a leap year lands on the 29th.
    const leap = shiftPeriod(calendarPeriod('month', day(2028, 0, 31)), 1)
    expect(show(leap.to)).toBe('2028-02-29')
  })

  it('preserves the duration of a custom range', () => {
    // A fortnight steps by a fortnight, not by a month.
    const window: Period = { unit: 'custom', from: day(2026, 10, 1), to: day(2026, 10, 15) }
    expect(periodDayCount(window.from, window.to)).toBe(15)
    const next = shiftPeriod(window, 1)
    expect(show(next.from)).toBe('2026-11-16')
    expect(show(next.to)).toBe('2026-11-30')
    const back = shiftPeriod(window, -1)
    expect(show(back.from)).toBe('2026-10-17')
    expect(show(back.to)).toBe('2026-10-31')
  })

  it('uses calendar arithmetic, so a week stays on the same weekday', () => {
    // A fixed 7x24h offset lands on the wrong day across a daylight-saving change.
    const week = calendarPeriod('week', day(2026, 2, 22)) // the week starting Mon 16 Mar 2026
    expect(show(week.from)).toBe('2026-03-16')
    const next = shiftPeriod(week, 1)
    expect(next.from.getDay()).toBe(1) // still a Monday
    expect(show(next.from)).toBe('2026-03-23')
  })
})


describe('shiftPeriodAnchor', () => {
  it('keeps the day of the month when it fits', () => {
    const period = calendarPeriod('month', day(2026, 10, 10))
    expect(show(shiftPeriodAnchor(period, day(2026, 10, 10), 1))).toBe('2026-12-10')
  })

  it('clamps into a shorter month rather than skipping it', () => {
    // 31 Jan stepping forward a month must land in February, not March.
    const jan31 = day(2027, 0, 31)
    const period = calendarPeriod('month', jan31)
    expect(show(shiftPeriodAnchor(period, jan31, 1))).toBe('2027-02-28')
  })

  it('allows 29 February when the target year has it', () => {
    const jan31 = day(2028, 0, 31)
    const period = calendarPeriod('month', jan31)
    expect(show(shiftPeriodAnchor(period, jan31, 1))).toBe('2028-02-29')
  })

  it('moves the selected date with the period it is showing', () => {
    const period = calendarPeriod('week', day(2026, 10, 12)) // Tue 12 Nov
    const anchor = shiftPeriodAnchor(period, day(2026, 10, 12), 1)
    expect(show(anchor)).toBe('2026-11-19')
    expect(anchor.getDay()).toBe(4) // still a Thursday
  })

  it('keeps the anchor inside the custom range as it steps', () => {
    const window: Period = { unit: 'custom', from: day(2026, 10, 1), to: day(2026, 10, 7) }
    expect(show(shiftPeriodAnchor(window, day(2026, 10, 3), 1))).toBe('2026-11-10')
  })
})


describe('periodLabel', () => {
  const today = day(2026, 10, 10)

  it('says Today only for today', () => {
    expect(periodLabel(calendarPeriod('day', today), today)).toBe('Today')
    expect(periodLabel(calendarPeriod('day', day(2026, 10, 11)), today)).not.toBe('Today')
  })

  it('says This week only while the week really is this one', () => {
    expect(periodLabel(calendarPeriod('week', today), today)).toBe('This week')
    // One week on, the label names the dates instead of claiming the present.
    const next = shiftPeriod(calendarPeriod('week', today), 1)
    expect(periodLabel(next, today)).toBe('Mon 16 Nov – Sun 22 Nov')
  })

  it('says This month only for the current month', () => {
    expect(periodLabel(calendarPeriod('month', today), today)).toBe('This month')
    expect(periodLabel(calendarPeriod('month', day(2027, 0, 4)), today)).toBe('January 2027')
  })

  it('names a custom range by its dates', () => {
    const window: Period = { unit: 'custom', from: day(2026, 10, 1), to: day(2026, 10, 15) }
    expect(periodLabel(window, today)).toBe('Sun 1 Nov – Sun 15 Nov')
  })

  it('keeps the year when a range leaves the current year or crosses New Year', () => {
    const lastYear: Period = { unit: 'custom', from: day(2025, 10, 1), to: day(2025, 10, 15) }
    expect(periodLabel(lastYear, today)).toBe('Sat, 1 Nov 2025 – Sat, 15 Nov 2025')

    // The week that straddles New Year must not read as one date range in one year.
    const straddle = calendarPeriod('week', day(2026, 11, 30))
    expect(periodLabel(straddle, today)).toBe('Mon, 28 Dec 2026 – Sun, 3 Jan 2027')
  })

  it('keeps the year on a single day that is not in the current year', () => {
    expect(periodLabel(calendarPeriod('day', day(2027, 0, 4)), today)).toBe('Mon, 4 Jan 2027')
  })

  it('is never "This month" once the period has moved months', () => {
    const december = shiftPeriod(calendarPeriod('month', today), 1)
    expect(periodLabel(december, today)).toBe('December 2026')
  })
})

describe('periodDayCount', () => {
  it('counts both ends of the range', () => {
    expect(periodDayCount(day(2026, 10, 1), day(2026, 10, 1))).toBe(1)
    expect(periodDayCount(day(2026, 10, 1), day(2026, 10, 7))).toBe(7)
    expect(periodDayCount(day(2026, 2, 1), day(2026, 2, 31))).toBe(31)
  })

  it('never reports a period shorter than a day', () => {
    expect(periodDayCount(day(2026, 10, 10), day(2026, 10, 9))).toBe(1)
  })
})

describe('ALL_DATES_LABEL', () => {
  it('is the wording the toolbar shows when nothing is date-filtered', () => {
    expect(ALL_DATES_LABEL).toBe('All dates')
  })
})

