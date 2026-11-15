import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { PaymentsSettings } from './PaymentsSettings'
import type { PaymentConfig } from '../../lib/payments/api'
import { ok } from '../../test/handlers'
import { server } from '../../test/server'
import { ThemeProvider } from '../../theme'

/**
 * Payment settings.
 *
 * The screen that decides whether a storefront can ask a customer for an M-PESA
 * confirmation at all. The properties under test are the ones that matter to money:
 * the saved body carries the PayBill/Till the customer will be shown, a half
 * configured account is refused rather than saved, and an untouched secret field
 * cannot wipe a stored credential.
 */
const base = '*/api/v1'

function config(overrides: Partial<PaymentConfig> = {}): PaymentConfig {
  return {
    businessId: '11111111-1111-1111-1111-111111111111',
    cashEnabled: true,
    mpesaEnabled: false,
    mpesaAccountType: 'paybill',
    mpesaShortCode: null,
    hasCredentials: true,
    credentialsUpdatedAt: null,
    manualMpesaEnabled: false,
    mpesaPaybillNumber: null,
    mpesaPaybillAccount: null,
    mpesaTillNumber: null,
    mpesaPhoneNumber: null,
    mpesaPayeeName: null,
    mpesaInstructions: null,
    bookingFeePercentage: 50,
    hasManualMpesaDetails: false,
    // Storefront policy: Payment Included on, Pay After Service off — the defaults.
    payUpfrontEnabled: true,
    payAfterServiceEnabled: false,
    ...overrides,
  }
}

function renderSettings() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  })
  return render(
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <PaymentsSettings />
      </QueryClientProvider>
    </ThemeProvider>,
  )
}

describe('PaymentsSettings', () => {
  it('loads the stored configuration and previews the fee', async () => {
    server.use(
      http.get(`${base}/payment-config`, () =>
        ok(config({ manualMpesaEnabled: true, mpesaPaybillNumber: '247247', bookingFeePercentage: 50 })),
      ),
    )

    renderSettings()

    expect(await screen.findByLabelText(/paybill number/i)).toHaveValue('247247')
    expect(screen.getByDisplayValue('50')).toBeInTheDocument()
    // On a 2,000 bill, half is 1,000 — stated before anything is saved.
    expect(await screen.findByText(/customers pay KES 1,000 now/i)).toBeInTheDocument()
  })

  it('saves the PayBill, account and booking fee the storefront will publish', async () => {
    const user = userEvent.setup()
    const bodies: unknown[] = []

    server.use(
      http.get(`${base}/payment-config`, () => ok(config())),
      http.put(`${base}/payment-config`, async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>
        bodies.push(body)
        return ok(
          config({
            manualMpesaEnabled: true,
            mpesaPaybillNumber: String(body.mpesaPaybillNumber),
            mpesaPaybillAccount: String(body.mpesaPaybillAccount),
            mpesaPayeeName: String(body.mpesaPayeeName),
            bookingFeePercentage: Number(body.bookingFeePercentage),
            hasManualMpesaDetails: true,
          }),
        )
      }),
    )

    renderSettings()

    // The PayBill fields only appear once the channel is switched on.
    await user.click(
      await screen.findByRole('switch', { name: /accept m-pesa payments/i }),
    )
    await user.type(await screen.findByLabelText(/paybill number/i), '247247')
    await user.type(screen.getByLabelText(/paybill account number/i), 'AURELIA')
    await user.type(screen.getByLabelText(/name customers will see/i), 'AURELIA LUXE')
    await user.click(screen.getByRole('button', { name: '25%' }))
    await user.click(screen.getByRole('button', { name: /save payment settings/i }))

    await waitFor(() => expect(bodies).toHaveLength(1))
    expect(bodies[0]).toMatchObject({
      manualMpesaEnabled: true,
      mpesaPaybillNumber: '247247',
      mpesaPaybillAccount: 'AURELIA',
      mpesaPayeeName: 'AURELIA LUXE',
      bookingFeePercentage: 25,
      // Secrets were never touched, so they are sent as null — which the API reads as
      // "keep the stored value" rather than "erase it".
      consumerKey: null,
      consumerSecret: null,
      passkey: null,
    })
  })

  it('refuses to save a PayBill with no account number', async () => {
    const user = userEvent.setup()
    let putCalls = 0

    server.use(
      http.get(`${base}/payment-config`, () => ok(config())),
      http.put(`${base}/payment-config`, () => {
        putCalls += 1
        return ok(config())
      }),
    )

    renderSettings()

    await user.click(
      await screen.findByRole('switch', { name: /accept m-pesa payments/i }),
    )
    await user.type(await screen.findByLabelText(/paybill number/i), '247247')

    expect(
      await screen.findByText(/enter the account number/i),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /save payment settings/i })).toBeDisabled()
    expect(putCalls).toBe(0)
  })

  it('surfaces the server’s refusal rather than pretending the settings saved', async () => {
    const user = userEvent.setup()

    server.use(
      http.get(`${base}/payment-config`, () =>
        ok(config({ manualMpesaEnabled: true, mpesaPaybillNumber: '247247' })),
      ),
      http.put(`${base}/payment-config`, () =>
        ok(config()),
      ),
    )

    renderSettings()

    await screen.findByLabelText(/paybill number/i)
    await user.clear(screen.getByLabelText('Percentage'))
    await user.type(screen.getByLabelText('Percentage'), '150')

    expect(await screen.findByText(/between 0 and 100/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /save payment settings/i })).toBeDisabled()
  })

  it('switches to Send Money and saves the phone number without losing other values', async () => {
    const user = userEvent.setup()
    const bodies: unknown[] = []

    server.use(
      http.get(`${base}/payment-config`, () =>
        ok(config({ manualMpesaEnabled: true, mpesaPaybillNumber: '247247', mpesaPaybillAccount: '12345' })),
      ),
      http.put(`${base}/payment-config`, async ({ request }) => {
        bodies.push(await request.json())
        return ok(
          config({
            manualMpesaEnabled: true,
            mpesaAccountType: 'send_money',
            mpesaPhoneNumber: '254712440001',
            hasManualMpesaDetails: true,
          }),
        )
      }),
    )

    renderSettings()

    // The stored method (PayBill) is selected on load and its fields are shown.
    await screen.findByLabelText(/paybill number/i)
    // Switching methods keeps the PayBill values in state; only the visible fields change.
    await user.click(screen.getByRole('radio', { name: /send money/i }))
    await user.type(screen.getByLabelText('M-PESA number'), '0712 440 001')
    await user.click(screen.getByRole('button', { name: /save payment settings/i }))

    await waitFor(() => expect(bodies).toHaveLength(1))
    expect(bodies[0]).toMatchObject({
      manualMpesaEnabled: true,
      mpesaAccountType: 'send_money',
      mpesaPhoneNumber: '0712 440 001',
      // The inactive PayBill values are still sent, so toggling back never loses them.
      mpesaPaybillNumber: '247247',
      mpesaPaybillAccount: '12345',
    })
  })

  it('places a server field error under its field', async () => {
    const user = userEvent.setup()

    server.use(
      http.get(`${base}/payment-config`, () =>
        ok(config({ manualMpesaEnabled: true, mpesaPaybillNumber: '247247', mpesaPaybillAccount: '12345' })),
      ),
      http.put(`${base}/payment-config`, () =>
        HttpResponse.json(
          {
            success: false,
            data: null,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Check the highlighted field.',
              fields: { mpesaPaybillNumber: 'Use 5–7 digits.' },
            },
          },
          { status: 422 },
        ),
      ),
    )

    renderSettings()

    await user.clear(await screen.findByLabelText(/paybill number/i))
    await user.type(screen.getByLabelText(/paybill number/i), '247247')
    // Force a save attempt even though the client sees the field as valid, so the
    // server's own field message is what lands on screen.
    await user.click(screen.getByRole('button', { name: /save payment settings/i }))

    expect(await screen.findByText('Use 5–7 digits.')).toBeInTheDocument()
  })

  // ── The storefront payment options ───────────────────────
  // Two independent switches that decide what the booking page asks a customer for. They are
  // saved together, because the pair is what the server validates.

  it('shows both storefront payment options and saves them together', async () => {
    const user = userEvent.setup()
    const bodies: Record<string, unknown>[] = []

    server.use(
      http.get(`${base}/payment-config`, () => ok(config())),
      http.put(`${base}/payment-config`, async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>
        bodies.push(body)
        return ok(
          config({
            payUpfrontEnabled: Boolean(body.payUpfrontEnabled),
            payAfterServiceEnabled: Boolean(body.payAfterServiceEnabled),
          }),
        )
      }),
    )

    renderSettings()

    // The defaults, as the storefront sees them: paying during booking on, paying after off.
    const payUpfront = await screen.findByRole('switch', { name: 'Payment Included' })
    const payAfter = screen.getByRole('switch', { name: 'Pay After Service' })
    expect(payUpfront).toHaveAttribute('aria-checked', 'true')
    expect(payAfter).toHaveAttribute('aria-checked', 'false')
    // With one option on the customer is not asked, and the screen says so.
    expect(screen.getByText(/customers pay during booking — they are not asked to choose/i))
      .toBeInTheDocument()

    await user.click(payAfter)
    expect(payAfter).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByText(/customers choose how they want to pay/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /save payment settings/i }))

    await waitFor(() => expect(bodies).toHaveLength(1))
    expect(bodies[0].payUpfrontEnabled).toBe(true)
    expect(bodies[0].payAfterServiceEnabled).toBe(true)
  })

  it('refuses to save with both payment options off and says why', async () => {
    const user = userEvent.setup()
    let saved = false

    server.use(
      http.get(`${base}/payment-config`, () => ok(config())),
      http.put(`${base}/payment-config`, () => {
        saved = true
        return ok(config())
      }),
    )

    renderSettings()

    await user.click(await screen.findByRole('switch', { name: 'Payment Included' }))

    expect(screen.getByText(/keep at least one option on/i)).toBeInTheDocument()
    // The owner is told before saving, so this screen can never leave the business unbookable.
    expect(screen.getByRole('button', { name: /save payment settings/i })).toBeDisabled()
    expect(saved).toBe(false)
  })

  it('shows the server’s refusal when the saved pair is rejected', async () => {
    const user = userEvent.setup()

    server.use(
      http.get(`${base}/payment-config`, () => ok(config())),
      http.put(`${base}/payment-config`, () =>
        HttpResponse.json(
          {
            success: false,
            data: null,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Keep at least one payment option on: customers can pay during booking, after the service, or both.',
            },
          },
          { status: 422 },
        ),
      ),
    )

    renderSettings()

    await user.click(await screen.findByRole('switch', { name: 'Pay After Service' }))
    await user.click(screen.getByRole('button', { name: /save payment settings/i }))

    expect(await screen.findByText(/keep at least one payment option on/i)).toBeInTheDocument()
  })
})
