import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { toAppointmentRows } from '../../lib/appointments'
import { makeAppointmentDashboard, makeDashboardItem } from '../../test/appointments'
import { AppointmentCards } from './AppointmentCards'
import { AppointmentTable } from './AppointmentTable'

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

describe('AppointmentCards', () => {
  it('groups by day and reports how many appointments each day holds', () => {
    render(<AppointmentCards rows={rows()} groupByDate onOpen={vi.fn()} onAction={vi.fn()} />)

    expect(screen.getByText('Wanjiru Kariuki')).toBeInTheDocument()
    expect(screen.getByText('Peter Njoroge')).toBeInTheDocument()
    expect(screen.getAllByText('1 appointment')).toHaveLength(2)
  })

  it('shows a dash rather than a price when the catalogue has none', () => {
    const [row] = rows()
    render(
      <AppointmentCards
        rows={[{ ...row, price: null }]}
        groupByDate={false}
        onOpen={vi.fn()}
        onAction={vi.fn()}
      />,
    )

    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('offers the next legal step as an inline action', async () => {
    const user = userEvent.setup()
    const onAction = vi.fn()
    render(
      <AppointmentCards
        rows={[rows()[0]]}
        groupByDate={false}
        onOpen={vi.fn()}
        onAction={onAction}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Confirm' }))
    expect(onAction).toHaveBeenCalledWith('confirm', expect.objectContaining({ id: BOOKED_ID }))
  })

  it('offers “Show more” when the server holds more than the page', async () => {
    const user = userEvent.setup()
    const onShowMore = vi.fn()
    render(
      <AppointmentCards
        rows={rows()}
        groupByDate={false}
        totalCount={50}
        onShowMore={onShowMore}
        onOpen={vi.fn()}
        onAction={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Show 24 more' }))
    expect(onShowMore).toHaveBeenCalledTimes(1)
  })

  it('hides “Show more” once every appointment is on screen', () => {
    render(
      <AppointmentCards
        rows={rows()}
        groupByDate={false}
        totalCount={2}
        onShowMore={vi.fn()}
        onOpen={vi.fn()}
        onAction={vi.fn()}
      />,
    )

    expect(screen.queryByRole('button', { name: /Show .* more/ })).toBeNull()
  })
})
