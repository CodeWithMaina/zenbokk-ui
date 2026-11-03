import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { makeCustomerBucket, makeServiceBucket, makeStaffBucket, TEST_SERVICE_ID } from '../../test/appointments'
import { renderDashboard } from '../../test/render'
import { AppointmentBookingForm } from './AppointmentBookingForm'

/**
 * The booking drawer.
 *
 * The times it offers come from the availability endpoint over MSW, so these
 * assertions cover the whole path: the request the drawer builds, the envelope
 * the client unwraps, and the payload it hands back on submit.
 */

function renderForm(overrides: Partial<Parameters<typeof AppointmentBookingForm>[0]> = {}) {
  const onSubmit = vi.fn()

  renderDashboard(
    <AppointmentBookingForm
      open
      onClose={vi.fn()}
      mode="new"
      businessId="11111111-1111-1111-1111-111111111111"
      customers={[makeCustomerBucket()]}
      services={[makeServiceBucket()]}
      staff={[makeStaffBucket()]}
      onSubmit={onSubmit}
      {...overrides}
    />,
  )

  return { onSubmit }
}

describe('AppointmentBookingForm', () => {
  it('offers the enrolled customers, searched locally', async () => {
    const user = userEvent.setup()
    renderForm()

    expect(screen.getByRole('radio', { name: /Wanjiru Kariuki/ })).toBeInTheDocument()

    await user.type(screen.getByLabelText('Search customers'), 'zzz')
    expect(screen.queryByRole('radio', { name: /Wanjiru Kariuki/ })).toBeNull()
    expect(screen.getByText(/No enrolled customer matches/)).toBeInTheDocument()
  })

  it('lists only the slots the server says are free', async () => {
    renderForm()

    // 09:00 and 10:00 are free; 11:00 is booked, so it is not offered at all.
    expect(await screen.findByRole('button', { name: '09:00' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '10:00' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '11:00' })).toBeNull()
  })

  it('refuses to submit until a customer is chosen', async () => {
    const user = userEvent.setup()
    const { onSubmit } = renderForm()

    const submit = screen.getByRole('button', { name: 'Create booking' })
    expect(submit).toBeDisabled()

    await user.click(screen.getByRole('radio', { name: /Wanjiru Kariuki/ }))
    expect(submit).toBeEnabled()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('hands back the customer, service and start time the operator chose', async () => {
    const user = userEvent.setup()
    const { onSubmit } = renderForm()

    await user.click(screen.getByRole('radio', { name: /Wanjiru Kariuki/ }))
    await user.click(await screen.findByRole('button', { name: '09:00' }))
    await user.click(screen.getByRole('button', { name: 'Create booking' }))

    expect(onSubmit).toHaveBeenCalledTimes(1)
    const submission = onSubmit.mock.calls[0][0]
    expect(submission).toMatchObject({
      mode: 'new',
      customerId: makeCustomerBucket().userId,
      serviceId: TEST_SERVICE_ID,
    })
    expect(submission.start).toBeInstanceOf(Date)
  })

  it('reports a server refusal in place instead of closing', () => {
    renderForm({ error: 'That time is no longer available for this staff member.' })

    expect(
      screen.getByText('That time is no longer available for this staff member.'),
    ).toBeInTheDocument()
  })

  it('pre-fills a reschedule from the appointment being moved', () => {
    renderForm({
      mode: 'reschedule',
      prefill: {
        appointmentId: 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa',
        customerId: makeCustomerBucket().userId,
        serviceId: TEST_SERVICE_ID,
        start: new Date(2026, 4, 12, 9, 0),
      },
    })

    expect(screen.getByRole('heading', { name: 'Reschedule appointment' })).toBeInTheDocument()
    expect(screen.getByLabelText('Date')).toHaveValue('2026-05-12')
    expect(screen.getByLabelText('Start time')).toHaveValue('09:00')
    // A reschedule keeps its customer, so the picker is not offered again.
    expect(screen.queryByLabelText('Search customers')).toBeNull()
  })
})
