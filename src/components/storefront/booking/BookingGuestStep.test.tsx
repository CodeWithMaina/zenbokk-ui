import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http } from 'msw'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { BookingWizardPage } from '../../../routes/$slug.book'
import { emptyDraft, writeBookingDraft } from '../../../lib/storefront/booking-draft'
import { makeAppointment, makeAvailability, makePaymentSummary } from '../../../test/appointments'
import { makeService, TEST_BUSINESS_ID } from '../../../test/fixtures'
import { ok } from '../../../test/handlers'
import { renderStorefront } from '../../../test/render'
import { server } from '../../../test/server'

/**
 * A visitor with NO account.
 *
 * The storefront must serve them like anybody else: the details step collects their name, number and
 * email, and the booking goes through the public endpoint without a token, an OTP, or any
 * relationship with the business beforehand.
 */
vi.mock('../../../lib/auth', () => ({
  useAuth: () => ({ isAuthenticated: false, user: null }),
}))

// The identity step links to sign-in. The harness mounts no router, so `Link` is
// replaced with the anchor it renders — the routing context is the only thing dropped.
vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    Link: ({ to, children, ...rest }: { to: string; children?: ReactNode }) => (
      <a href={to} {...rest}>
        {children}
      </a>
    ),
  }
})

const base = '*/api/v1'

const SLOT_DATE = '2026-05-12'
const SLOT_START = `${SLOT_DATE}T09:00:00.000Z`

/** A calendar with one open slot, at the instant the restored draft holds. */
function openSlotCalendar() {
  return http.get(`${base}/businesses/:businessId/availability/calendar`, () =>
    ok({
      businessId: TEST_BUSINESS_ID,
      businessName: 'Nuru Studio',
      timeZoneId: 'UTC',
      serviceIds: [makeService().id],
      totalDurationMinutes: 45,
      slotIntervalMinutes: 30,
      leadTimeMinutes: 0,
      staffUserId: null,
      staffName: null,
      days: [
        {
          date: SLOT_DATE,
          weekday: 'Tuesday',
          dayOfMonth: 12,
          isOpen: true,
          totalSlots: 1,
          availableSlots: 1,
          firstAvailableUtc: SLOT_START,
          slots: [makeAvailability(SLOT_DATE)],
          suggestions: [],
        },
      ],
      noticeCode: null,
      notice: null,
    }),
  )
}

describe('BookingWizardPage (guest)', () => {
  it('asks an anonymous visitor for their details, and asks them to verify nothing', async () => {
    server.use(http.get(`${base}/services/:businessId/staff`, () => ok([])), openSlotCalendar())
    writeBookingDraft(TEST_BUSINESS_ID, {
      ...emptyDraft,
      serviceIds: [makeService().id],
      step: 'identity',
    })

    renderStorefront(<BookingWizardPage />)

    expect(await screen.findByRole('heading', { name: 'Your details' })).toBeInTheDocument()
    // The step sits between the notes and the payment, in the order a booking happens.
    expect(screen.getByRole('list', { name: /of \d+: your details/i })).toBeInTheDocument()

    // The three details the booking is made with are asked for plainly.
    expect(screen.getByLabelText('Full name')).toBeInTheDocument()
    expect(screen.getByLabelText('Mobile number')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()

    // Nothing asks them to prove who they are, or to hold an account.
    expect(screen.queryByText(/send me a code/i)).toBeNull()
    expect(screen.queryByText(/verify your number/i)).toBeNull()
    // And the payment step is still ahead of them.
    expect(screen.queryByLabelText(/paste your m-pesa confirmation message/i)).not.toBeInTheDocument()
  })

  it('books a guest through the public endpoint, with the pasted M-PESA confirmation', async () => {
    const user = userEvent.setup()
    let posted: Record<string, unknown> | null = null

    server.use(
      http.get(`${base}/services/:businessId/staff`, () => ok([])),
      openSlotCalendar(),
      // The business collects manually, so "pay during booking" offers the paste field.
      http.get(`${base}/businesses/:businessId/payment-details`, () =>
        ok({
          businessId: TEST_BUSINESS_ID,
          businessName: 'Nuru Studio',
          currency: 'KES',
          enabled: true,
          accountType: 'paybill',
          paybillNumber: '247247',
          paybillAccount: '12345',
          tillNumber: null,
          phoneNumber: null,
          payeeName: 'NURU STUDIO',
          instructions: null,
          bookingFeePercentage: 50,
          cashEnabled: true,
          payUpfrontEnabled: true,
          payAfterServiceEnabled: false,
          bookingAvailable: true,
          offersPaymentChoice: false,
        }),
      ),
      http.post(`${base}/businesses/:businessId/public-bookings`, async ({ request }) => {
        posted = (await request.json()) as Record<string, unknown>
        return ok({
          appointment: makeAppointment(),
          payment: { id: 'pay-1', appointmentId: makeAppointment().id, status: 'submitted' },
          summary: makePaymentSummary({ amountPaid: 0, balance: 450, bookingFee: 450 }),
          paymentState: 'pending_verification',
          message:
            'Your appointment is booked. The M-PESA confirmation you sent is waiting for the studio to check it.',
          warnings: [],
        })
      }),
    )

    writeBookingDraft(TEST_BUSINESS_ID, {
      ...emptyDraft,
      serviceIds: [makeService().id],
      startsAt: SLOT_START,
      step: 'identity',
      customerName: 'Wanjiru Kariuki',
      customerPhone: '0712345678',
      customerEmail: 'wanjiru@example.test',
    })

    renderStorefront(<BookingWizardPage />)

    const next = await screen.findByRole('button', { name: 'Continue' })
    await waitFor(() => expect(next).toBeEnabled())
    await user.click(next)

    // The payment step is last, and the paste travels WITH the booking rather than after it.
    await user.type(
      await screen.findByLabelText(/paste your m-pesa confirmation message/i),
      'QJK42NUM01 Confirmed. Ksh450.00 sent to NURU STUDIO 247247. M-PESA.',
    )
    await user.click(await screen.findByRole('button', { name: /confirm and send payment/i }))

    await waitFor(() => expect(posted).not.toBeNull())
    // No token and no customer id: the details ARE the identity the server resolves the record from.
    expect(posted!.fullName).toBe('Wanjiru Kariuki')
    expect(posted!.phoneNumber).toBe('0712345678')
    expect(posted!.email).toBe('wanjiru@example.test')
    expect(posted!.paymentOption).toBe('pay_upfront')
    expect(String(posted!.mpesaMessage)).toContain('QJK42NUM01')

    // And the confirmation reports the money's own state instead of claiming it was paid.
    expect(await screen.findByText(/waiting for the studio to check it/i)).toBeInTheDocument()
    expect(screen.getByText(/your payment is being checked/i)).toBeInTheDocument()
  })
})

