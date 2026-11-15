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

/**
 * The same presets, resolved in a business timezone that is not the browser's.
 *
 * The API filters on UTC instants, so "today" must be the business-local day's own
 * start and end — otherwise a booking either side of business-local midnight lands in
 * the wrong day for anyone viewing from elsewhere. The browser here is Africa/Nairobi
 * (UTC+3); New York is used for the offset and daylight-saving cases.
 */
describe('date presets in the business timezone', () => {
  const NAIROBI = 'Africa/Nairobi'
  const NEW_YORK = 'America/New_York'
  const today = new Date(2026, 4, 13, 10, 30)

  it('bounds a Nairobi day by Nairobi midnight, not the viewer’s', () => {
    const window = resolveDateWindow(filters({ preset: 'today' }), today, NAIROBI)
    expect(window.from).toBe('2026-05-12T21:00:00.000Z')
    expect(window.to).toBe('2026-05-13T20:59:59.999Z')
  })

  it('bounds a New York day by New York midnight', () => {
    const window = resolveDateWindow(filters({ preset: 'today' }), today, NEW_YORK)
    // EDT (UTC−4) in May.
    expect(window.from).toBe('2026-05-13T04:00:00.000Z')
    expect(window.to).toBe('2026-05-14T03:59:59.999Z')
  })

  it('spans a whole business-local week, Monday to Sunday', () => {
    const window = resolveDateWindow(filters({ preset: 'week' }), today, NAIROBI)
    expect(window.from).toBe('2026-05-10T21:00:00.000Z') // Monday 11 May, local midnight
    expect(window.to).toBe('2026-05-17T20:59:59.999Z') // Sunday 17 May, local end
  })

  it('spans a whole business-local month', () => {
    const window = resolveDateWindow(filters({ preset: 'month' }), today, NAIROBI)
    expect(window.from).toBe('2026-04-30T21:00:00.000Z')
    expect(window.to).toBe('2026-05-31T20:59:59.999Z')
  })

  it('crosses a year boundary without losing a day', () => {
    const window = resolveDateWindow(
      filters({ preset: 'today' }),
      new Date(2026, 11, 31, 10, 30),
      NAIROBI,
    )
    expect(window.from).toBe('2026-12-30T21:00:00.000Z')
    expect(window.to).toBe('2026-12-31T20:59:59.999Z')
  })

  it('uses each side of a daylight-saving change', () => {
    // 8 Mar 2026 starts on EST (UTC−5) and 9 Mar on EDT (UTC−4), so the local day is
    // 23 hours long — which a fixed-offset calculation would get wrong.
    const window = resolveDateWindow(
      filters({ preset: 'today' }),
      new Date(2026, 2, 8, 12, 0),
      NEW_YORK,
    )
    expect(window.from).toBe('2026-03-08T05:00:00.000Z')
    expect(window.to).toBe('2026-03-09T03:59:59.999Z')
  })

  it('reads a custom range as business-local dates', () => {
    const window = resolveDateWindow(
      filters({ preset: 'custom', from: '2026-06-01', to: '2026-06-03' }),
      today,
      NAIROBI,
    )
    expect(window.from).toBe('2026-05-31T21:00:00.000Z')
    expect(window.to).toBe('2026-06-03T20:59:59.999Z')
  })

  it('falls back to the browser timezone for an unusable identifier', () => {
    const navigatorZone = resolveDateWindow(filters({ preset: 'today' }), today)
    const fallback = resolveDateWindow(filters({ preset: 'today' }), today, 'Mars/Olympus')
    expect(fallback).toEqual(navigatorZone)
  })
})

describe('query building', () => {
  it('sends the window, the filters and the server-side sort', () => {
    const query = toAppointmentQuery(
      filters({
        preset: 'today',
        status: 'booked',
        staffIds: ['staff-1'],
        serviceIds: ['svc-1'],
        customerIds: ['cus-1'],
      }),
      2,
      25,
      new Date(2026, 4, 13, 10, 30),
    )

    expect(query).toMatchObject({
      status: 'booked',
      staffIds: ['staff-1'],
      serviceIds: ['svc-1'],
      customerIds: ['cus-1'],
      sortBy: 'scheduledAt',
      sortDirection: 'asc',
      page: 2,
      pageSize: 25,
    })
    expect(query.from).toBeTruthy()
    expect(query.to).toBeTruthy()
  })

  it('sends several chosen values as one request rather than a fan-out', () => {
    const query = toAppointmentQuery(
      filters({ serviceIds: ['svc-1', 'svc-2', 'svc-3'] }),
      1,
      25,
    )

    // All three ids travel together: one query, one honest total.
    expect(query.serviceIds).toEqual(['svc-1', 'svc-2', 'svc-3'])
  })

  it('falls back to scheduledAt ascending for a sort the database cannot do', () => {
    const query = toAppointmentQuery(filters({ sort: 'customer' }), 1, 25)
    expect(query.sortBy).toBe('scheduledAt')
    expect(query.sortDirection).toBe('asc')
    expect(isClientSort('customer')).toBe(true)
  })

  it('asks the database for latest-first when the sort says so', () => {
    expect(toAppointmentQuery(filters({ sort: 'when-desc' }), 1, 25).sortDirection).toBe('desc')
  })

  it('orders by creation time when the list asks for recent records', () => {
    expect(toAppointmentQuery(filters({ sort: 'created-desc' }), 1, 25)).toMatchObject({
      sortBy: 'createdAt',
      sortDirection: 'desc',
    })
    expect(toAppointmentQuery(filters({ sort: 'created-asc' }), 1, 25)).toMatchObject({
      sortBy: 'createdAt',
      sortDirection: 'asc',
    })
    // Creation order is the database's job, never the browser's.
    expect(isClientSort('created-desc')).toBe(false)
  })

  it('drops a blank search rather than sending an empty term', () => {
    expect(toAppointmentQuery(filters({ search: '   ' }), 1, 25).search).toBeNull()
    expect(toAppointmentQuery(filters({ search: 'wanjiru' }), 1, 25).search).toBe('wanjiru')
  })

  it('sends the payment-verification filter, and omits it for All', () => {
    expect(toAppointmentQuery(filters({ payment: 'verified' }), 1, 25).paymentStatus).toBe('verified')
    expect(toAppointmentQuery(filters({ payment: 'awaiting' }), 1, 25).paymentStatus).toBe('awaiting')
    // "All payment states" removes the filter rather than sending a value the server
    // would have to interpret.
    expect(toAppointmentQuery(filters({ payment: 'all' }), 1, 25).paymentStatus).toBeNull()
  })
})

describe('activeFilterCount', () => {
  it('is zero for the defaults', () => {
    expect(activeFilterCount(DEFAULT_APPOINTMENT_FILTERS)).toBe(0)
  })

  it('counts the payment filter once when it is set', () => {
    expect(activeFilterCount(filters({ payment: 'all' }))).toBe(0)
    expect(activeFilterCount(filters({ payment: 'refunded' }))).toBe(1)
  })

  it('counts each non-default filter', () => {
    expect(
      activeFilterCount(
        filters({
          status: 'confirmed',
          staffIds: ['s'],
          serviceIds: ['a', 'b'],
          customerIds: ['c'],
          preset: 'all',
          sort: 'customer',
        }),
      ),
    ).toBe(6)
  })

  it('counts a multi-select filter once, however many values it holds', () => {
    expect(activeFilterCount(filters({ serviceIds: ['a', 'b', 'c'] }))).toBe(1)
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
