import { describe, expect, it } from 'vitest'
import type { AppointmentDashboardItem } from '../api/types'
import {
  appointmentValue,
  clockInZone,
  dateKeyChip,
  dateKeyLabel,
  dayBand,
  minutesInZone,
  nextUp,
  scheduleBreakdown,
  staffColumns,
  upcomingCount,
} from './schedule'

const NAIROBI = 'Africa/Nairobi'
const NEW_YORK = 'America/New_York'

function appointment(
  overrides: Partial<AppointmentDashboardItem> & { scheduledAt: string; endAt: string },
): AppointmentDashboardItem {
  return {
    id: overrides.id ?? overrides.scheduledAt,
    businessId: 'biz-1',
    status: 'confirmed',
    serviceId: 'svc-1',
    serviceName: 'Hair cut',
    customerId: 'cus-1',
    customerName: 'Jane Muthoni',
    customerEmail: null,
    customerPhone: null,
    customerAvatarUrl: null,
    customerType: 'registered',
    staffUserId: 'staff-1',
    staffName: 'Amina Hassan',
    staffEmail: null,
    staffAvatarUrl: null,
    createdAt: '2026-11-08T06:00:00.000Z',
    updatedAt: '2026-11-08T06:00:00.000Z',
    ...overrides,
  }
}

/** An instant at a business-local wall clock (Nairobi is UTC+3 all year). */
function nairobi(hour: number, minute = 0, day = 8): string {
  return new Date(Date.UTC(2026, 10, day, hour - 3, minute, 0, 0)).toISOString()
}

describe('business-clock formatting', () => {
  it('prints an instant in the business zone, not the browser zone', () => {
    expect(clockInZone('2026-11-08T06:00:00.000Z', NAIROBI)).toBe('09:00')
    expect(minutesInZone('2026-11-08T06:00:00.000Z', NAIROBI)).toBe(9 * 60)
  })

  it('follows daylight saving in zones that observe it', () => {
    // 13:00 UTC is 09:00 in New York in July (EDT); December needs 14:00 UTC (EST).
    expect(clockInZone('2026-07-01T13:00:00.000Z', NEW_YORK)).toBe('09:00')
    expect(clockInZone('2026-12-01T14:00:00.000Z', NEW_YORK)).toBe('09:00')
  })

  it('renders a date key without shifting it a day', () => {
    expect(dateKeyLabel('2026-11-08')).toBe('Sunday 8 November')
    expect(dateKeyChip('2026-11-08')).toEqual({ weekday: 'Sun', day: 8 })
  })
})

describe('scheduleBreakdown', () => {
  it('folds booked and pending_payment into one pending group, in legend order', () => {
    const groups = scheduleBreakdown([
      appointment({ scheduledAt: nairobi(9), endAt: nairobi(10), status: 'completed' }),
      appointment({ scheduledAt: nairobi(10), endAt: nairobi(11), status: 'booked' }),
      appointment({ scheduledAt: nairobi(11), endAt: nairobi(12), status: 'pending_payment' }),
      appointment({ scheduledAt: nairobi(12), endAt: nairobi(13), status: 'cancelled' }),
    ])

    expect(groups.map((group) => [group.key, group.count])).toEqual([
      ['completed', 1],
      ['pending', 2],
      ['cancelled', 1],
    ])
  })

  it('omits groups with nothing in them', () => {
    const groups = scheduleBreakdown([
      appointment({ scheduledAt: nairobi(9), endAt: nairobi(10), status: 'confirmed' }),
    ])

    expect(groups).toHaveLength(1)
    expect(groups[0]).toMatchObject({ key: 'confirmed', count: 1, status: 'confirmed' })
  })
})

describe('dayBand', () => {
  it('keeps the default working day when nothing falls outside it', () => {
    expect(
      dayBand([appointment({ scheduledAt: nairobi(9), endAt: nairobi(10) })], NAIROBI),
    ).toEqual({ startHour: 8, endHour: 18 })
  })

  it('widens for an early start and a late finish on the business clock', () => {
    expect(
      dayBand(
        [
          appointment({ scheduledAt: nairobi(7, 30), endAt: nairobi(8, 30) }),
          appointment({ scheduledAt: nairobi(17), endAt: nairobi(19, 15) }),
        ],
        NAIROBI,
      ),
    ).toEqual({ startHour: 7, endHour: 20 })
  })

  it('reads the same instants differently in another business zone', () => {
    // 06:00 UTC is 09:00 in Nairobi but 01:00 in New York (EST in November).
    const items = [
      appointment({
        scheduledAt: '2026-11-08T06:00:00.000Z',
        endAt: '2026-11-08T07:00:00.000Z',
      }),
    ]
    expect(dayBand(items, NAIROBI)).toEqual({ startHour: 8, endHour: 18 })
    expect(dayBand(items, NEW_YORK)).toEqual({ startHour: 1, endHour: 18 })
  })

  it('falls back to the default band for an empty or malformed day', () => {
    expect(dayBand([], NAIROBI)).toEqual({ startHour: 8, endHour: 18 })
    expect(
      dayBand([appointment({ scheduledAt: 'not-a-date', endAt: 'not-a-date' })], NAIROBI),
    ).toEqual({ startHour: 8, endHour: 18 })
  })
})

describe('staffColumns', () => {
  it('groups by staff member and orders columns by their first booking', () => {
    const columns = staffColumns([
      appointment({
        scheduledAt: nairobi(11),
        endAt: nairobi(12),
        staffUserId: 'staff-2',
        staffName: 'Brian Otieno',
      }),
      appointment({
        scheduledAt: nairobi(9),
        endAt: nairobi(10),
        staffUserId: 'staff-1',
        staffName: 'Amina Hassan',
      }),
      appointment({
        scheduledAt: nairobi(13),
        endAt: nairobi(14),
        staffUserId: 'staff-1',
        staffName: 'Amina Hassan',
      }),
    ])

    expect(columns.map((column) => column.name)).toEqual(['Amina Hassan', 'Brian Otieno'])
    expect(columns[0].items).toHaveLength(2)
  })

  it('keeps unassigned bookings in their own column', () => {
    const columns = staffColumns([
      appointment({
        scheduledAt: nairobi(9),
        endAt: nairobi(10),
        staffUserId: null,
        staffName: null,
      }),
    ])

    expect(columns).toHaveLength(1)
    expect(columns[0]).toMatchObject({ key: 'unassigned', name: 'Unassigned' })
  })
})

describe('nextUp', () => {
  it('picks the first appointment still to start, ignoring cancelled ones', () => {
    const items = [
      appointment({ scheduledAt: nairobi(15), endAt: nairobi(16), status: 'cancelled' }),
      appointment({ scheduledAt: nairobi(16), endAt: nairobi(17), id: 'later' }),
      appointment({ scheduledAt: nairobi(14), endAt: nairobi(15), id: 'sooner' }),
    ]

    expect(nextUp(items, new Date(nairobi(13)))?.id).toBe('sooner')
  })

  it('returns null once the day has no upcoming bookings', () => {
    expect(
      nextUp([appointment({ scheduledAt: nairobi(9), endAt: nairobi(10) })], new Date(nairobi(12))),
    ).toBeNull()
  })
})

describe('upcomingCount', () => {
  it('counts appointments still to start, excluding cancelled ones', () => {
    const items = [
      appointment({ scheduledAt: nairobi(14), endAt: nairobi(15) }),
      appointment({ scheduledAt: nairobi(16), endAt: nairobi(17) }),
      appointment({ scheduledAt: nairobi(16), endAt: nairobi(17), status: 'cancelled' }),
      appointment({ scheduledAt: nairobi(10), endAt: nairobi(11) }),
    ]

    expect(upcomingCount(items, new Date(nairobi(15, 30)))).toBe(1)
  })
})

describe('appointmentValue', () => {
  it('adds what settled to what is still owed', () => {
    expect(
      appointmentValue(
        appointment({
          scheduledAt: nairobi(9),
          endAt: nairobi(10),
          amountPaid: 500,
          balance: 1300,
        }),
      ),
    ).toBe(1800)
  })

  it('leaves the amount out when the payload carried neither figure', () => {
    expect(appointmentValue(appointment({ scheduledAt: nairobi(9), endAt: nairobi(10) }))).toBeNull()
  })
})

