import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ContactPage } from './ContactPage'
import { makeBootstrap, makeBusinessProfile } from '../../../test/fixtures'
import { renderStorefront } from '../../../test/render'

/**
 * Contact redesign.
 *
 * Every detail the business published becomes exactly one real action — a
 * `tel:` link rings the number, a `mailto:` link opens a draft, an address opens
 * the visitor's maps app — and a detail the business never gave is simply absent.
 */
describe('ContactPage', () => {
  it('turns each published detail into its own working action', async () => {
    renderStorefront(<ContactPage />)

    const call = await screen.findByRole('link', { name: /call now/i })
    expect(call).toHaveAttribute('href', 'tel:+254712345678')

    const email = screen.getByRole('link', { name: /send email/i })
    expect(email).toHaveAttribute('href', 'mailto:hello@nurustudio.example')

    const directions = screen.getByRole('link', { name: /get directions/i })
    expect(directions.getAttribute('href')).toContain('google.com/maps')
    expect(directions).toHaveAttribute('target', '_blank')
    expect(directions).toHaveAttribute('rel', 'noreferrer noopener')
  })

  it('omits a channel the business has not published', async () => {
    renderStorefront(<ContactPage />, {
      bootstrap: makeBootstrap({ business: makeBusinessProfile({ phoneNumber: null }) }),
    })

    expect(await screen.findByRole('link', { name: /send email/i })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /call now/i })).not.toBeInTheDocument()
  })
})
