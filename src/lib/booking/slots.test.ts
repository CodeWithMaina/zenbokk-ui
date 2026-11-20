import { describe, expect, it } from 'vitest'
import type { AvailabilitySlot } from '../api/types'
import {
  bandLabel,
  clockMinutes,
  dayExtent,
  emptyDayReason,
  formatMinutes,
  hourBands,
  minutesClock,
  slotAvailability,
  slotAvailabilityLabel,
} from './slots'

/**
 * The one-hour presentation model.
 *
 * The rules here decide what a customer is told about a time, so they are tested
 * directly: a band never turns an unavailable starting time into an offer, and an
 * unavailable slot always says why.
 */

function slot(localTime: string, status: string, isAvailable = status === 'available'): AvailabilitySlot {
  const [hours, minutes] = localTime.split(':').map(Number)
  const end = `${String(hours + 1).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
  return {
    startAtUtc: `2026-11-21T${localTime}:00Z`,
    endAtUtc: `2026-11-21T${end}:00Z`,
    staffUserId: null,
    staffName: '',
    serviceIds: [],
    status,
    isAvailable,
    localDate: '2026-11-21',
    localTime,
    dayPart: hours < 12 ? 'morning' : hours < 17 ? 'afternoon' : 'evening',
    alternativeStaff: [],
  }
}

describe('clockMinutes / minutesClock', () => {
  it('parses a clock time and round-trips it', () => {
    expect(clockMinutes('09:00')).toBe(540)
    expect(clockMinutes('23:45')).toBe(1425)
    expect(minutesClock(540)).toBe('09:00')
    expect(minutesClock(1425)).toBe('23:45')
  })

  it('rejects anything that is not a clock time', () => {
    expect(clockMinutes('')).toBeNull()
    expect(clockMinutes('9am')).toBeNull()
    expect(clockMinutes('25:00')).toBeNull()
    expect(clockMinutes(null)).toBeNull()
  })
})

describe('hourBands', () => {
  it('groups starting times into one-hour bands in clock order', () => {
    const bands = hourBands([
      slot('10:00', 'available'),
      slot('09:15', 'available'),
      slot('09:00', 'available'),
    ])

    expect(bands.map((band) => band.hour)).toEqual([9, 10])
    expect(bands[0].label).toBe('09:00–10:00')
    expect(bands[0].slots.map((entry) => entry.localTime)).toEqual(['09:00', '09:15'])
  })

  it('marks a band unavailable when no starting time in it can take the booking', () => {
    const bands = hourBands([slot('09:00', 'booked'), slot('10:00', 'available')])

    expect(bands[0].hasAvailable).toBe(false)
    expect(bands[1].hasAvailable).toBe(true)
  })

  it('does not invent bands for closed hours', () => {
    const bands = hourBands([slot('09:00', 'available'), slot('17:00', 'available')])
    expect(bands.map((band) => band.hour)).toEqual([9, 17])
  })

  it('skips a slot whose time cannot be read rather than guessing', () => {
    const broken = { ...slot('09:00', 'available'), localTime: 'not-a-time' }
    expect(hourBands([broken])).toHaveLength(0)
  })
})

describe('slotAvailability', () => {
  it('only treats an explicitly available slot as bookable', () => {
    expect(slotAvailability(slot('09:00', 'available'))).toBe('available')
    expect(slotAvailability(slot('09:00', 'booked'))).toBe('booked')
    expect(slotAvailability(slot('09:00', 'off_duty'))).toBe('off_duty')
    expect(slotAvailability(slot('09:00', 'past'))).toBe('past')
  })

  it('treats an inconsistent or unknown status as unavailable', () => {
    expect(slotAvailability(slot('09:00', 'available', false))).toBe('off_duty')
    expect(slotAvailability(slot('09:00', 'something_new'))).toBe('off_duty')
  })

  it('gives every unavailable state a neutral word', () => {
    expect(slotAvailabilityLabel('booked')).toBe('Booked')
    expect(slotAvailabilityLabel('off_duty')).toBe('Unavailable')
    expect(slotAvailabilityLabel('past')).toBe('Passed')
  })
})

describe('dayExtent / emptyDayReason', () => {
  it('reports the first and last starting time shown', () => {
    expect(dayExtent([slot('10:00', 'available'), slot('09:00', 'available')])).toEqual({
      first: '09:00',
      last: '10:00',
    })
    expect(dayExtent([])).toBeNull()
  })

  it('explains a closed day, a full day and an off-duty day differently', () => {
    expect(emptyDayReason([], 180)).toMatch(/closed/i)
    expect(emptyDayReason([slot('09:00', 'booked')], 60)).toMatch(/already booked/i)
    expect(emptyDayReason([slot('09:00', 'off_duty')], 60)).toMatch(/nobody is working/i)
    expect(emptyDayReason([slot('09:00', 'past')], 60)).toMatch(/already passed/i)
  })

  it('names the requested duration when nothing uninterrupted fits', () => {
    expect(emptyDayReason([slot('09:00', 'booked'), slot('10:00', 'off_duty')], 180)).toBe(
      'No uninterrupted 3 hr opening remains on this day.',
    )
  })
})

describe('labels', () => {
  it('renders band labels and durations', () => {
    expect(bandLabel(9)).toBe('09:00–10:00')
    expect(bandLabel(23)).toBe('23:00–24:00')
    expect(formatMinutes(45)).toBe('45 min')
    expect(formatMinutes(60)).toBe('1 hr')
    expect(formatMinutes(180)).toBe('3 hr')
    expect(formatMinutes(90)).toBe('1 hr 30 min')
  })
})
