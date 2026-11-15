import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { toAppointmentRows } from '../../lib/appointments'
import { formatTime } from '../../lib/format'
import { makeAppointmentDashboard, makeDashboardItem } from '../../test/appointments'
import { AppointmentTable } from './AppointmentTable'
import { AppointmentTimeline } from './AppointmentTimeline'

/**
 * The list views.
 *
 * Both render the rows the API returned; the assertions are about what the
 * operator can read and do — the counts, the contact number, the status pill,
 * the bulk bar and the per-row actions — not about markup.
 */

const BOOKED_ID = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa'
const COMPLETED_ID = 'bbbbbbbb-1111-4111-8111-bbbbbbbbbbbb'

const rows = () =>
  toAppointmentRows(
    makeAppointmentDashboard({
      appointments: [
        makeDashboardItem(),
        makeDashboardItem({
          id: COMPLETED_ID,
          status: 'completed',
          customerName: 'Peter Njoroge',
          customerPhone: '+254722118904',
          scheduledAt: '2026-05-11T11:00:00.000Z',
          endAt: '2026-05-11T12:00:00.000Z',
        }),
      ],
    }),
  )

function renderTable(overrides: Partial<Parameters<typeof AppointmentTable>[0]> = {}) {
  const handlers = {
    onSelectionChange: vi.fn(),
    onOpen: vi.fn(),
    onAction: vi.fn(),
    onBulkConfirm: vi.fn(),
    onBulkCancel: vi.fn(),
  }

  render(
    <AppointmentTable
      rows={rows()}
      totalCount={2}
      page={1}
      pageCount={1}
      pageSize={25}
      onPageChange={vi.fn()}
      onPageSizeChange={vi.fn()}
      selected={new Set()}
      {...handlers}
      {...overrides}
    />,
  )

  return handlers
}

describe('AppointmentTable', () => {
  it('lists every appointment the server returned, with its contact and status', () => {
    renderTable()

    expect(screen.getByText('Wanjiru Kariuki')).toBeInTheDocument()
    expect(screen.getByText('+254712345678')).toBeInTheDocument()
    expect(screen.getByText('Peter Njoroge')).toBeInTheDocument()
    expect(screen.getAllByText('Signature treatment')).toHaveLength(2)
    expect(screen.getByText('Booked')).toBeInTheDocument()
    expect(screen.getByText('Completed')).toBeInTheDocument()
  })

  it('reports the server total rather than the page length', () => {
    renderTable({ totalCount: 737 })
    expect(
      screen.getByText((_, element) => element?.textContent === 'Showing 2 of 737 appointments in this range'),
    ).toBeInTheDocument()
  })

  it('summarises the value of the appointments on the page', () => {
    renderTable()
    expect(
      screen.getByText((_, element) => element?.textContent === '· Value KES 7,000 on this page'),
    ).toBeInTheDocument()
  })

  it('opens an appointment when its customer is clicked', async () => {
    const user = userEvent.setup()
    const { onOpen } = renderTable()

    await user.click(screen.getByRole('button', { name: /^Wanjiru Kariuki/ }))

    expect(onOpen).toHaveBeenCalledWith(BOOKED_ID)
  })

  it('offers the transitions the server will accept, and no others', async () => {
    const user = userEvent.setup()
    const { onAction } = renderTable()

    const bookedRow = screen.getByRole('row', { name: /Wanjiru Kariuki/ })
    await user.click(within(bookedRow).getByRole('button', { name: /Actions for Wanjiru Kariuki/ }))

    const menu = screen.getByRole('menu')
    expect(within(menu).getByRole('menuitem', { name: 'Confirm' })).toBeInTheDocument()
    expect(within(menu).getByRole('menuitem', { name: 'Cancel appointment' })).toBeInTheDocument()
    expect(within(menu).queryByRole('menuitem', { name: 'Mark completed' })).toBeNull()

    await user.click(within(menu).getByRole('menuitem', { name: 'Confirm' }))
    expect(onAction).toHaveBeenCalledWith('confirm', expect.objectContaining({ id: BOOKED_ID }))
  })

  it('shows no further transition on a completed appointment', async () => {
    const user = userEvent.setup()
    renderTable()

    const completedRow = screen.getByRole('row', { name: /Peter Njoroge/ })
    await user.click(within(completedRow).getByRole('button', { name: /Actions for Peter Njoroge/ }))

    const menu = screen.getByRole('menu')
    expect(within(menu).queryByRole('menuitem', { name: 'Confirm' })).toBeNull()
    expect(within(menu).queryByRole('menuitem', { name: 'Mark completed' })).toBeNull()
    expect(within(menu).queryByRole('menuitem', { name: 'Reschedule' })).toBeNull()
    expect(within(menu).getByRole('menuitem', { name: 'Rebook' })).toBeInTheDocument()
  })

  it('shows the bulk bar once a row is selected', () => {
    renderTable({ selected: new Set([BOOKED_ID]) })

    const bar = screen.getByRole('region', { name: 'Bulk actions' })
    expect(within(bar).getByText('1 selected')).toBeInTheDocument()
    expect(within(bar).getByRole('button', { name: 'Confirm pending' })).toBeInTheDocument()
    expect(within(bar).getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
  })

  it('disables bulk confirmation when nothing selected is still pending', () => {
    renderTable({ selected: new Set([COMPLETED_ID]) })
    expect(screen.getByRole('button', { name: 'Confirm pending' })).toBeDisabled()
  })
})

describe('AppointmentTimeline', () => {
  /** Two bookings on one day, an hour apart, so a gap exists between them. */
  const timelineRows = () =>
    toAppointmentRows(
      makeAppointmentDashboard({
        appointments: [
          makeDashboardItem({
            id: BOOKED_ID,
            scheduledAt: '2026-05-12T09:00:00.000Z',
            endAt: '2026-05-12T10:00:00.000Z',
          }),
          makeDashboardItem({
            id: COMPLETED_ID,
            status: 'completed',
            customerName: 'Peter Njoroge',
            scheduledAt: '2026-05-12T11:00:00.000Z',
            endAt: '2026-05-12T12:00:00.000Z',
          }),
        ],
      }),
    )

  function renderTimeline(overrides: Partial<Parameters<typeof AppointmentTimeline>[0]> = {}) {
    const handlers = { onOpen: vi.fn(), onAction: vi.fn() }
    render(
      <AppointmentTimeline
        rows={timelineRows()}
        scope="day"
        anchor="2026-05-12"
        {...handlers}
        {...overrides}
      />,
    )
    return handlers
  }

  it('reads chronologically and names the free stretch between bookings', () => {
    renderTimeline()

    // Rendered in the viewer's timezone, so the expectation is computed the same way
    // the row is rather than assumed to be UTC.
    const times = screen.getAllByText(/^\d{2}:\d{2}$/).map((node) => node.textContent)
    expect(times.slice(0, 2)).toEqual([
      formatTime('2026-05-12T09:00:00.000Z'),
      formatTime('2026-05-12T11:00:00.000Z'),
    ])
    // 10:00 → 11:00 is an hour nobody is booked for, in any timezone.
    expect(screen.getByText('1h free')).toBeInTheDocument()
  })

  it('keeps every fact of an appointment on its row, and its actions with it', () => {
    const { onAction } = renderTimeline()

    expect(screen.getByText('Wanjiru Kariuki')).toBeInTheDocument()
    expect(screen.getByText('Peter Njoroge')).toBeInTheDocument()
    expect(screen.getAllByText('Signature treatment')).toHaveLength(2)
    expect(screen.getAllByText('Amara Okafor')).toHaveLength(2)
    expect(screen.getByText('Booked')).toBeInTheDocument()
    expect(screen.getByText('Completed')).toBeInTheDocument()
    // The inline quick actions are the same ones the table offers.
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument()
    expect(onAction).not.toHaveBeenCalled()
  })

  it('opens an appointment from its row', async () => {
    const user = userEvent.setup()
    const { onOpen } = renderTimeline()

    await user.click(screen.getByRole('button', { name: /Open Wanjiru Kariuki/ }))
    expect(onOpen).toHaveBeenCalledWith(BOOKED_ID)
  })

  it('counts the appointments in each day heading', () => {
    renderTimeline({ scope: 'month' })
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('collapses days it is not focused on, so a busy month stays light', async () => {
    const user = userEvent.setup()
    renderTimeline({ scope: 'month', anchor: '2026-06-01' })

    // Not today and not the focused day: collapsed, with its count still shown.
    const toggle = screen.getByRole('button', { name: /May/ })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')

    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('Wanjiru Kariuki')).toBeInTheDocument()
  })

  it('loads the next block instead of rendering every appointment at once', async () => {
    const user = userEvent.setup()
    const onShowMore = vi.fn()
    renderTimeline({ totalCount: 50, onShowMore })

    await user.click(screen.getByRole('button', { name: 'Load 24 more' }))
    expect(onShowMore).toHaveBeenCalledTimes(1)
  })

  it('offers nothing to load once every appointment is on screen', () => {
    renderTimeline({ totalCount: 2, onShowMore: vi.fn() })
    expect(screen.queryByRole('button', { name: /Load .* more/ })).toBeNull()
  })
})
