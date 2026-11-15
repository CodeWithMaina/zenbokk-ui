import { describe, expect, it } from 'vitest'
import { makeOpeningHours } from '../../test/fixtures'
import {
  DEFAULT_CLOSE_MINUTE,
  DEFAULT_OPEN_MINUTE,
  clockToMinute,
  isRangeClosed,
  localDateKey,
  minuteToClock,
  resolveDaySchedule,
  scheduleBand,
} from './business-hours'

/**
 * The business-schedule helpers behind the calendar's band.
 *
 * These are the rules that stop the calendar assuming every business works 08:00–20:00:
 * a late-opening Saturday, a closed Sunday and a dated holiday all have to resolve to
 * something the time grid can draw. The dates below are fixed so the weekday each one
 * falls on is not a guess: 10–16 May 2026 runs Sunday → Saturday.
 */

const SUNDAY = new Date(2026, 4, 10)
const MONDAY = new Date(2026, 4, 11)
const SATURDAY = new Date(2026, 4, 16)

/** Opens 07:30–16:00 on weekdays, 10:00–14:00 on Saturday, closed on Sunday. */
function officeHours() {
  return makeOpeningHours({
    days: [
      { day: 'sunday', dayOfWeek: 0, isClosed: true, periods: [] },
      {
        day: 'monday',
        dayOfWeek: 1,
        isClosed: false,
        periods: [{ opensAt: '07:30', closesAt: '16:00', breakStartsAt: null, breakEndsAt: null }],
      },
      {
        day: 'tuesday',
        dayOfWeek: 2,
        isClosed: false,
        periods: [{ opensAt: '07:30', closesAt: '16:00', breakStartsAt: null, breakEndsAt: null }],
      },
      {
        day: 'wednesday',
        dayOfWeek: 3,
        isClosed: false,
        periods: [{ opensAt: '07:30', closesAt: '16:00', breakStartsAt: null, breakEndsAt: null }],
      },
      {
        day: 'thursday',
        dayOfWeek: 4,
        isClosed: false,
        periods: [{ opensAt: '07:30', closesAt: '16:00', breakStartsAt: null, breakEndsAt: null }],
      },
      {
        day: 'friday',
        dayOfWeek: 5,
        isClosed: false,
        periods: [{ opensAt: '07:30', closesAt: '16:00', breakStartsAt: null, breakEndsAt: null }],
      },
      {
        day: 'saturday',
        dayOfWeek: 6,
        isClosed: false,
        periods: [{ opensAt: '10:00', closesAt: '14:00', breakStartsAt: null, breakEndsAt: null }],
      },
    ],
  })
}

describe('clock helpers', () => {
  it('parses business-local clock strings to minutes', () => {
    expect(clockToMinute('07:30')).toBe(450)
    expect(clockToMinute('00:00')).toBe(0)
    expect(clockToMinute('24:00')).toBe(1440)
    expect(clockToMinute('09:00:00')).toBeNull()
    expect(clockToMinute('nonsense')).toBeNull()
    expect(clockToMinute(null)).toBeNull()
  })

  it('renders minutes back as a clock string', () => {
    expect(minuteToClock(450)).toBe('07:30')
    expect(minuteToClock(1440)).toBe('24:00')
    expect(minuteToClock(-30)).toBe('00:00')
  })

  it('keys a date by its local calendar day', () => {
    expect(localDateKey(MONDAY)).toBe('2026-05-11')
  })
})

describe('resolveDaySchedule', () => {
  it('uses the business’s real hours for the weekday', () => {
    const monday = resolveDaySchedule(officeHours(), MONDAY)
    expect(monday.isClosed).toBe(false)
    expect(monday.periods).toEqual([{ openMinute: 450, closeMinute: 960 }])

    const saturday = resolveDaySchedule(officeHours(), SATURDAY)
    expect(saturday.periods).toEqual([{ openMinute: 600, closeMinute: 840 }])
  })

  it('reports a closed weekday as closed', () => {
    expect(resolveDaySchedule(officeHours(), SUNDAY).isClosed).toBe(true)
  })

  it('lets a dated exception override the weekly pattern', () => {
    const hours = makeOpeningHours({
      ...officeHours(),
      specialHours: [{ date: '2026-05-11', isClosed: true, label: 'Public holiday', periods: [] }],
    })
    expect(resolveDaySchedule(hours, MONDAY).isClosed).toBe(true)
  })

  it('never invents a closure when the hours are unknown', () => {
    const unknown = resolveDaySchedule(null, SUNDAY)
    expect(unknown.isClosed).toBe(false)
    expect(unknown.periods[0].openMinute).toBe(DEFAULT_OPEN_MINUTE)
  })
})

describe('scheduleBand', () => {
  it('spans the earliest opening to the latest closing across the days shown', () => {
    // Weekday 07:30–16:00 and Saturday 10:00–14:00 ⇒ band 07:00–16:00.
    expect(scheduleBand(officeHours(), [MONDAY, SATURDAY])).toEqual({
      startMinute: 420,
      endMinute: 960,
    })
  })

  it('falls back to a safe band when the hours are unknown', () => {
    expect(scheduleBand(null, [MONDAY])).toEqual({
      startMinute: DEFAULT_OPEN_MINUTE,
      endMinute: DEFAULT_CLOSE_MINUTE,
    })
  })

  it('falls back when every shown day is closed', () => {
    expect(scheduleBand(officeHours(), [SUNDAY])).toEqual({
      startMinute: DEFAULT_OPEN_MINUTE,
      endMinute: DEFAULT_CLOSE_MINUTE,
    })
  })
})

describe('isRangeClosed', () => {
  it('is true only when every day in the range is closed', () => {
    expect(isRangeClosed(officeHours(), [SUNDAY])).toBe(true)
    expect(isRangeClosed(officeHours(), [SUNDAY, MONDAY])).toBe(false)
    expect(isRangeClosed(null, [SUNDAY])).toBe(false)
  })
})
