import { describe, expect, it } from 'vitest'
import {
  DEFAULT_APPOINTMENT_FILTERS,
  activeFilterCount,
  addDays,
  allowedTransitions,
  appointmentProgress,
  appointmentReference,
  appointmentTimingLabel,
  calendarWindow,
  intervalMinutes,
  isClientSort,
  isSameDay,
  resolveDateWindow,
  serviceColor,
  sortAppointments,
  startOfWeek,
  toAppointmentRows,
  toDateValue,
} from './types'
import type { AppointmentFilters, AppointmentRow } from './types'
import { toAppointmentQuery } from './api'
import {
  makeAppointmentDashboard,
  makeDashboardItem,
  makeServiceBucket,
} from '../../test/appointments'

/**
 * The module's rules, asserted directly.
 *
 * These are the pieces the screens rely on being right: which transitions the
 * API will accept, what a date preset resolves to, and how a page is ordered. A
 * mistake here would surface as a refused request or a mislabelled list, so they
 * are covered without a DOM.
 */

const filters = (overrides: Partial<AppointmentFilters> = {}): AppointmentFilters => ({
  ...DEFAULT_APPOINTMENT_FILTERS,
  ...overrides,
})

describe('transition table', () => {
  it('mirrors the server: booked can be confirmed, cancelled or marked no-show', () => {
    expect(allowedTransitions('booked')).toEqual(['confirmed', 'cancelled', 'no_show'])
  })

  it('mirrors the server: confirmed can be completed, cancelled or marked no-show', () => {
    expect(allowedTransitions('confirmed')).toEqual(['completed', 'cancelled', 'no_show'])
  })

  it('offers nothing further from a terminal status', () => {
    expect(allowedTransitions('completed')).toEqual([])
    expect(allowedTransitions('cancelled')).toEqual([])
    expect(allowedTransitions('no_show')).toEqual([])
  })

  it('is empty for a status the backend does not know', () => {
    expect(allowedTransitions('pending')).toEqual([])
  })
})

describe('date presets', () => {
  // Wednesday 13 May 2026, so "this week" is a complete Mon–Sun window.
  const today = new Date(2026, 4, 13, 10, 30)

  it('resolves today to the whole local day', () => {
    const window = resolveDateWindow(filters({ preset: 'today' }), today)
    expect(new Date(window.from as string).getHours()).toBe(0)
    expect(new Date(window.to as string).getHours()).toBe(23)
    expect(isSameDay(new Date(window.from as string), today)).toBe(true)
  })

  it('resolves this week to Monday–Sunday', () => {
    const window = resolveDateWindow(filters({ preset: 'week' }), today)
    const start = new Date(window.from as string)
    expect(start.getDay()).toBe(1) // Monday
    expect(startOfWeek(today).getTime()).toBe(start.getTime())
  })

  it('resolves next week to the following Monday', () => {
    const window = resolveDateWindow(filters({ preset: 'nextweek' }), today)
    expect(isSameDay(new Date(window.from as string), addDays(startOfWeek(today), 7))).toBe(true)
  })

  it('leaves all dates unbounded', () => {
    expect(resolveDateWindow(filters({ preset: 'all' }), today)).toEqual({ from: null, to: null })
  })

  it('uses the supplied range for a custom window', () => {
    const window = resolveDateWindow(
      filters({ preset: 'custom', from: '2026-06-01', to: '2026-06-03' }),
      today,
    )
    expect(toDateValue(new Date(window.from as string))).toBe('2026-06-01')
    expect(toDateValue(new Date(window.to as string))).toBe('2026-06-03')
  })

  it('resolves a month pane to six whole weeks starting on a Monday', () => {
    const { start, end } = calendarWindow('month', new Date(2026, 4, 13))
    expect(start.getDay()).toBe(1)
    expect((end.getTime() - start.getTime()) / 86_400_000).toBe(42)
  })
})

describe('query building', () => {
  it('sends the window, the filters and the server-side sort', () => {
    const query = toAppointmentQuery(
      filters({ preset: 'today', status: 'booked', staffId: 'staff-1', serviceId: 'svc-1' }),
      2,
      25,
      new Date(2026, 4, 13, 10, 30),
    )

    expect(query).toMatchObject({
      status: 'booked',
      staffId: 'staff-1',
      serviceId: 'svc-1',
      sortBy: 'scheduledAt',
      sortDirection: 'asc',
      page: 2,
      pageSize: 25,
    })
    expect(query.from).toBeTruthy()
    expect(query.to).toBeTruthy()
  })

  it('falls back to scheduledAt ascending for a sort the database cannot do', () => {
    const query = toAppointmentQuery(filters({ sort: 'customer' }), 1, 25)
    expect(query.sortDirection).toBe('asc')
    expect(isClientSort('customer')).toBe(true)
  })

  it('asks the database for latest-first when the sort says so', () => {
    expect(toAppointmentQuery(filters({ sort: 'when-desc' }), 1, 25).sortDirection).toBe('desc')
  })

  it('drops a blank search rather than sending an empty term', () => {
    expect(toAppointmentQuery(filters({ search: '   ' }), 1, 25).search).toBeNull()
    expect(toAppointmentQuery(filters({ search: 'wanjiru' }), 1, 25).search).toBe('wanjiru')
  })
})

describe('activeFilterCount', () => {
  it('is zero for the defaults', () => {
    expect(activeFilterCount(DEFAULT_APPOINTMENT_FILTERS)).toBe(0)
  })

  it('counts each non-default filter', () => {
    expect(
      activeFilterCount(
        filters({ status: 'confirmed', staffId: 's', preset: 'all', sort: 'customer' }),
      ),
    ).toBe(4)
  })
})

describe('view models', () => {
  it('resolves price and duration from the catalogue, not the interval', () => {
    const [row] = toAppointmentRows(makeAppointmentDashboard())
    expect(row.price).toBe(3500)
    expect(row.durationMinutes).toBe(60)
    expect(row.multiService).toBe(false)
  })

  it('falls back to the booked interval when the service is gone from the catalogue', () => {
    const dashboard = makeAppointmentDashboard({ services: [] })
    const [row] = toAppointmentRows(dashboard)
    expect(row.price).toBeNull()
    expect(row.durationMinutes).toBe(60)
    expect(row.serviceName).toBe('Signature treatment')
  })

  it('flags a booking longer than its catalogue service', () => {
    const dashboard = makeAppointmentDashboard({
      appointments: [
        makeDashboardItem({
          scheduledAt: '2026-05-12T09:00:00.000Z',
          endAt: '2026-05-12T11:30:00.000Z',
        }),
      ],
      services: [makeServiceBucket({ durationMinutes: 60 })],
    })
    expect(toAppointmentRows(dashboard)[0].multiService).toBe(true)
  })

  it('measures the interval in minutes and refuses a negative one', () => {
    expect(intervalMinutes('2026-05-12T09:00:00Z', '2026-05-12T10:30:00Z')).toBe(90)
    expect(intervalMinutes('2026-05-12T10:00:00Z', '2026-05-12T09:00:00Z')).toBe(0)
  })
})

describe('client ordering', () => {
  const baseRow = toAppointmentRows(makeAppointmentDashboard())[0]
  const rows: AppointmentRow[] = [
    { ...baseRow, id: 'b', customerName: 'Zoe', price: 100 },
    { ...baseRow, id: 'a', customerName: 'Ada', price: 900 },
  ]

  it('orders by customer name, then by start', () => {
    expect(sortAppointments(rows, 'customer').map((row) => row.id)).toEqual(['a', 'b'])
  })

  it('orders by price, highest first', () => {
    expect(sortAppointments(rows, 'price-desc').map((row) => row.id)).toEqual(['a', 'b'])
  })

  it('does not mutate the input', () => {
    const copy = [...rows]
    sortAppointments(rows, 'customer')
    expect(rows).toEqual(copy)
  })
})

describe('presentation helpers', () => {
  it('keeps a service colour stable for the same id', () => {
    expect(serviceColor('svc-1')).toBe(serviceColor('svc-1'))
  })

  it('formats a short appointment reference', () => {
    expect(appointmentReference('aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa')).toBe('AP-AAAAAAAA')
  })

  it('reports a cancelled appointment as cancelled, whatever the clock says', () => {
    const [row] = toAppointmentRows(makeAppointmentDashboard())
    expect(appointmentTimingLabel({ ...row, status: 'cancelled' })).toBe('Cancelled')
  })

  it('only reports progress while an appointment is actually live', () => {
    const [row] = toAppointmentRows(makeAppointmentDashboard())
    const start = new Date(row.scheduledAt).getTime()
    expect(appointmentProgress(row, start - 60_000)).toBeNull()
    expect(appointmentProgress(row, start + 30 * 60_000)).toBe(50)
    expect(appointmentProgress(row, new Date(row.endAt).getTime() + 1)).toBeNull()
  })
})
