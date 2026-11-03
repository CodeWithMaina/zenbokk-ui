import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { GuestVerifyPanel } from './GuestVerifyPanel'
import { readGuestSession } from '../../../lib/storefront'
import { fail, ok } from '../../../test/handlers'
import { renderStorefront } from '../../../test/render'
import { server } from '../../../test/server'

/**
 * Verifying a guest.
 *
 * The property under test is that a token only exists after the server accepted
 * a code: a wrong code, an expired code or an address that already has an account
 * must all leave the visitor unverified and un-tokened, with the server's own
 * explanation on screen.
 */
const BUSINESS_ID = '11111111-1111-1111-1111-111111111111'

function startHandler() {
  return http.post('*/api/v1/businesses/:businessId/guest-booking/start', () =>
    ok({
      email: 'g•••@test.com',
      phoneNumber: '254712345678',
      expiresAt: '2026-01-01T00:10:00Z',
      resendAvailableAt: '2026-01-01T00:01:00Z',
      codeLength: 6,
      deliveryChannel: 'email',
    }),
  )
}

async function fillDetails(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/your name/i), 'Peter Chege')
  await user.type(screen.getByLabelText(/phone number/i), '0712 345 678')
  await user.type(screen.getByLabelText(/email/i), 'guest@test.com')
}

describe('GuestVerifyPanel', () => {
  it('sends the normalised number and moves to the code step', async () => {
    const user = userEvent.setup()
    const bodies: unknown[] = []
    server.use(
      http.post('*/api/v1/businesses/:businessId/guest-booking/start', async ({ request }) => {
        bodies.push(await request.json())
        return ok({
          email: 'g•••@test.com',
          phoneNumber: '254712345678',
          expiresAt: '2026-01-01T00:10:00Z',
          resendAvailableAt: '2026-01-01T00:01:00Z',
          codeLength: 6,
          deliveryChannel: 'email',
        })
      }),
    )

    renderStorefront(<GuestVerifyPanel businessId={BUSINESS_ID} onVerified={vi.fn()} />)

    await fillDetails(user)
    await user.click(screen.getByRole('button', { name: /send my code/i }))

    expect(await screen.findByText(/we sent a 6-digit code to g•••@test\.com/i)).toBeInTheDocument()
    expect(bodies[0]).toMatchObject({
      fullName: 'Peter Chege',
      phoneNumber: '254712345678',
      email: 'guest@test.com',
    })
  })

  it('shows the server’s reason and issues no token when the code is wrong', async () => {
    const user = userEvent.setup()
    const onVerified = vi.fn()
    server.use(
      startHandler(),
      http.post('*/api/v1/businesses/:businessId/guest-booking/verify', () =>
        fail('CODE_INVALID', 'That code is not valid. Check the email and try again.', 400),
      ),
    )

    renderStorefront(<GuestVerifyPanel businessId={BUSINESS_ID} onVerified={onVerified} />)

    await fillDetails(user)
    await user.click(screen.getByRole('button', { name: /send my code/i }))
    await user.type(await screen.findByLabelText(/your code/i), '000000')
    await user.click(screen.getByRole('button', { name: /verify and continue/i }))

    expect(await screen.findByText(/that code is not valid/i)).toBeInTheDocument()
    expect(onVerified).not.toHaveBeenCalled()
    expect(readGuestSession(BUSINESS_ID)).toBeNull()
  })

  it('stores the short-lived token and reports the verified visitor on success', async () => {
    const user = userEvent.setup()
    const onVerified = vi.fn()
    server.use(
      startHandler(),
      http.post('*/api/v1/businesses/:businessId/guest-booking/verify', () =>
        ok({
          accessToken: 'guest-token',
          expiresIn: 3600,
          tokenType: 'Bearer',
          businessId: BUSINESS_ID,
          customer: {
            fullName: 'Peter Chege',
            phoneNumber: '254712345678',
            email: 'g•••@test.com',
          },
        }),
      ),
    )

    renderStorefront(<GuestVerifyPanel businessId={BUSINESS_ID} onVerified={onVerified} />)

    await fillDetails(user)
    await user.click(screen.getByRole('button', { name: /send my code/i }))
    await user.type(await screen.findByLabelText(/your code/i), '123456')
    await user.click(screen.getByRole('button', { name: /verify and continue/i }))

    await waitFor(() => expect(onVerified).toHaveBeenCalledTimes(1))
    const session = readGuestSession(BUSINESS_ID)
    expect(session?.token).toBe('guest-token')
    expect(session?.fullName).toBe('Peter Chege')
    expect(session?.expiresAt).toBeGreaterThan(Date.now())
  })

  it('tells a visitor who already has an account to sign in instead', async () => {
    const user = userEvent.setup()
    server.use(
      http.post('*/api/v1/businesses/:businessId/guest-booking/start', () =>
        fail('ACCOUNT_EXISTS', 'That email already has a Punched account. Please sign in to book.', 409),
      ),
    )

    renderStorefront(<GuestVerifyPanel businessId={BUSINESS_ID} onVerified={vi.fn()} />)

    await fillDetails(user)
    await user.click(screen.getByRole('button', { name: /send my code/i }))

    expect(await screen.findByText(/already has a punched account/i)).toBeInTheDocument()
    // Still on the details step: nothing was sent, so there is no code to enter.
    expect(screen.queryByLabelText(/your code/i)).not.toBeInTheDocument()
  })

  it('surfaces the resend cooldown rather than pretending the code was sent', async () => {
    const user = userEvent.setup()
    server.use(
      http.post('*/api/v1/businesses/:businessId/guest-booking/start', () =>
        fail('RESEND_TOO_SOON', 'A code was just sent. Try again in 42 seconds.', 429),
      ),
    )

    renderStorefront(<GuestVerifyPanel businessId={BUSINESS_ID} onVerified={vi.fn()} />)

    await fillDetails(user)
    await user.click(screen.getByRole('button', { name: /send my code/i }))

    expect(await screen.findByText(/try again in 42 seconds/i)).toBeInTheDocument()
  })
})
