import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { toAppointmentRows } from '../../lib/appointments'
import { MODULE } from '../../lib/entitlements'
import {
  TEST_APPOINTMENT_ID,
  makeAppointment,
  makeAppointmentDashboard,
  makeDashboardContext,
  makeDashboardItem,
} from '../../test/appointments'
import { renderDashboard } from '../../test/render'
import { server } from '../../test/server'
import { AppointmentDetail } from './AppointmentDetail'

/**
 * The appointment record.
 *
 * Everything asserted here is data the API returned: the record, its status
 * history, the customer's other visits and the server's payment summary. The
 * test would fail if the screen invented any of it.
 */

function renderDetail(
  overrides: Partial<Parameters<typeof AppointmentDetail>[0]> = {},
  context?: Parameters<typeof renderDashboard>[1],
) {
  const onSaveNote = vi.fn()
  const onAction = vi.fn()
  const onBack = vi.fn()

  const row = toAppointmentRows(makeAppointmentDashboard())[0]

  const result = renderDashboard(
    <AppointmentDetail
      appointmentId={TEST_APPOINTMENT_ID}
      row={row}
      onBack={onBack}
      onAction={onAction}
      onOpenAppointment={vi.fn()}
      onSaveNote={onSaveNote}
      {...overrides}
    />,
    context,
  )

  return { ...result, onSaveNote, onAction, onBack }
}

describe('AppointmentDetail', () => {
  it('renders the persisted record: customer, service, time and reference', async () => {
    renderDetail()

    expect(
      await screen.findByRole('heading', { name: 'Wanjiru Kariuki' }),
    ).toBeInTheDocument()
    expect(screen.getByText('AP-AAAAAAAA')).toBeInTheDocument()
    expect(screen.getAllByText('Signature treatment').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Booked').length).toBeGreaterThan(0)
  })

  it('shows the status history the backend recorded', async () => {
    renderDetail()

    expect(await screen.findByText('Booked online.')).toBeInTheDocument()
    expect(screen.getByText(/confirmed · by Amara Okafor/)).toBeInTheDocument()
  })

  it('reads the payment summary from the payments endpoint', async () => {
    renderDetail()

    expect(await screen.findByText('Service total')).toBeInTheDocument()
    expect(screen.getAllByText('KES 3,500').length).toBeGreaterThan(0)
    expect(screen.getByText('Unpaid')).toBeInTheDocument()
  })

  it('omits the payment card when the business is not entitled to payments', async () => {
    renderDetail({}, {
      context: makeDashboardContext({
        entitlements: [MODULE.appointments],
        hasModule: (key: string) => key === MODULE.appointments,
      }),
    })

    // The appointment itself still renders; only the payments panel is gone,
    // because the endpoint behind it would 403 for this plan.
    expect(await screen.findByRole('heading', { name: 'Wanjiru Kariuki' })).toBeInTheDocument()
    expect(screen.queryByText('Service total')).toBeNull()
    expect(screen.queryByText('Payment')).toBeNull()
  })

  it('saves the note the operator typed', async () => {
    const user = userEvent.setup()
    const { onSaveNote } = renderDetail()

    const note = await screen.findByLabelText('Note for the team')
    await user.type(note, 'Allergic to lavender')
    await user.click(screen.getByRole('button', { name: 'Save note' }))

    expect(onSaveNote).toHaveBeenCalledWith('Allergic to lavender')
  })

  it('reports a failed note save next to the button', async () => {
    renderDetail({ noteError: 'You do not have permission to edit this appointment.' })

    expect(
      await screen.findByText('You do not have permission to edit this appointment.'),
    ).toBeInTheDocument()
  })

  it('offers Confirm as the primary action on a pending booking', async () => {
    const user = userEvent.setup()
    const { onAction } = renderDetail()

    // Wait for the record to load. The header's primary action is rendered
    // before the inline quick actions, which repeat the same move.
    const heading = await screen.findByRole('heading', { name: 'Wanjiru Kariuki' })
    const header = heading.closest('header') as HTMLElement
    const [primary] = within(header).getAllByRole('button', { name: 'Confirm' })
    await user.click(primary)

    expect(onAction).toHaveBeenCalledWith('confirm')
  })

  it('goes back to the list', async () => {
    const user = userEvent.setup()
    const { onBack } = renderDetail()

    await user.click(screen.getByRole('button', { name: 'Appointments' }))
    expect(onBack).toHaveBeenCalled()
  })
})

/** A completed appointment, so the primary action is Rebook rather than Confirm. */
describe('AppointmentDetail on a terminal appointment', () => {
  it('offers Rebook instead of a transition that is no longer legal', async () => {
    // The record itself is terminal; the primary action follows the server's
    // status, not the row the list happened to hold.
    server.use(
      http.get('*/api/v1/businesses/me/appointments/:id', () =>
        HttpResponse.json({
          success: true,
          data: makeAppointment({ status: 'completed' }),
          error: null,
        }),
      ),
    )

    const row = toAppointmentRows(
      makeAppointmentDashboard({
        appointments: [makeDashboardItem({ status: 'completed' })],
      }),
    )[0]

    renderDashboard(
      <AppointmentDetail
        appointmentId={TEST_APPOINTMENT_ID}
        row={row}
        onBack={vi.fn()}
        onAction={vi.fn()}
        onOpenAppointment={vi.fn()}
        onSaveNote={vi.fn()}
      />,
    )

    const header = (await screen.findByRole('heading', { name: 'Wanjiru Kariuki' })).closest(
      'header',
    ) as HTMLElement
    expect(within(header).getAllByRole('button', { name: /Rebook/ }).length).toBeGreaterThan(0)
    expect(within(header).queryByRole('button', { name: 'Confirm' })).toBeNull()
  })
})
