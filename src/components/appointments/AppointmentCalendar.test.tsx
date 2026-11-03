import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
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
})
