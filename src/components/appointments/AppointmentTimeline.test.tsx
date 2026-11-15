import { render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { PublicOpeningHours } from '../../lib/api/types'
import { toAppointmentRows } from '../../lib/appointments'
import { makeAppointmentDashboard, makeDashboardItem } from '../../test/appointments'
import { AppointmentTimeline } from './AppointmentTimeline'

/**
 * The timeline as a schedule, not just a list.
 *
 * These cover what the previous feed could not answer: the business's own opening
 * hours per day, a closed day, a booking that falls outside opening hours, past /
 * in-progress / upcoming state, and the business-local current-time marker — all
 * decided from the booked times and the business timezone.
 */

const NAIROBI = 'Africa/Nairobi'
/** 12:30 on Tuesday 12 May 2026, business-local (Nairobi, UTC+3). */
const NOW_ISO = '2026-05-12T09:30:00.000Z'

/** Opens 09:00–18:00 on weekdays, 10:00–14:00 on Saturday, closed on Sunday. */
function businessHours(): PublicOpeningHours {
  const open = (day: string, dayOfWeek: number, opensAt: string, closesAt: string) => ({
    day,
    dayOfWeek,
    isClosed: false,
    periods: [{ opensAt, closesAt, breakStartsAt: null, breakEndsAt: null }],
  })
  return {
    businessId: 'biz-1',
    timeZoneId: NAIROBI,
    hasStaffSchedule: true,
    days: [
      { day: 'sunday', dayOfWeek: 0, isClosed: true, periods: [] },
      open('monday', 1, '09:00', '18:00'),
      open('tuesday', 2, '09:00', '18:00'),
      open('wednesday', 3, '09:00', '18:00'),
      open('thursday', 4, '09:00', '18:00'),
      open('friday', 5, '09:00', '18:00'),
      open('saturday', 6, '10:00', '14:00'),
    ],
    specialHours: [],
  }
}

type RowInput = { id: string; name: string; start: string; end: string; status?: string }

function rows(inputs: readonly RowInput[]) {
  return toAppointmentRows(
    makeAppointmentDashboard({
      appointments: inputs.map((input) =>
        makeDashboardItem({
          id: input.id,
          customerName: input.name,
          scheduledAt: input.start,
          endAt: input.end,
          status: input.status ?? 'booked',
        }),
      ),
    }),
  )
}

function renderTimeline(overrides: Partial<Parameters<typeof AppointmentTimeline>[0]> = {}) {
  const handlers = { onOpen: vi.fn(), onAction: vi.fn() }
  const view = render(
    <AppointmentTimeline
      rows={rows([
        { id: 'a1', name: 'Alpha Early', start: '2026-05-12T06:00:00.000Z', end: '2026-05-12T06:30:00.000Z' },
        { id: 'a2', name: 'Bravo Mid', start: '2026-05-12T09:00:00.000Z', end: '2026-05-12T10:00:00.000Z' },
        { id: 'a3', name: 'Charlie Late', start: '2026-05-12T12:00:00.000Z', end: '2026-05-12T13:00:00.000Z' },
      ])}
      scope="day"
      anchor="2026-05-12"
      timeZone={NAIROBI}
      {...handlers}
      {...overrides}
    />,
  )
  return { ...handlers, container: view.container }
}

afterEach(() => {
  vi.useRealTimers()
})

describe('AppointmentTimeline — business opening hours', () => {
  it('labels each day with the business’s own opening and closing times', () => {
    renderTimeline({ scope: 'week', hours: businessHours() })

    // The week of 12 May 2026 is open 09:00–18:00 on its weekdays.
    expect(screen.getAllByText('09:00–18:00').length).toBeGreaterThan(0)
  })

  it('marks a closed day rather than drawing generic hours', () => {
    // Sunday 17 May 2026 is closed, and a booking exists on it.
    renderTimeline({
      scope: 'week',
      hours: businessHours(),
      rows: rows([
        { id: 'sun', name: 'Sunday Booking', start: '2026-05-17T07:00:00.000Z', end: '2026-05-17T08:00:00.000Z' },
      ]),
    })

    expect(screen.getByText('Closed')).toBeInTheDocument()
  })

  it('flags an appointment that falls outside opening hours', () => {
    renderTimeline({
      hours: businessHours(),
      rows: rows([
        // 07:00–07:30 Nairobi is before the 09:00 opening.
        { id: 'early', name: 'Alpha Early', start: '2026-05-12T04:00:00.000Z', end: '2026-05-12T04:30:00.000Z' },
        // 12:00–13:00 sits inside 09:00–18:00.
        { id: 'mid', name: 'Bravo Mid', start: '2026-05-12T09:00:00.000Z', end: '2026-05-12T10:00:00.000Z' },
      ]),
    })

    const flagged = screen.getByText('Alpha Early').closest('li')
    expect(flagged).toHaveAttribute('data-outside-hours', 'true')
    expect(screen.getByText('Outside opening hours')).toBeInTheDocument()

    const inside = screen.getByText('Bravo Mid').closest('li')
    expect(inside).not.toHaveAttribute('data-outside-hours')
  })

  it('does not claim a closure while the hours are unknown', () => {
    renderTimeline()
    expect(screen.queryByText('Closed')).toBeNull()
    expect(screen.queryByText('Outside opening hours')).toBeNull()
  })
})

describe('AppointmentTimeline — ordering and states', () => {
  it('reads down the clock, at the row’s own duration', () => {
    renderTimeline()

    const times = screen.getAllByText(/^\d{2}:\d{2}$/).map((node) => node.textContent)
    // 06:00, 09:00, 12:00 UTC are 09:00, 12:00, 15:00 in Nairobi — in that order.
    expect(times.slice(0, 3)).toEqual(['09:00', '12:00', '15:00'])
    // Each row reports the booked service's duration.
    expect(screen.getAllByText('1h').length).toBeGreaterThanOrEqual(3)
  })

  it('falls back to the booked interval when the service is no longer in the catalogue', () => {
    renderTimeline({
      rows: toAppointmentRows(
        makeAppointmentDashboard({
          appointments: [
            makeDashboardItem({
              id: 'gone',
              customerName: 'Deleted Service',
              serviceId: 'service-no-longer-sold',
              scheduledAt: '2026-05-12T06:00:00.000Z',
              endAt: '2026-05-12T06:45:00.000Z',
            }),
          ],
        }),
      ),
    })

    const row = screen.getByText('Deleted Service').closest('li') as HTMLElement
    expect(within(row).getByText('45 min')).toBeInTheDocument()
  })

  it('classifies past, in-progress and upcoming from the booked times', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(NOW_ISO))

    const { container } = renderTimeline()

    expect(container.querySelectorAll('[data-state="past"]')).toHaveLength(1)
    expect(container.querySelectorAll('[data-state="current"]')).toHaveLength(1)
    expect(container.querySelectorAll('[data-state="upcoming"]')).toHaveLength(1)
    // The stored status is untouched by the clock.
    expect(screen.getAllByText('Booked')).toHaveLength(3)
  })

  it('shows a business-local current-time marker on today alone', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(NOW_ISO))

    const { container } = renderTimeline()

    // 09:30 UTC is 12:30 on the shop floor — once in the day heading and once on the
    // marker itself, which is what "clearly displayed" means.
    expect(screen.getAllByText('Now 12:30').length).toBeGreaterThanOrEqual(1)
    expect(container.querySelectorAll('[data-now-marker="true"]')).toHaveLength(1)
  })

  it('never shows the marker for a day that is not today', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(NOW_ISO))

    const { container } = renderTimeline({ anchor: '2026-05-13' })

    expect(container.querySelectorAll('[data-now-marker="true"]')).toHaveLength(0)
    expect(screen.queryByText(/^Now /)).toBeNull()
  })
})

describe('AppointmentTimeline — grouping', () => {
  it('groups a week by business-local day, chronologically', () => {
    const { container } = renderTimeline({
      scope: 'week',
      rows: rows([
        { id: 'w1', name: 'Wed Booking', start: '2026-05-13T08:00:00.000Z', end: '2026-05-13T09:00:00.000Z' },
        { id: 'w2', name: 'Mon Booking', start: '2026-05-11T08:00:00.000Z', end: '2026-05-11T09:00:00.000Z' },
      ]),
    })

    const days = [...container.querySelectorAll('[data-day]')].map((node) =>
      node.getAttribute('data-day'),
    )
    expect(days).toEqual(['2026-05-11', '2026-05-13'])
  })

  it('keeps a month’s day groups collapsed but counted', () => {
    renderTimeline({ scope: 'month' })

    // 12 May 2026 holds all three bookings.
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('renders an empty day with its hours when nothing is booked', () => {
    renderTimeline({ rows: [], hours: businessHours() })

    expect(screen.getByText('09:00–18:00')).toBeInTheDocument()
    expect(screen.getByText('No appointments booked.')).toBeInTheDocument()
  })
})

describe('AppointmentTimeline — business timezone', () => {
  it('groups by the business’s day, not the viewer’s', () => {
    // 02:00 UTC is 22:00 on 11 May in New York but 05:00 on 12 May in Nairobi.
    const { container } = renderTimeline({
      scope: 'day',
      anchor: '2026-05-11',
      timeZone: 'America/New_York',
      hours: businessHours(),
      rows: rows([
        { id: 'tz', name: 'Late Night', start: '2026-05-12T02:00:00.000Z', end: '2026-05-12T02:30:00.000Z' },
      ]),
    })

    expect(container.querySelector('[data-day="2026-05-11"]')).not.toBeNull()
  })
})

describe('AppointmentTimeline — paging', () => {
  it('offers more when the server holds more than the block shown', () => {
    renderTimeline({ totalCount: 10, onShowMore: vi.fn() })

    expect(screen.getByRole('button', { name: /Load \d+ more/ })).toBeInTheDocument()
    expect(screen.getByText('3 of 10 shown')).toBeInTheDocument()
  })
})
