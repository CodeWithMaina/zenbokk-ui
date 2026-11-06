import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http } from 'msw'
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
    mpesaPayeeName: null,
    mpesaInstructions: null,
    bookingFeePercentage: 50,
    hasManualMpesaDetails: false,
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
      await screen.findByRole('switch', { name: /accept m-pesa confirmations/i }),
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
      await screen.findByRole('switch', { name: /accept m-pesa confirmations/i }),
    )
    await user.type(await screen.findByLabelText(/paybill number/i), '247247')

    expect(
      await screen.findByText(/paybill needs an account number/i),
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
})