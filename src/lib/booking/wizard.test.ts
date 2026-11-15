import { describe, expect, it } from 'vitest'
import type { AvailabilitySlot } from '../api/types'
import {
  bookingEndMinutes,
  bookingPaymentAmount,
  bookingStepComplete,
  bookingStepIssue,
  checkCustomTime,
  clockToMinutes,
  emptyBookingDraft,
  groupSlots,
  minutesToClock,
  normaliseBookingPercent,
  normaliseMpesaCode,
  outstandingBalance,
  recordedAmount,
  roundUpToFiveMinutes,
  serviceTotals,
  todayKey,
  validateMpesaCode,
  weekDates,
  weekStart,
} from './wizard'
import type { BookingDraft } from './wizard'

function slot(localTime: string, overrides: Partial<AvailabilitySlot> = {}): AvailabilitySlot {
  return {
    startAtUtc: `2026-05-12T${localTime}:00.000Z`,
    endAtUtc: `2026-05-12T${localTime}:00.000Z`,
    staffUserId: null,
    staffName: '',
    serviceIds: [],
    status: 'available',
    isAvailable: true,
    localDate: '2026-05-12',
    localTime,
    dayPart: 'morning',
    alternativeStaff: [],
    ...overrides,
  }
}

/** A draft with two services: 3,500 + 1,200 = 4,700 over 90 + 45 = 135 minutes. */
function draftWithServices(overrides: Partial<BookingDraft> = {}): BookingDraft {
  return {
    ...emptyBookingDraft(),
    type: 'appointment',
    services: [
      { id: 'a', name: 'Silk press', price: 3500, durationMinutes: 90 },
      { id: 'b', name: 'Blow-dry', price: 1200, durationMinutes: 45 },
    ],
    date: '2026-05-12',
    slot: '09:30',
    ...overrides,
  }
}

describe('serviceTotals', () => {
  it('sums price and duration one service after another', () => {
    expect(serviceTotals(draftWithServices().services)).toEqual({
      price: 4700,
      durationMinutes: 135,
    })
  })

  it('is zero for an empty selection', () => {
    expect(serviceTotals([])).toEqual({ price: 0, durationMinutes: 0 })
  })
})

describe('clock helpers', () => {
  it('formats minutes as a zero-padded clock', () => {
    expect(minutesToClock(0)).toBe('00:00')
    expect(minutesToClock(570)).toBe('09:30')
    expect(minutesToClock(null)).toBe('')
  })

  it('parses a clock back to minutes and refuses nonsense', () => {
    expect(clockToMinutes('09:30')).toBe(570)
    expect(clockToMinutes('7:05')).toBe(425)
    expect(clockToMinutes('24:00')).toBeNull()
    expect(clockToMinutes('')).toBeNull()
  })

  it('walks a booking end forward by the summed duration', () => {
    expect(bookingEndMinutes(draftWithServices())).toBe(570 + 135)
  })
})

describe('walk-in start rounding', () => {
  it('rounds up to the next five minutes', () => {
    expect(roundUpToFiveMinutes(new Date(2026, 4, 12, 9, 31))).toBe(9 * 60 + 35)
    expect(roundUpToFiveMinutes(new Date(2026, 4, 12, 9, 35))).toBe(9 * 60 + 35)
    expect(roundUpToFiveMinutes(new Date(2026, 4, 12, 9, 30))).toBe(9 * 60 + 30)
  })
})

describe('payment maths', () => {
  it('rounds the booking percentage to the nearest shilling', () => {
    expect(bookingPaymentAmount(4700, 30)).toBe(1410)
    expect(bookingPaymentAmount(4555, 30)).toBe(1367) // 1366.5 → 1367
  })

  it('records the full total, the deposit, or nothing at all', () => {
    expect(recordedAmount(draftWithServices({ plan: 'full' }))).toBe(4700)
    expect(recordedAmount(draftWithServices({ plan: 'booking', percent: 30 }))).toBe(1410)
    expect(recordedAmount(draftWithServices({ plan: 'after' }))).toBe(0)
  })

  it('never lets a deposit exceed the total', () => {
    const draft = draftWithServices({ plan: 'booking', percent: 150 })
    expect(recordedAmount(draft)).toBe(4700)
    expect(outstandingBalance(draft)).toBe(0)
  })

  it('leaves the whole balance outstanding on a pay-after-service booking', () => {
    expect(outstandingBalance(draftWithServices({ plan: 'after' }))).toBe(4700)
  })

  it('clamps an unusable percentage to the fallback', () => {
    expect(normaliseBookingPercent('30')).toBe(30)
    expect(normaliseBookingPercent('')).toBe(30)
    expect(normaliseBookingPercent('abc')).toBe(30)
  })
})

describe('M-Pesa transaction codes', () => {
  it('upper-cases and strips anything that is not A-Z or 0-9', () => {
    expect(normaliseMpesaCode('qg h7-x2k9lm')).toBe('QGH7X2K9LM')
    expect(normaliseMpesaCode('qgh7x2k9lmextra')).toBe('QGH7X2K9LM')
  })

  it('accepts a 10-character code', () => {
    expect(validateMpesaCode('QGH7X2K9LM')).toBeNull()
    expect(validateMpesaCode('qgh7x2k9lm')).toBeNull()
  })

  it('refuses a code that is short, long or empty', () => {
    expect(validateMpesaCode('')).toMatch(/Enter the M-Pesa transaction code/)
    expect(validateMpesaCode('QGH7X2K9L')).toMatch(/exactly 10 characters/)
  })

  it('accepts a code built from digits, which the design allows (A-Z and 0-9)', () => {
    expect(validateMpesaCode('1234567890')).toBeNull()
  })

describe('step validation', () => {
  it('wants a booking type and a customer on the first step', () => {
    const blank = emptyBookingDraft()
    expect(bookingStepIssue(0, blank)).toMatch(/walk-in or an appointment/)
    expect(bookingStepIssue(0, { ...blank, type: 'walk_in' })).toMatch(/Select the customer/)
    expect(
      bookingStepComplete(0, {
        ...blank,
        type: 'walk_in',
        customer: {
          userId: 'c1',
          fullName: 'Zawadi Achieng',
          email: 'z@example.test',
          phoneNumber: null,
          avatarUrl: null,
          enrollmentStatus: 'active',
        },
      }),
    ).toBe(true)
  })

  it('wants at least one service', () => {
    expect(bookingStepComplete(1, emptyBookingDraft())).toBe(false)
    expect(bookingStepComplete(1, draftWithServices())).toBe(true)
  })

  it('wants a slot only for an appointment', () => {
    const walkIn = draftWithServices({ type: 'walk_in', date: null, slot: null })
    expect(bookingStepComplete(2, walkIn)).toBe(true)
    expect(bookingStepComplete(2, draftWithServices({ slot: null }))).toBe(false)
  })

  it('accepts a pay-after-service booking with nothing recorded', () => {
    const draft = draftWithServices({ plan: 'after', method: 'mpesa', transactionCode: '' })
    expect(bookingStepComplete(3, draft)).toBe(true)
  })

  it('refuses a booking percentage outside 1–99', () => {
    const draft = draftWithServices({ plan: 'booking', percent: 0, method: 'cash' })
    expect(bookingStepIssue(3, draft)).toMatch(/between 1 and 99/)
    expect(bookingStepComplete(3, { ...draft, percent: 30 })).toBe(true)
  })

  it('refuses an M-Pesa payment without a valid code or a payer phone', () => {
    const draft = draftWithServices({ plan: 'full', method: 'mpesa' })
    expect(bookingStepIssue(3, draft)).toMatch(/M-Pesa transaction code/)
    expect(bookingStepComplete(3, { ...draft, transactionCode: 'QGH7X2K9LM' })).toBe(false)
    expect(
      bookingStepComplete(3, {
        ...draft,
        transactionCode: 'QGH7X2K9LM',
        payerPhone: '0712345678',
      }),
    ).toBe(true)
  })

  it('never blocks a cash payment on a code', () => {
    expect(bookingStepComplete(3, draftWithServices({ method: 'cash' }))).toBe(true)
  })
})

describe('week and slot helpers', () => {
  it('starts the strip on Monday', () => {
    // 2026-05-12 is a Tuesday.
    expect(weekStart(new Date(2026, 4, 12)).getDate()).toBe(11)
    expect(weekStart(new Date(2026, 4, 17)).getDate()).toBe(11) // Sunday belongs to that week
    expect(weekDates(new Date(2026, 4, 13))).toHaveLength(7)
    expect(weekDates(new Date(2026, 4, 13))[6].getDate()).toBe(17)
  })

  it('keys today in the local timezone', () => {
    expect(todayKey(new Date(2026, 4, 12, 23, 59))).toBe('2026-05-12')
  })
})

describe('groupSlots', () => {
  it('uses the server’s own day parts, in the order they occur', () => {
    const groups = groupSlots([
      slot('14:00', { dayPart: 'afternoon' }),
      slot('09:00', { dayPart: 'morning' }),
      slot('10:00', { dayPart: 'morning' }),
    ])
    expect(groups.map((group) => group.label)).toEqual(['Morning', 'Afternoon'])
    expect(groups[0].slots.map((entry) => entry.localTime)).toEqual(['09:00', '10:00'])
  })
})

describe('checkCustomTime', () => {
  const grid = [
    slot('09:00'),
    slot('09:30', { status: 'booked', isAvailable: false }),
    slot('10:30'),
    slot('11:00'),
  ]

  it('accepts a time the server says is free, and shows the finish', () => {
    const result = checkCustomTime(grid, '09:00', 90)
    expect(result.ok).toBe(true)
    expect(result.message).toBe('Available, finishing at 10:30.')
  })

  it('refuses a booked time and offers the nearest open ones', () => {
    const result = checkCustomTime(grid, '09:30', 90)
    expect(result.ok).toBe(false)
    expect(result.message).toBe('That time is already booked.')
    expect(result.nearest).toEqual(['09:00', '10:30'])
  })

  it('refuses a time the business does not offer, even though other slots are free', () => {
    const result = checkCustomTime(grid, '09:15', 45)
    expect(result.ok).toBe(false)
    expect(result.message).toMatch(/not one of the times/)
    expect(result.nearest).toEqual(['09:00', '10:30'])
  })

  it('refuses an unreadable time', () => {
    expect(checkCustomTime(grid, '', 45).ok).toBe(false)
  })
})

})
