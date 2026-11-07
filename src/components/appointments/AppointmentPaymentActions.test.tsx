import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http } from 'msw'
import { describe, expect, it } from 'vitest'
import { AppointmentPaymentActions } from './AppointmentPaymentActions'
import { TEST_APPOINTMENT_ID, makePaymentSummary } from '../../test/appointments'
import { TEST_BUSINESS_ID } from '../../test/fixtures'
import { ok } from '../../test/handlers'
import { renderDashboard } from '../../test/render'
import { server } from '../../test/server'

/**
 * Collecting money against an appointment.
 *
 * These assertions are about the rules a screenshot cannot show: which actions are
 * offered for a given balance and permission, that the amount the operator states
 * is validated against the server's balance before it is sent, and that raising an
 * M-PESA request never claims the money has arrived.
 */

const base = '*/api/v1'

const BASE_CONFIG = {
  businessId: TEST_BUSINESS_ID,
  cashEnabled: true,
  mpesaEnabled: false,
  mpesaAccountType: 'paybill',
  mpesaShortCode: null,
  hasCredentials: false,
  credentialsUpdatedAt: null,
  manualMpesaEnabled: false,
  mpesaPaybillNumber: null,
  mpesaPaybillAccount: null,
  mpesaTillNumber: null,
  mpesaPayeeName: null,
  mpesaInstructions: null,
  bookingFeePercentage: 0,
  hasManualMpesaDetails: false,
}

/** The owner's payment configuration, with the channel a test needs switched on. */
function configHandler(overrides: Record<string, unknown> = {}) {
  return http.get(`${base}/payment-config`, () => ok({ ...BASE_CONFIG, ...overrides }))
}

/** The public payment details the storefront reads (manual M-PESA + cash). */
function detailsHandler(overrides: Record<string, unknown> = {}) {
  return http.get(`${base}/businesses/:businessId/payment-details`, () =>
    ok({
      businessId: TEST_BUSINESS_ID,
      businessName: 'Test Studio',
      currency: 'KES',
      enabled: false,
      accountType: null,
      paybillNumber: null,
      paybillAccount: null,
      tillNumber: null,
      payeeName: null,
      instructions: null,
      bookingFeePercentage: 0,
      cashEnabled: true,
      ...overrides,
    }),
  )
}

type ActionsProps = Parameters<typeof AppointmentPaymentActions>[0]

function renderActions(overrides: Partial<ActionsProps> = {}) {
  return renderDashboard(
    <AppointmentPaymentActions
      appointmentId={TEST_APPOINTMENT_ID}
      businessId={TEST_BUSINESS_ID}
      summary={makePaymentSummary()}
      collectable
      canInitiate
      canConfirmCash
      {...overrides}
    />,
  )
}

/**
 * Wait until every query the panel started has settled. The payment channels arrive
 * asynchronously, so an assertion made before that would pass for the wrong reason.
 */
async function settle(rendered: ReturnType<typeof renderActions>) {
  await waitFor(() => expect(rendered.queryClient.isFetching()).toBe(0))
}

describe('AppointmentPaymentActions — what is offered', () => {
  it('offers cash collection on an unpaid appointment and shows the outstanding balance', () => {
    renderActions()

    expect(screen.getByText('Outstanding')).toBeInTheDocument()
    expect(screen.getByText('KES 3,500')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /record cash payment/i })).toBeInTheDocument()
    // No M-PESA channel is configured in the default handlers.
    expect(screen.queryByRole('button', { name: /collect balance via m-pesa/i })).toBeNull()
  })

  it('offers nothing to collect once the appointment is fully paid', () => {
    renderActions({
      summary: makePaymentSummary({ amountPaid: 3500, balance: 0, paymentStatus: 'paid' }),
    })

    expect(screen.getByText(/fully paid/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /record cash payment/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /collect balance via m-pesa/i })).toBeNull()
  })

  it('offers nothing on a closed appointment, and says why', () => {
    renderActions({ collectable: false })

    expect(screen.queryByRole('button', { name: /record cash payment/i })).toBeNull()
    expect(screen.getByText(/no further payment is collected/i)).toBeInTheDocument()
  })

  it('offers nothing without the payments.create permission', () => {
    renderActions({ canInitiate: false })
    expect(screen.queryByRole('button', { name: /record cash payment/i })).toBeNull()
  })

  it('shows a pending M-PESA attempt without offering a duplicate, and marks it as not received', async () => {
    server.use(configHandler({ mpesaEnabled: true }))

    const rendered = renderActions({
      summary: makePaymentSummary({
        payments: [
          {
            id: 'pay-pending',
            type: 'balance_payment',
            method: 'mpesa',
            provider: 'daraja_stk',
            status: 'awaiting_customer',
            amount: 3500,
            currency: 'KES',
            reference: 'PMT-PENDING',
            createdAt: '2026-05-01T07:00:00.000Z',
            completedAt: null,
          },
        ],
      }),
    })
    await settle(rendered)

    expect(screen.getByText(/not counted as received yet/i)).toBeInTheDocument()
    // Once in the pending note and once in the history row.
    expect(screen.getAllByText('Pending on customer').length).toBeGreaterThan(0)
    expect(screen.queryByRole('button', { name: /collect balance via m-pesa/i })).toBeNull()
  })
})

describe('AppointmentPaymentActions — recording cash', () => {
  it('records the whole balance, then confirms it, and closes', async () => {
    const posted: unknown[] = []
    let confirmedId: string | null = null
    server.use(
      http.post(`${base}/payments`, async ({ request }) => {
        posted.push(await request.json())
        return ok({ id: 'pay-cash', status: 'created' })
      }),
      http.post(`${base}/payments/:id/confirm-cash`, ({ params }) => {
        confirmedId = String(params.id)
        return ok({ id: 'pay-cash', status: 'success' })
      }),
    )

    const user = userEvent.setup()
    renderActions()

    await user.click(screen.getByRole('button', { name: /record cash payment/i }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByLabelText('Cash received')).toHaveValue(3500)

    await user.click(within(dialog).getByRole('button', { name: /record payment/i }))

    await waitFor(() => expect(posted).toHaveLength(1))
    expect(posted[0]).toMatchObject({
      appointmentId: TEST_APPOINTMENT_ID,
      method: 'cash',
      type: 'balance_payment',
      amount: 3500,
    })
    await waitFor(() => expect(confirmedId).toBe('pay-cash'))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('records a part payment for the amount the operator states', async () => {
    const posted: unknown[] = []
    server.use(
      http.post(`${base}/payments`, async ({ request }) => {
        posted.push(await request.json())
        return ok({ id: 'pay-part', status: 'created' })
      }),
      http.post(`${base}/payments/:id/confirm-cash`, () =>
        ok({ id: 'pay-part', status: 'success' }),
      ),
    )

    const user = userEvent.setup()
    renderActions()

    await user.click(screen.getByRole('button', { name: /record cash payment/i }))
    const dialog = await screen.findByRole('dialog')
    const amount = within(dialog).getByLabelText('Cash received')

    await user.clear(amount)
    await user.type(amount, '400')
    await user.click(within(dialog).getByRole('button', { name: /record payment/i }))

    await waitFor(() => expect(posted).toHaveLength(1))
    expect(posted[0]).toMatchObject({ type: 'balance_payment', amount: 400 })
  })

  it('refuses an amount above the outstanding balance', async () => {
    const user = userEvent.setup()
    renderActions()

    await user.click(screen.getByRole('button', { name: /record cash payment/i }))
    const dialog = await screen.findByRole('dialog')
    const amount = within(dialog).getByLabelText('Cash received')

    await user.clear(amount)
    await user.type(amount, '4000')

    expect(within(dialog).getByRole('button', { name: /record payment/i })).toBeDisabled()
  })

  it('records without confirming when the caller may not confirm cash', async () => {
    const posted: unknown[] = []
    let confirmed = false
    server.use(
      http.post(`${base}/payments`, async ({ request }) => {
        posted.push(await request.json())
        return ok({ id: 'pay-await', status: 'created' })
      }),
      http.post(`${base}/payments/:id/confirm-cash`, () => {
        confirmed = true
        return ok({ id: 'pay-await', status: 'success' })
      }),
    )

    const user = userEvent.setup()
    renderActions({ canConfirmCash: false })

    await user.click(screen.getByRole('button', { name: /record cash payment/i }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText(/stay awaiting confirmation/i)).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: /record for confirmation/i }))

    await waitFor(() => expect(posted).toHaveLength(1))
    expect(confirmed).toBe(false)
  })
})

describe('AppointmentPaymentActions — collecting by M-PESA', () => {
  it('raises the request, keeps it pending, and never claims it is paid', async () => {
    const posted: unknown[] = []
    server.use(
      configHandler({ mpesaEnabled: true }),
      detailsHandler({ enabled: true, paybillNumber: '247247' }),
      http.post(`${base}/payments`, async ({ request }) => {
        posted.push(await request.json())
        return ok({ id: 'pay-mpesa', status: 'awaiting_customer' })
      }),
      http.get(`${base}/payments/:id`, () =>
        ok({ id: 'pay-mpesa', status: 'awaiting_customer', reference: 'PMT-MPESA' }),
      ),
    )

    const user = userEvent.setup()
    const rendered = renderActions()
    await settle(rendered)

    await user.click(screen.getByRole('button', { name: /collect balance via m-pesa/i }))
    const dialog = await screen.findByRole('dialog')

    // A manual channel is configured, so the customer pays and a number is optional.
    await user.click(within(dialog).getByRole('button', { name: /record m-pesa request/i }))

    await waitFor(() => expect(posted).toHaveLength(1))
    expect(posted[0]).toMatchObject({
      appointmentId: TEST_APPOINTMENT_ID,
      method: 'mpesa',
      type: 'balance_payment',
    })

    // The balance is still outstanding; the request is reported as pending, not paid.
    expect(await within(dialog).findByText(/never marks it paid/i)).toBeInTheDocument()
    expect(await within(dialog).findByText(/pending on customer/i)).toBeInTheDocument()
  })
})
