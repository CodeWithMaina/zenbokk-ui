import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { StorefrontBootstrap } from '../../../lib/api/types'
import { makeBootstrap, makeBusinessProfile, makeLandingPage } from '../../../test/fixtures'
import { renderStorefront } from '../../../test/render'
import { AboutPage } from './AboutPage'

/**
 * About page.
 *
 * The identity row, card and rules are all the business's own data; the page
 * carries no contact details. Services and the currency come from the default
 * MSW handlers (a "Haircuts" catalogue and a KES business).
 */
function bootstrap(overrides: { appointments?: boolean; ctaEnabled?: boolean } = {}) {
  const appointments = overrides.appointments ?? true
  return makeBootstrap({
    business: makeBusinessProfile({
      name: 'Aurelia Luxe Hair Atelier',
      category: 'Hair & Beauty Salon',
      location: 'Westlands, Nairobi',
      description: 'A premium hair atelier offering styling, braiding and treatments.',
      phoneNumber: '+254712345678',
      email: 'hello@aurelia.example',
      capabilities: { services: true, appointments, galleryReviews: false },
    }),
    landingPage: makeLandingPage({
      heroTagline: 'Premium hair rituals in the heart of Westlands',
      primaryCta: {
        enabled: overrides.ctaEnabled ?? true,
        type: 'book',
        label: 'Book your appointment',
      },
      sections: [
        {
          key: 'about',
          order: 0,
          title: 'About us',
          description:
            'A 30% deposit secures bridal and braiding appointments. Arrive 10 minutes early so we can settle you in.',
        },
        {
          key: 'booking',
          order: 1,
          title: 'Book',
          description: 'Cancel or reschedule with 24 hours notice and keep your deposit.',
        },
      ],
    }),
  })
}

function render(page: StorefrontBootstrap = bootstrap()) {
  return renderStorefront(<AboutPage />, { bootstrap: page })
}

describe('AboutPage', () => {
  it('renders the identity row, card and rules from the business’s own data', async () => {
    render()

    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(
      'Premium hair rituals in the heart of Westlands',
    )
    expect(screen.getByText('Westlands, Nairobi')).toBeInTheDocument()
    expect(
      screen.getByText('A premium hair atelier offering styling, braiding and treatments.'),
    ).toBeInTheDocument()
    // Service tag from the catalogue, and the KES price note.
    expect(screen.getByText('Haircuts')).toBeInTheDocument()
    expect(screen.getByText('Prices in KES')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Book your appointment' })).toHaveAttribute(
      'href',
      expect.stringContaining('/book'),
    )

    expect(
      screen.getByRole('heading', { level: 2, name: 'How we keep your time' }),
    ).toBeInTheDocument()
    expect(screen.getByText('30% deposit')).toBeInTheDocument()
    expect(screen.getByText('Arrive 10 minutes early')).toBeInTheDocument()
    expect(screen.getByText(/24 hours. notice/)).toBeInTheDocument()
  })

  it('no longer shows the business name, category or monogram', async () => {
    render()
    await screen.findByRole('heading', { level: 1 })

    expect(screen.queryByText('Aurelia Luxe Hair Atelier')).not.toBeInTheDocument()
    expect(screen.queryByText('Hair & Beauty Salon')).not.toBeInTheDocument()
    expect(document.querySelector('.ab-mark')).toBeNull()
    // The location pill is the one identity detail kept.
    expect(screen.getByText('Westlands, Nairobi')).toBeInTheDocument()
  })

  it('carries no contact details', async () => {
    render()
    await screen.findByRole('heading', { level: 1 })

    expect(screen.queryByText('+254712345678')).not.toBeInTheDocument()
    expect(screen.queryByText('hello@aurelia.example')).not.toBeInTheDocument()
    expect(document.querySelector('a[href^="tel:"]')).toBeNull()
    expect(document.querySelector('a[href^="mailto:"]')).toBeNull()
    expect(screen.queryByText(/opening hours/i)).not.toBeInTheDocument()
  })

  it('hides the booking action when the business takes no bookings', async () => {
    render(bootstrap({ appointments: false, ctaEnabled: false }))
    await screen.findByRole('heading', { level: 1 })

    expect(screen.queryByRole('link', { name: /book your appointment/i })).not.toBeInTheDocument()
    // The price note is independent of the action.
    expect(screen.getByText('Prices in KES')).toBeInTheDocument()
  })

  it('drops the description and the rules panel when the business has neither', async () => {
    render(
      makeBootstrap({
        business: makeBusinessProfile({ description: null }),
        landingPage: makeLandingPage({
          heroTagline: '',
          sections: [],
        }),
      }),
    )
    // The title falls back to the business name; nothing is left as an empty box.
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Nuru Studio')
    expect(screen.queryByRole('heading', { level: 2, name: /how we keep/i })).not.toBeInTheDocument()
    expect(screen.queryByText(/premium hair atelier/i)).not.toBeInTheDocument()
  })
})
