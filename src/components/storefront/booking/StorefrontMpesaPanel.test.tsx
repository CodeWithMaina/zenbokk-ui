import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http } from 'msw'
import { describe, expect, it } from 'vitest'
import { StorefrontMpesaPanel } from './StorefrontMpesaPanel'
import type { Payment, PublicPaymentDetails } from '../../../lib/payments/api'
import { fail, ok } from '../../../test/handlers'
import { renderStorefront } from '../../../test/render'
import { server } from '../../../test/server'

/**
 * Paying a booking fee by manual M-PESA.
 *
 * The properties under test are the ones that keep this flow honest:
 *
 *  - the numbers shown are the business's own, and a half-configured account
 *    renders nothing rather than an instruction that cannot be followed;
 *  - the amount is the server's, never a value the page decided;
 *  - submitting a message does NOT report the booking as paid — it reports that a
 *    person will check it.
 */
const BUSINESS_ID = '11111111-1111-1111-1111-111111111111'
const APPOINTMENT_ID = '22222222-2222-2222-2222-222222222222'
const PAYMENT_ID = '33333333-3333-3333-3333-333333333333'

const base = '*/api/v1'

function details(overrides: Partial<PublicPaymentDetails> = {}): PublicPaymentDetails {
  return {
    businessId: BUSINESS_ID,
    businessName: 'Nuru Studio',
    currency: 'KES',
    enabled: true,
    accountType: 'paybill',
    paybillNumber: '247247',
    paybillAccount: '12345',
    tillNumber: null,
    payeeName: 'NURU STUDIO',
    instructions: null,
    bookingFeePercentage: 50,
    cashEnabled: true,
    ...overrides,
  }
}

function payment(overrides: Partial<Payment> = {}): Payment {
  return {
    id: PAYMENT_ID,
    businessId: BUSINESS_ID,
    customerId: null,
    appointmentId: APPOINTMENT_ID,
    type: 'booking_fee',
    method: 'mpesa',
    provider: 'manual_mpesa',
    status: 'created',
    amount: 500,
    currency: 'KES',
    reference: 'PMT-ABC123',
    externalReference: null,
    phoneNumber: null,
    createdAt: '2026-05-01T09:00:00Z',
    completedAt: null,
    submittedMessage: null,
    submittedAt: null,
    parsedTransactionCode: null,
    parsedAmount: null,
    parsedTransactionAt: null,
    parsedRecipient: null,
    verifiedAt: null,
    verifiedByUserId: null,
    rejectedAt: null,
    rejectedByUserId: null,
    rejectionReason: null,
    verificationEvents: [],
    attempts: [],
    ...overrides,
  }
}

function renderPanel() {
  return renderStorefront(
    <StorefrontMpesaPanel
      businessId={BUSINESS_ID}
      appointmentId={APPOINTMENT_ID}
      serviceTotal={1000}
      bookingFee={500}
    />,
  )
}

describe('StorefrontMpesaPanel', () => {
  it('shows the business’s own PayBill details and the server’s fee', async () => {
    server.use(http.get(`${base}/businesses/:businessId/payment-details`, () => ok(details())))

    renderPanel()

    expect(await screen.findByText(/booking fee to pay now/i)).toBeInTheDocument()
    // `money()` prints whole shillings, and the fee appears in both the headline and
    // the explanation, so every occurrence must say the same thing.
    expect(screen.getAllByText(/KES 500/).length).toBeGreaterThan(0)
    expect(screen.getByText('247247')).toBeInTheDocument()
    expect(screen.getByText('12345')).toBeInTheDocument()
    expect(screen.getByText(/nuru studio/i)).toBeInTheDocument()
    // The percentage the fee came from is stated, so the customer can check the sum.
    expect(screen.getByText(/50%/)).toBeInTheDocument()
  })

  it('renders no numbers at all when the business has not configured M-PESA', async () => {
    server.use(
      http.get(`${base}/businesses/:businessId/payment-details`, () =>
        ok(details({ enabled: false, paybillNumber: null, paybillAccount: null })),
      ),
    )

    renderPanel()

    expect(
      await screen.findByText(/does not take m-pesa payments through punched/i),
    ).toBeInTheDocument()
    expect(screen.queryByText('247247')).not.toBeInTheDocument()
    expect(
      screen.queryByLabelText(/paste your m-pesa confirmation message/i),
    ).not.toBeInTheDocument()
  })

  it('creates the booking-fee payment server-side and then accepts a pasted message', async () => {
    const user = userEvent.setup()
    const creates: unknown[] = []
    const submissions: unknown[] = []
    const submitted = payment({
      status: 'submitted',
      submittedMessage: 'QJK42NUM01 Confirmed. Ksh500.00 sent to NURU STUDIO.',
      submittedAt: '2026-05-01T09:05:00Z',
      parsedTransactionCode: 'QJK42NUM01',
      parsedAmount: 500,
    })

    server.use(
      http.get(`${base}/businesses/:businessId/payment-details`, () => ok(details())),
      http.post(`${base}/payments`, async ({ request }) => {
        creates.push(await request.json())
        return ok(payment())
      }),
      http.post(`${base}/payments/:paymentId/mpesa-message`, async ({ request }) => {
        submissions.push(await request.json())
        return ok(submitted)
      }),
      // The payment only becomes `submitted` once the message has been accepted, so
      // the handler mirrors that: polling before the submit must still show `created`.
      http.get(`${base}/payments/:paymentId`, () =>
        ok(submissions.length > 0 ? submitted : payment()),
      ),
    )

    renderPanel()

    await user.click(await screen.findByRole('button', { name: /i have paid/i }))

    // No money value is ever sent: the server derives the amount from the appointment.
    expect(creates[0]).toMatchObject({
      appointmentId: APPOINTMENT_ID,
      method: 'mpesa',
      type: 'booking_fee',
    })
    expect(creates[0]).not.toHaveProperty('amount')

    const box = await screen.findByLabelText(/paste your m-pesa confirmation message/i)
    await user.type(box, 'QJK42NUM01 Confirmed. Ksh500.00 sent to NURU STUDIO.')
    await user.click(screen.getByRole('button', { name: /submit for verification/i }))

    await waitFor(() => expect(submissions).toHaveLength(1))
    expect(submissions[0]).toMatchObject({
      message: 'QJK42NUM01 Confirmed. Ksh500.00 sent to NURU STUDIO.',
    })

    // Crucially: "waiting to be checked", never "paid".
    expect(await screen.findByText(/will check it and confirm your booking/i)).toBeInTheDocument()
    expect(screen.queryByText(/your booking is confirmed/i)).not.toBeInTheDocument()
  })

  it('surfaces the server’s reason when the pasted message is not a confirmation', async () => {
    const user = userEvent.setup()

    server.use(
      http.get(`${base}/businesses/:businessId/payment-details`, () => ok(details())),
      http.post(`${base}/payments`, () => ok(payment())),
      http.post(`${base}/payments/:paymentId/mpesa-message`, () =>
        fail(
          'MPESA_MESSAGE_NOT_CONFIRMATION',
          'That does not look like an M-PESA confirmation message. Copy the whole SMS you received.',
          400,
        ),
      ),
      // The panel polls the payment it just created; a failed submit leaves it in
      // `created`, which is exactly the state that keeps the box on screen.
      http.get(`${base}/payments/:paymentId`, () => ok(payment())),
    )

    renderPanel()

    await user.click(await screen.findByRole('button', { name: /i have paid/i }))
    await user.type(
      await screen.findByLabelText(/paste your m-pesa confirmation message/i),
      'I paid!',
    )
    await user.click(screen.getByRole('button', { name: /submit for verification/i }))

    expect(
      await screen.findByText(/does not look like an m-pesa confirmation/i),
    ).toBeInTheDocument()
  })

  it('shows the rejection reason and offers another attempt', async () => {
    const user = userEvent.setup()
    const rejected = payment({
      status: 'rejected',
      rejectedAt: '2026-05-01T10:00:00Z',
      rejectionReason: 'We cannot find that transaction on our statement.',
    })

    server.use(
      http.get(`${base}/businesses/:businessId/payment-details`, () => ok(details())),
      http.post(`${base}/payments`, () => ok(rejected)),
      http.get(`${base}/payments/:paymentId`, () => ok(rejected)),
    )

    renderPanel()

    await user.click(await screen.findByRole('button', { name: /i have paid/i }))

    expect(await screen.findByText(/cannot find that transaction/i)).toBeInTheDocument()
    // The slot is still held, so the customer can pay again.
    expect(screen.getByLabelText(/paste your m-pesa confirmation message/i)).toBeInTheDocument()
  })

  it('carries a confirmation pasted during booking: creates the payment then submits it, untapped', async () => {
    const creates: unknown[] = []
    const submissions: unknown[] = []
    const submitted = payment({
      status: 'submitted',
      submittedMessage: 'QJK42NUM99 Confirmed. Ksh500.00 sent to NURU STUDIO.',
      submittedAt: '2026-05-01T09:05:00Z',
      parsedTransactionCode: 'QJK42NUM99',
      parsedAmount: 500,
    })

    server.use(
      http.get(`${base}/businesses/:businessId/payment-details`, () => ok(details())),
      http.post(`${base}/payments`, async ({ request }) => {
        creates.push(await request.json())
        return ok(payment())
      }),
      http.post(`${base}/payments/:paymentId/mpesa-message`, async ({ request }) => {
        submissions.push(await request.json())
        return ok(submitted)
      }),
      http.get(`${base}/payments/:paymentId`, () =>
        ok(submissions.length > 0 ? submitted : payment()),
      ),
    )

    // No click anywhere: the wizard already collected the paste.
    renderStorefront(
      <StorefrontMpesaPanel
        businessId={BUSINESS_ID}
        appointmentId={APPOINTMENT_ID}
        serviceTotal={1000}
        bookingFee={500}
        autoSubmitMessage="QJK42NUM99 Confirmed. Ksh500.00 sent to NURU STUDIO."
      />,
    )

    await waitFor(() => expect(submissions).toHaveLength(1))
    expect(creates).toHaveLength(1)
    expect(submissions[0]).toMatchObject({
      message: 'QJK42NUM99 Confirmed. Ksh500.00 sent to NURU STUDIO.',
    })

    // Still only a claim: the studio has to check it.
    expect(await screen.findByText(/will check it and confirm your booking/i)).toBeInTheDocument()
    expect(screen.queryByText(/your booking is confirmed/i)).not.toBeInTheDocument()
  })

  it('keeps the booking and offers a retry when the carried confirmation is rejected', async () => {
    const user = userEvent.setup()

    server.use(
      http.get(`${base}/businesses/:businessId/payment-details`, () => ok(details())),
      http.post(`${base}/payments`, () => ok(payment())),
      http.post(`${base}/payments/:paymentId/mpesa-message`, () =>
        fail(
          'MPESA_AMOUNT_MISMATCH',
          'That message shows KES 100.00, but KES 500.00 is due for this booking.',
          400,
        ),
      ),
      http.get(`${base}/payments/:paymentId`, () => ok(payment())),
    )

    renderStorefront(
      <StorefrontMpesaPanel
        businessId={BUSINESS_ID}
        appointmentId={APPOINTMENT_ID}
        serviceTotal={1000}
        bookingFee={500}
        autoSubmitMessage="QJK42NUM98 Confirmed. Ksh100.00 sent to NURU STUDIO."
      />,
    )

    // The server's own explanation is shown, and the text is still there to fix.
    expect(await screen.findByText(/KES 500\.00 is due/i)).toBeInTheDocument()
    const box = await screen.findByLabelText(/paste your m-pesa confirmation message/i)
    expect(box).toHaveValue('QJK42NUM98 Confirmed. Ksh100.00 sent to NURU STUDIO.')
    await user.clear(box)
  })
})
