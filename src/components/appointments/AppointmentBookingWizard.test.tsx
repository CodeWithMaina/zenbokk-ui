import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http } from 'msw'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppointmentBookingWizard } from './AppointmentBookingWizard'
import {
  TEST_APPOINTMENT_ID,
  TEST_CUSTOMER_ID,
  TEST_STAFF_ID,
  makeServiceBucket,
} from '../../test/appointments'
import { TEST_BUSINESS_ID } from '../../test/fixtures'
import { ok } from '../../test/handlers'
import { renderDashboard } from '../../test/render'
import { server } from '../../test/server'

/**
 * The guided booking wizard.
 *
 * These assertions are about behaviour a screenshot cannot show: which steps exist
 * for a given entitlement, that a step disappears entirely (rather than showing a
 * dead placeholder) when its module is off, and that confirming the wizard writes
 * the appointment — and any immediate payment — through the real API client.
 */

const base = '*/api/v1'

/** The business roster the searchable customer selector reads. */
function customerRoster() {
  return ok({
    items: [
      {
        userId: TEST_CUSTOMER_ID,
        fullName: 'Wanjiru Kariuki',
        email: 'wanjiru@example.test',
        phoneNumber: '+254712345678',
        avatarUrl: null,
        enrollmentStatus: 'active',
      },
    ],
    totalCount: 1,
    page: 1,
    pageSize: 20,
  })
}

/** The team roster the searchable staff selector reads. */
function staffRoster() {
  return ok({
    items: [
      {
        userId: TEST_STAFF_ID,
        fullName: 'Amara Okafor',
        email: 'amara@example.test',
        avatarUrl: null,
        stampsIssued: 0,
        dailyGoalOverride: null,
        dailyGoal: null,
        dailyGoalType: 'stamps',
        appointmentDailyGoalOverride: null,
        appointmentDailyGoal: null,
        appointmentsToday: 0,
      },
    ],
    page: 1,
    pageSize: 20,
    total: 1,
    totalPages: 1,
  })
}

type WizardProps = Parameters<typeof AppointmentBookingWizard>[0]

function renderWizard(overrides: Partial<WizardProps> = {}) {
  const onBooked = vi.fn()
  const onClose = vi.fn()
  renderDashboard(
    <AppointmentBookingWizard
      open
      onClose={onClose}
      businessId={TEST_BUSINESS_ID}
      staffModuleEnabled
      paymentsEnabled
      services={[makeServiceBucket()]}
      onBooked={onBooked}
      {...overrides}
    />,
  )
  return { onBooked, onClose }
}

/** Walk Steps 1–3 (customer, service, time) up to the payment/review step. */
async function chooseCustomerServiceAndTime(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('option', { name: /Wanjiru Kariuki/ }))
  await user.click(screen.getByRole('button', { name: 'Continue' }))

  await user.click(screen.getByRole('button', { name: /Signature treatment/ }))
  await user.click(screen.getByRole('button', { name: 'Continue' }))

  await user.click(await screen.findByRole('button', { name: '09:00' }))
  await user.click(screen.getByRole('button', { name: 'Continue' }))
}

beforeEach(() => {
  server.use(
    http.get(`${base}/businesses/me/customers`, () => customerRoster()),
    http.get(`${base}/businesses/me/staff`, () => staffRoster()),
  )
})

describe('AppointmentBookingWizard — module-aware steps', () => {
  /** The step indicator alone (`<ol aria-label="Booking steps">`). */
  const steps = () => within(screen.getByRole('list', { name: 'Booking steps' }))

  it('hides the Staff step entirely when the Staff module is off', () => {
    renderWizard({ staffModuleEnabled: false })

    expect(steps().getByText('Customer')).toBeInTheDocument()
    expect(steps().getByText('Service')).toBeInTheDocument()
    expect(steps().getByText('Date & time')).toBeInTheDocument()
    expect(steps().queryByText('Staff')).toBeNull()
  })

  it('shows the Staff step when the Staff module is on', () => {
    renderWizard({ staffModuleEnabled: true })
    expect(steps().getByText('Staff')).toBeInTheDocument()
  })

  it('hides the Payment step when the Payments module is off', () => {
    renderWizard({ paymentsEnabled: false })
    expect(steps().queryByText('Payment')).toBeNull()
    expect(steps().getByText('Review')).toBeInTheDocument()
  })

  it('shows the Payment step when the Payments module is on', () => {
    renderWizard({ paymentsEnabled: true })
    expect(steps().getByText('Payment')).toBeInTheDocument()
  })
})

describe('AppointmentBookingWizard — booking flow', () => {
  it('books an appointment without staff or payment steps', async () => {
    const user = userEvent.setup()
    const { onBooked } = renderWizard({ staffModuleEnabled: false, paymentsEnabled: false })

    await chooseCustomerServiceAndTime(user)

    expect(screen.getByRole('button', { name: 'Confirm appointment' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Confirm appointment' }))

    await waitFor(() => expect(onBooked).toHaveBeenCalledTimes(1))
    // Nothing staged a payment, so the operator is told the appointment is created.
    expect(onBooked.mock.calls[0][1]).toMatch(/created/i)
  })

  it('records a booking-fee cash payment when a deposit is configured', async () => {
    let postedType: string | undefined
    let postedMethod: string | undefined
    let cashConfirmed = false

    server.use(
      http.get(`${base}/businesses/:businessId/payment-details`, () =>
        ok({
          businessId: TEST_BUSINESS_ID,
          businessName: 'Test Studio',
          currency: 'KES',
          enabled: true,
          accountType: 'till',
          paybillNumber: null,
          paybillAccount: null,
          tillNumber: '123456',
          payeeName: 'Test Studio',
          instructions: 'Pay to till 123456',
          bookingFeePercentage: 50,
          cashEnabled: true,
        }),
      ),
      http.post(`${base}/payments`, async ({ request }) => {
        const body = (await request.json()) as { type: string; method: string }
        postedType = body.type
        postedMethod = body.method
        return ok({
          id: 'pay-1',
          appointmentId: TEST_APPOINTMENT_ID,
          type: 'booking_fee',
          method: 'cash',
          amount: 1750,
          status: 'created',
        })
      }),
      http.post(`${base}/payments/:id/confirm-cash`, () => {
        cashConfirmed = true
        return ok({
          id: 'pay-1',
          appointmentId: TEST_APPOINTMENT_ID,
          type: 'booking_fee',
          method: 'cash',
          amount: 1750,
          status: 'verified',
        })
      }),
    )

    const user = userEvent.setup()
    const { onBooked } = renderWizard({ staffModuleEnabled: false, paymentsEnabled: true })

    await chooseCustomerServiceAndTime(user)

    // Step 5 — Payment. The default arrangement is pay-after-service; the operator
    // explicitly chooses the configured deposit instead.
    await user.click(screen.getByRole('radio', { name: /Booking fee/ }))
    await user.click(screen.getByRole('button', { name: 'Continue' }))

    // Step 6 — Review, then confirm.
    await user.click(screen.getByRole('button', { name: 'Confirm appointment' }))

    await waitFor(() => expect(onBooked).toHaveBeenCalledTimes(1))
    expect(postedType).toBe('booking_fee')
    expect(postedMethod).toBe('cash')
    expect(cashConfirmed).toBe(true)
  })
})

