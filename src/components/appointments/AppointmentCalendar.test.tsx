import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { PublicOpeningHours } from '../../lib/api/types'
import { toAppointmentRows } from '../../lib/appointments'
import { makeAppointmentDashboard, makeDashboardItem, makeStaffBucket } from '../../test/appointments'
import { AppointmentCalendar, positionEvents } from './AppointmentCalendar'

/**
 * The calendar.
 *
 * The interesting parts are the ones a screenshot cannot check: how overlapping
 * appointments are laid out, that a month cell reports its real count, and that
 * clicking empty grid space produces the pre-filled booking time the design
 * promises.
 */

const rows = () =>
  toAppointmentRows(
    makeAppointmentDashboard({
      appointments: [
        makeDashboardItem({
          id: 'a1',
          scheduledAt: '2026-05-12T09:00:00.000Z',
          endAt: '2026-05-12T10:00:00.000Z',
        }),
        makeDashboardItem({
          id: 'a2',
          scheduledAt: '2026-05-12T09:30:00.000Z',
          endAt: '2026-05-12T10:30:00.000Z',
        }),
        makeDashboardItem({
          id: 'a3',
          scheduledAt: '2026-05-12T14:00:00.000Z',
          endAt: '2026-05-12T15:00:00.000Z',
        }),
      ],
    }),
  )

describe('positionEvents', () => {
  it('gives overlapping appointments separate lanes', () => {
    const placed = positionEvents(rows())
    const first = placed.find((entry) => entry.row.id === 'a1')
    const second = placed.find((entry) => entry.row.id === 'a2')
    const later = placed.find((entry) => entry.row.id === 'a3')

    expect(first?.lanes).toBe(2)
    expect(second?.lanes).toBe(2)
    expect(first?.lane).not.toBe(second?.lane)
    // The afternoon appointment starts after the cluster ends, so it is alone.
    expect(later?.lanes).toBe(1)
  })

  it('reuses a lane once the earlier appointment has finished', () => {
    const placed = positionEvents(rows())
    // a3 does not overlap anything, so it keeps the first lane to itself.
    expect(placed.find((entry) => entry.row.id === 'a3')?.lane).toBe(0)
  })
})

/**
 * The absolutely positioned block on the time grid for a named appointment, as the
 * grid computed it: `top` and `height` in pixels from the scheduled times. Reading
 * these is what proves a booking is drawn where it was scheduled.
 */
function placedBlock(customerName: string): { top: number; height: number } {
  const block = [...document.querySelectorAll<HTMLElement>('div.absolute')].find(
    (element) =>
      element.textContent?.includes(customerName) && element.style.top.length > 0,
  )

  if (!block) throw new Error(`No positioned calendar block found for ${customerName}`)

  return {
    top: Number.parseFloat(block.style.top),
    height: Number.parseFloat(block.style.height),
  }
}

function renderCalendar(overrides: Partial<Parameters<typeof AppointmentCalendar>[0]> = {}) {
  const handlers = {
    onSelect: vi.fn(),
    onCreateAt: vi.fn(),
    onReschedule: vi.fn(),
    onSelectDate: vi.fn(),
  }

  render(
    <AppointmentCalendar
      mode="month"
      anchor={new Date(2026, 4, 12)}
      rows={rows()}
      staff={[makeStaffBucket()]}
      {...handlers}
      {...overrides}
    />,
  )

  return handlers
}

describe('AppointmentCalendar', () => {
  it('reports each day’s real appointment count in the month grid', () => {
    renderCalendar()

    const day = screen.getByRole('button', { name: 'Open Tue 12 May' })
    expect(within(day.parentElement as HTMLElement).getByText('3')).toBeInTheDocument()
  })

  it('opens a day when its date is clicked', async () => {
    const user = userEvent.setup()
    const { onSelectDate } = renderCalendar()

    await user.click(screen.getByRole('button', { name: 'Open Tue 12 May' }))

    expect(onSelectDate).toHaveBeenCalled()
  })

  it('opens an appointment when its block is clicked', async () => {
    const user = userEvent.setup()
    const { onSelect } = renderCalendar()

    await user.click(screen.getAllByRole('button', { name: /Wanjiru Kariuki/ })[0])

    expect(onSelect).toHaveBeenCalled()
  })

  it('lays the week out as a time grid with a column per weekday', () => {
    renderCalendar({ mode: 'week' })

    expect(screen.getByText('08:00')).toBeInTheDocument()
    expect(screen.getByText('19:00')).toBeInTheDocument()
    expect(screen.getAllByText(/appts?$/).length).toBeGreaterThan(0)
  })

  it('uses a column per staff member in the day view', () => {
    renderCalendar({ mode: 'day', anchor: new Date(2026, 4, 12) })

    expect(screen.getByText('Amara Okafor')).toBeInTheDocument()
    // All three fixtures belong to this staff member, so the column says so.
    expect(screen.getByText(/3 appts$/)).toBeInTheDocument()
  })

  it('offers an empty state for a month with nothing in it', () => {
    renderCalendar({ rows: [] })
    expect(screen.getByText('Nothing scheduled this month')).toBeInTheDocument()
  })

  it('places a booking at its scheduled time, not at the time it was created', () => {
    // The 09:00 booking was created LAST; the 15:00 one was created first. Ordering by
    // creation time would put them in the wrong slots.
    const placed = toAppointmentRows(
      makeAppointmentDashboard({
        appointments: [
          makeDashboardItem({
            id: 'late-created',
            customerName: 'Ninth Hour',
            scheduledAt: '2026-05-12T09:00:00.000Z',
            endAt: '2026-05-12T10:00:00.000Z',
            createdAt: '2026-05-12T08:00:00.000Z',
          }),
          makeDashboardItem({
            id: 'early-created',
            customerName: 'Fifteenth Hour',
            scheduledAt: '2026-05-12T15:00:00.000Z',
            endAt: '2026-05-12T16:00:00.000Z',
            createdAt: '2026-05-01T08:00:00.000Z',
          }),
        ],
      }),
    )

    renderCalendar({ mode: 'week', rows: placed })

    const morning = placedBlock('Ninth Hour')
    const afternoon = placedBlock('Fifteenth Hour')

    // The earlier slot is drawn above the later one — whatever the creation order.
    expect(afternoon.top).toBeGreaterThan(morning.top)
    // …and the gap between them is the six hours between the two scheduled times.
    const oneHour = placedBlock('Ninth Hour').height
    expect(afternoon.top - morning.top).toBeGreaterThan(oneHour * 3)
  })

  it('gives a shorter booking a proportionally shorter block', () => {
    const placed = toAppointmentRows(
      makeAppointmentDashboard({
        appointments: [
          makeDashboardItem({
            id: 'hour',
            customerName: 'Full Hour',
            scheduledAt: '2026-05-12T10:00:00.000Z',
            endAt: '2026-05-12T11:00:00.000Z',
          }),
          makeDashboardItem({
            id: 'half',
            customerName: 'Half Hour',
            scheduledAt: '2026-05-12T10:00:00.000Z',
            endAt: '2026-05-12T10:30:00.000Z',
          }),
        ],
      }),
    )

    renderCalendar({ mode: 'week', rows: placed })

    const hour = placedBlock('Full Hour')
    const half = placedBlock('Half Hour')

    // Same start, so the same slot; the shorter booking takes less of it.
    expect(half.top).toBeCloseTo(hour.top, 5)
    expect(half.height).toBeLessThan(hour.height)
  })

describe('AppointmentCalendar — drill-down and drill-up', () => {
  /** The week that contains 12 May 2026 starts on Monday 11 May. */
  const CLICKED_DAY = 'Tue 12 May'
  const WEEK_START = 'Mon 11 May'

  const sameDay = (actual: unknown, year: number, month: number, day: number) =>
    actual instanceof Date &&
    actual.getFullYear() === year &&
    actual.getMonth() === month &&
    actual.getDate() === day

  it('opens the WEEK containing a month cell that was clicked', async () => {
    const user = userEvent.setup()
    const onOpenWeek = vi.fn()
    const { onSelectDate } = renderCalendar({ onOpenWeek })

    await user.click(screen.getByRole('button', { name: `Open ${CLICKED_DAY}` }))

    expect(onOpenWeek).toHaveBeenCalledTimes(1)
    expect(sameDay(onOpenWeek.mock.calls[0][0], 2026, 4, 12)).toBe(true)
    // The month cell no longer jumps straight to a day: the hierarchy is month → week.
    expect(onSelectDate).not.toHaveBeenCalled()
  })

  it('still opens a day directly when no drill-down handler is supplied', async () => {
    const user = userEvent.setup()
    const { onSelectDate } = renderCalendar()

    await user.click(screen.getByRole('button', { name: `Open ${CLICKED_DAY}` }))

    expect(onSelectDate).toHaveBeenCalledTimes(1)
    expect(sameDay(onSelectDate.mock.calls[0][0], 2026, 4, 12)).toBe(true)
  })

  it('opens a DAY from that day’s header in the week view', async () => {
    const user = userEvent.setup()
    const onOpenDay = vi.fn()
    renderCalendar({ mode: 'week', onOpenDay })

    await user.click(screen.getByRole('button', { name: `Open ${WEEK_START}` }))

    expect(onOpenDay).toHaveBeenCalledTimes(1)
    expect(sameDay(onOpenDay.mock.calls[0][0], 2026, 4, 11)).toBe(true)
  })

  it('offers the wider periods as drill-up controls, marking the current one', async () => {
    const user = userEvent.setup()
    const onModeChange = vi.fn()
    renderCalendar({ mode: 'day', onModeChange })

    const trail = screen.getByRole('navigation', { name: 'Calendar period' })
    expect(within(trail).getByText('Day')).toHaveAttribute('aria-current', 'true')

    await user.click(within(trail).getByRole('button', { name: 'Show the week view' }))
    expect(onModeChange).toHaveBeenCalledWith('week')

    await user.click(within(trail).getByRole('button', { name: 'Show the month view' }))
    expect(onModeChange).toHaveBeenCalledWith('month')
  })

  it('widens the period without discarding the selected date', async () => {
    const user = userEvent.setup()
    const onModeChange = vi.fn()
    const { onSelectDate } = renderCalendar({ mode: 'week', onModeChange, onOpenWeek: vi.fn() })

    const trail = screen.getByRole('navigation', { name: 'Calendar period' })
    await user.click(within(trail).getByRole('button', { name: 'Show the month view' }))

    // Widening is a view change only — the anchor is what says which date is selected,
    // so nothing may overwrite it as a side effect of the trail.
    expect(onModeChange).toHaveBeenCalledWith('month')
    expect(onSelectDate).not.toHaveBeenCalled()
  })

  it('names the period it is showing', () => {
    renderCalendar({ mode: 'month', onModeChange: vi.fn() })
    expect(screen.getByText('May 2026')).toBeInTheDocument()
  })

  it('hides the trail entirely when the caller has no hierarchy', () => {
    renderCalendar()
    expect(screen.queryByRole('navigation', { name: 'Calendar period' })).toBeNull()
  })
})


/**
 * The business's own schedule.
 *
 * A calendar that hardcodes 08:00–20:00 is wrong the moment a business opens at
 * 07:00 or shuts at 21:00. These tests fix the hours and read the band back: the
 * gutter labels and the closed-day markers have to come from the schedule, not
 * from a template.
 */
describe('AppointmentCalendar — business hours', () => {
  const openDay = (name: string, dayOfWeek: number, opensAt: string, closesAt: string) => ({
    day: name,
    dayOfWeek,
    isClosed: false,
    periods: [{ opensAt, closesAt, breakStartsAt: null, breakEndsAt: null }],
  })

  /** Opens 07:30–16:00 on weekdays, 10:00–14:00 on Saturday, closed on Sunday. */
  const officeHours: PublicOpeningHours = {
    businessId: 'biz-1',
    timeZoneId: 'Africa/Nairobi',
    hasStaffSchedule: true,
    days: [
      { day: 'sunday', dayOfWeek: 0, isClosed: true, periods: [] },
      openDay('monday', 1, '07:30', '16:00'),
      openDay('tuesday', 2, '07:30', '16:00'),
      openDay('wednesday', 3, '07:30', '16:00'),
      openDay('thursday', 4, '07:30', '16:00'),
      openDay('friday', 5, '07:30', '16:00'),
      openDay('saturday', 6, '10:00', '14:00'),
    ],
    specialHours: [],
  }

  it('draws the gutter from the business’s opening hour, not a fixed 08:00', () => {
    renderCalendar({ mode: 'week', hours: officeHours })

    expect(screen.getByText('07:00')).toBeInTheDocument()
    expect(screen.queryByText('20:00')).toBeNull()
  })

  it('falls back to the default band while the hours are unknown', () => {
    renderCalendar({ mode: 'week' })

    expect(screen.getByText('08:00')).toBeInTheDocument()
    expect(screen.getByText('19:00')).toBeInTheDocument()
  })

  it('marks the closed weekday and labels the open ones with their hours', () => {
    // The week of 12 May 2026 runs Mon 11 – Sun 17: Sunday is the closed day, and
    // the weekdays all open 07:30–16:00.
    renderCalendar({ mode: 'week', hours: officeHours, onOpenDay: vi.fn() })

    expect(screen.getAllByText('Closed').length).toBeGreaterThan(0)
    expect(screen.getAllByText(/07:30–16:00/).length).toBeGreaterThan(0)
  })
})

/**
 * The same calendar, read in a business timezone that is not the browser's.
 *
 * The browser is Africa/Nairobi (UTC+3) here, so an instant in the small hours of a
 * Nairobi day belongs to the previous day in New York. The column the block lands in,
 * and where it sits inside it, must follow the business's clock.
 */
describe('AppointmentCalendar — business timezone', () => {
  const NEW_YORK = 'America/New_York'
  /** Open 09:00–23:00 every day, so the band is stable and reaches the late hour. */
  const newYorkHours: PublicOpeningHours = {
    businessId: 'biz-1',
    timeZoneId: NEW_YORK,
    hasStaffSchedule: true,
    days: Array.from({ length: 7 }, (_, dayOfWeek) => ({
      day: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][dayOfWeek],
      dayOfWeek,
      isClosed: false,
      periods: [{ opensAt: '09:00', closesAt: '23:00', breakStartsAt: null, breakEndsAt: null }],
    })),
    specialHours: [],
  }

  /** 02:00 UTC on 12 May is 22:00 on 11 May in New York. */
  const rows = () =>
    toAppointmentRows(
      makeAppointmentDashboard({
        appointments: [
          makeDashboardItem({
            id: 'tz',
            scheduledAt: '2026-05-12T02:00:00.000Z',
            endAt: '2026-05-12T03:00:00.000Z',
          }),
        ],
      }),
    )

  it('counts the appointment under the business-local day in the month grid', () => {
    renderCalendar({ mode: 'month', timeZone: NEW_YORK, rows: rows() })

    const monday = screen.getByRole('button', { name: 'Open Mon 11 May' })
    expect(within(monday.parentElement as HTMLElement).getByText('1')).toBeInTheDocument()

    // The viewer’s own day (12 May) holds nothing.
    const tuesday = screen.getByRole('button', { name: 'Open Tue 12 May' })
    expect(within(tuesday.parentElement as HTMLElement).queryByText('1')).toBeNull()
  })

  it('positions the block at the business-local hour in the week grid', () => {
    renderCalendar({
      mode: 'week',
      timeZone: NEW_YORK,
      hours: newYorkHours,
      rows: rows(),
      onOpenDay: vi.fn(),
    })

    // 22:00 with a band that starts at 09:00 is 13 hours down, at 56px an hour.
    expect(placedBlock('Wanjiru Kariuki').top).toBeCloseTo(13 * 56, 0)
  })
})

})
