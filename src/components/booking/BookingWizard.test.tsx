import { http } from 'msw'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ApiEnvelope } from '../../lib/api/types'
import { todayKey } from '../../lib/booking'
import { TEST_BUSINESS_ID } from '../../test/fixtures'
import { TEST_CUSTOMER_ID, makeAppointment, makeServiceBucket } from '../../test/appointments'
import { renderDashboard } from '../../test/render'
import { server } from '../../test/server'
import { BookingWizard } from './BookingWizard'

/**
 * The booking flow's behaviour at the API boundary.
 *
 * The point of these tests is that the flow asks the real endpoints, in the real
 * order, and that a payment which does not land is reported as itself rather than
 * being retried in a way that would book the appointment a second time.
 */

const base = '*/api/v1'

function ok<T>(data: T): Response {
  const envelope: ApiEnvelope<T> = { success: true, data, error: null }
  return Response.json(envelope) as unknown as Response
}

function fail(code: string, message: string, status = 500): Response {
  return Response.json(
    { success: false, data: null, error: { code, message } },
    { status },
  ) as unknown as Response
}

function makePayment(overrides: Record<string, unknown> = {}) {
  return {
    id: 'pay-1',
    businessId: TEST_BUSINESS_ID,
    customerId: TEST_CUSTOMER_ID,
    appointmentId: makeAppointment().id,
    type: 'full_payment',
    method: 'cash',
    provider: 'cash',
    status: 'created',
    amount: 3500,
    currency: 'KES',
    reference: 'PMT-1',
    externalReference: null,
    phoneNumber: null,
    createdAt: '2026-05-12T09:00:00.000Z',
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

/** The business's public payment details, which decide the booking percentage. */
function paymentDetails(enabled = true, percent = 30) {
  return http.get(`${base}/businesses/:businessId/payment-details`, () =>
    ok({
      businessId: TEST_BUSINESS_ID,
      businessName: 'Aurelia Luxe',
      currency: 'KES',
      enabled,
      accountType: enabled ? 'paybill' : null,
      paybillNumber: enabled ? '522522' : null,
      paybillAccount: enabled ? 'AURELIA' : null,
      tillNumber: null,
      phoneNumber: null,
      payeeName: 'AURELIA LUXE',
      instructions: null,
      bookingFeePercentage: percent,
      cashEnabled: true,
      payUpfrontEnabled: true,
      payAfterServiceEnabled: true,
      bookingAvailable: true,
      offersPaymentChoice: true,
    }),
  )
}

/** 09:00 free, 11:00 taken — the day's real grid, as the endpoint returns it. */
function availability() {
  return http.get(`${base}/businesses/:businessId/availability`, ({ request }) => {
    const date = new URL(request.url).searchParams.get('startDate') ?? todayKey()
    const slot = (localTime: string, isAvailable: boolean, status: string) => ({
      startAtUtc: `${date}T${localTime}:00.000Z`,
      endAtUtc: `${date}T${localTime}:00.000Z`,
      staffUserId: null,
      staffName: '',
      serviceIds: [],
      status,
      isAvailable,
      localDate: date,
      localTime,
      dayPart: 'morning',
      alternativeStaff: [],
    })
    return ok([slot('09:00', true, 'available'), slot('11:00', false, 'booked')])
  })
}

const CUSTOMER = {
  userId: TEST_CUSTOMER_ID,
  fullName: 'Wanjiru Kariuki',
  email: 'wanjiru@example.test',
  phoneNumber: '+254712345678',
  avatarUrl: null,
  enrollmentStatus: 'active',
}

const SERVICE = {
  id: makeServiceBucket().id,
  name: 'Signature treatment',
  price: 3500,
  durationMinutes: 60,
}

function renderWizard(overrides: Partial<Parameters<typeof BookingWizard>[0]> = {}) {
  const onClose = vi.fn()
  const onBooked = vi.fn()
  renderDashboard(
    <BookingWizard
      open
      onClose={onClose}
      businessId={TEST_BUSINESS_ID}
      businessName="Aurelia Luxe"
      services={[makeServiceBucket()]}
      paymentsEnabled
      onBooked={onBooked}
      {...overrides}
    />,
  )
  return { onClose, onBooked }
}

const prefilled = {
  customer: CUSTOMER,
  services: [SERVICE],
  date: todayKey(),
  slot: '09:00',
}

/** Walk a fully pre-filled draft to the review step and pay in cash. */
async function goToReview(user: ReturnType<typeof userEvent.setup>) {
  const next = () => user.click(screen.getByRole('button', { name: 'Continue' }))
  await next() // Customer → Services
  await next() // Services → Date & time
  await next() // Date & time → Payment
  await user.click(screen.getByRole('button', { name: 'Cash' }))
  await next() // Payment → Review
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Confirm appointment' })).toBeEnabled(),
  )
}

describe('BookingWizard', () => {
  beforeEach(() => {
    server.use(paymentDetails(), availability())
  })

  it('will not leave the customer step until a type and a customer are named', async () => {
    const user = userEvent.setup()
    renderWizard()

    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled()

    await user.click(screen.getByRole('radio', { name: /Walk-in/ }))
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: /Add customer/ }))
    await user.type(screen.getByLabelText('Full name'), 'Zawadi Achieng')
    await user.type(screen.getByLabelText('Phone number'), '0712345678')
    expect(screen.getByLabelText(/Email/)).toBeInTheDocument()
  })

  it('records a cash booking once, however many times Confirm is pressed', async () => {
    const user = userEvent.setup()
    let created = 0
    let paymentsCreated = 0
    server.use(
      http.post(`${base}/businesses/me/appointments`, () => {
        created += 1
        return ok(makeAppointment({ status: 'booked' }))
      }),
      http.post(`${base}/payments`, () => {
        paymentsCreated += 1
        return ok(makePayment())
      }),
      http.post(`${base}/payments/:id/confirm-cash`, () => ok(makePayment({ status: 'success' }))),
    )

    renderWizard({ prefill: prefilled })
    await goToReview(user)

    const confirm = screen.getByRole('button', { name: 'Confirm appointment' })
    await user.click(confirm)
    await user.click(confirm)

    await waitFor(() => expect(screen.getByText('Appointment confirmed')).toBeInTheDocument())
    expect(created).toBe(1)
    expect(paymentsCreated).toBe(1)
  })

  it('reports a payment that did not land, and retries it without booking again', async () => {
    const user = userEvent.setup()
    let created = 0
    let attempts = 0
    server.use(
      http.post(`${base}/businesses/me/appointments`, () => {
        created += 1
        return ok(makeAppointment({ status: 'booked' }))
      }),
      http.post(`${base}/payments`, () => {
        attempts += 1
        return attempts === 1 ? fail('SERVER_ERROR', 'Payments are down.') : ok(makePayment())
      }),
      http.post(`${base}/payments/:id/confirm-cash`, () => ok(makePayment({ status: 'success' }))),
    )

    renderWizard({ prefill: prefilled })
    await goToReview(user)
    await user.click(screen.getByRole('button', { name: 'Confirm appointment' }))

    // The appointment exists and the failure is the payment's, not the booking's.
    await waitFor(() =>
      expect(screen.getAllByText(/Payments are down\./).length).toBeGreaterThan(0),
    )
    expect(created).toBe(1)

    await user.click(screen.getByRole('button', { name: 'Record the payment again' }))
    await waitFor(() => expect(attempts).toBe(2))
    expect(created).toBe(1)
  })

  it('clears the chosen time when the services change', async () => {
    const user = userEvent.setup()
    renderWizard({
      prefill: { customer: CUSTOMER, services: [SERVICE], date: todayKey() },
    })

    // Customer → Services → Date & time.
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    await user.click(screen.getByRole('button', { name: 'Continue' }))

    const slot = await screen.findByRole('button', { name: '09:00' })
    await user.click(slot)
    expect(slot).toHaveAttribute('aria-pressed', 'true')

    // Change the services: the length of the booking changed, so the time must go.
    await user.click(screen.getByRole('button', { name: 'Back to Services' }))
    const service = screen.getByRole('button', { name: /Signature treatment/ })
    await user.click(service)
    await user.click(service)

    await user.click(screen.getByRole('button', { name: 'Continue' }))
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '09:00' })).toHaveAttribute('aria-pressed', 'false'),
    )
  })
})
