import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { StorefrontEnquiryForm } from './StorefrontEnquiryForm'
import { fail, ok } from '../../test/handlers'
import { renderStorefront } from '../../test/render'
import { server } from '../../test/server'

/**
 * The enquiry form.
 *
 * Walks the four steps a visitor actually walks, and asserts the two things
 * that matter: the number is normalised before it is sent (so the owner can
 * reply), and the confirmation quotes the server's own reference rather than
 * one the browser made up.
 */
async function completeSteps(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /ask about our services/i }))
  await user.click(screen.getByRole('button', { name: /^prices$/i }))
  await user.click(screen.getByRole('button', { name: /call me/i }))
}

describe('StorefrontEnquiryForm', () => {
  it('sends the visitor’s answers with a normalised Kenyan number', async () => {
    const user = userEvent.setup()
    const bodies: unknown[] = []
    server.use(
      http.post('*/api/v1/businesses/:businessId/enquiries', async ({ request }) => {
        bodies.push(await request.json())
        return ok({
          reference: 'ENQ-7F3A2C4D',
          businessName: 'Nuru Studio',
          receivedAt: '2026-01-01T09:00:00Z',
        })
      }),
    )

    renderStorefront(<StorefrontEnquiryForm />)

    await completeSteps(user)
    await user.type(screen.getByLabelText(/your name/i), 'Peter Chege')
    await user.type(screen.getByLabelText(/phone number/i), '0712 345 678')
    await user.click(screen.getByRole('button', { name: /send request/i }))

    // The confirmation quotes the server's reference.
    expect(await screen.findByText(/ENQ-7F3A2C4D/)).toBeInTheDocument()
    expect(screen.getByText(/has your request/i)).toBeInTheDocument()

    expect(bodies).toHaveLength(1)
    expect(bodies[0]).toMatchObject({
      topic: 'services',
      name: 'Peter Chege',
      phoneNumber: '254712345678',
    })
    expect((bodies[0] as { answers: string[] }).answers).toEqual([
      'Ask about our services',
      'Prices',
      'Call me',
    ])
  })

  it('refuses a number the studio could not reply to, without calling the API', async () => {
    const user = userEvent.setup()
    const onSend = vi.fn(() => ok({ reference: 'X', businessName: 'Y', receivedAt: 'now' }))
    server.use(http.post('*/api/v1/businesses/:businessId/enquiries', onSend))

    renderStorefront(<StorefrontEnquiryForm />)

    await completeSteps(user)
    await user.type(screen.getByLabelText(/your name/i), 'Peter Chege')
    await user.type(screen.getByLabelText(/phone number/i), '0123')
    await user.click(screen.getByRole('button', { name: /send request/i }))

    expect(await screen.findByText(/use a kenyan number/i)).toBeInTheDocument()
    expect(onSend).not.toHaveBeenCalled()
    // The visitor's answers are preserved so they do not start again.
    expect(screen.getByText(/step 4 of 4/i)).toBeInTheDocument()
  })

  it('surfaces the server’s message and keeps the answers when sending fails', async () => {
    const user = userEvent.setup()
    server.use(
      http.post('*/api/v1/businesses/:businessId/enquiries', () =>
        fail('ENQUIRY_FAILED', 'We could not record that request.', 500),
      ),
    )

    renderStorefront(<StorefrontEnquiryForm />)

    await completeSteps(user)
    await user.type(screen.getByLabelText(/your name/i), 'Peter Chege')
    await user.type(screen.getByLabelText(/phone number/i), '0712345678')
    await user.click(screen.getByRole('button', { name: /send request/i }))

    // The server's own message is shown, not a fabricated success.
    expect(await screen.findByText(/we could not record that request/i)).toBeInTheDocument()
    expect(screen.queryByText(/has your request/i)).not.toBeInTheDocument()
    // The visitor's answers survive the failure.
    expect(screen.getByText(/step 4 of 4/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/your name/i)).toHaveValue('Peter Chege')
  })
})
