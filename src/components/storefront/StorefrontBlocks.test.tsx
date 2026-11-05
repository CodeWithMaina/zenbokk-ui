import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { PublicBusinessProfile, StorefrontConfig, StorefrontSection } from '../../lib/api/types'
import type { CapabilityKey } from '../../lib/entitlements'
import { createDefaultConfig, makeSection } from '../../lib/storefront-builder/defaults'
import { renderStorefront } from '../../test/render'
import { StorefrontRenderer } from './StorefrontBlocks'

/**
 * The schema-driven public renderer.
 *
 * These assertions guard the promise the builder makes to the owner: what they
 * configure is what a visitor sees — and nothing a disabled module or a hidden
 * section would otherwise leak.
 */

const business: PublicBusinessProfile = {
  id: 'b1',
  slug: 'nuru-studio',
  name: 'Nuru Studio',
  category: 'Salon',
  location: 'Nairobi',
  description: 'A calm studio for hair and skin.',
  logoUrl: null,
  logoMediaId: null,
  logoVariants: [],
  coverMediaId: null,
  galleryMediaIds: [],
  phoneNumber: null,
  email: null,
  hasAppointments: true,
  hasLoyalty: false,
  hasReferralProgram: false,
  capabilities: {},
  loyaltyProgram: null,
}

function configWith(sections: StorefrontSection[], overrides: Partial<StorefrontConfig> = {}): StorefrontConfig {
  const base = createDefaultConfig()
  return { ...base, sections, ...overrides }
}

const allCaps = () => true

describe('StorefrontRenderer', () => {
  it('renders the hero and the owner-configured sections', () => {
    const stats = makeSection('stats')
    stats.settings = { items: '12 | Years\n4.9 | Rating' }
    const faq = makeSection('faq')
    faq.settings = { items: 'Do you take walk-ins? | Yes, subject to availability.' }

    const config = configWith([stats, faq], {
      hero: { ...createDefaultConfig().hero, heading: 'Welcome to Nuru' },
    })

    renderStorefront(<StorefrontRenderer config={config} business={business} can={allCaps} />)

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Welcome to Nuru')
    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getByText('Years')).toBeInTheDocument()
    expect(screen.getByText('Do you take walk-ins?')).toBeInTheDocument()
  })

  it('does not render a hidden section', () => {
    const hidden = makeSection('announcement')
    hidden.enabled = false
    hidden.settings = { message: 'Should not appear' }

    renderStorefront(
      <StorefrontRenderer config={configWith([hidden])} business={business} can={allCaps} />,
    )

    expect(screen.queryByText('Should not appear')).not.toBeInTheDocument()
  })

  it('never renders a section whose module the business is not entitled to', () => {
    const services = makeSection('services')
    services.title = 'Our services'
    const config = configWith([services])
    const noServices = (capability: CapabilityKey) => capability !== 'services'

    renderStorefront(<StorefrontRenderer config={config} business={business} can={noServices} />)

    expect(screen.queryByText('Our services')).not.toBeInTheDocument()
  })

  it('applies the owner’s design tokens as CSS variables', () => {
    const config = configWith([], { theme: { ...createDefaultConfig().theme, primary: '#123456' } })
    const { container } = renderStorefront(
      <StorefrontRenderer config={config} business={business} can={allCaps} />,
    )

    const root = container.querySelector('.sf-root') as HTMLElement
    expect(root).not.toBeNull()
    expect(root.style.getPropertyValue('--sf-primary')).toBe('#123456')
  })

  it('marks sections with their key and variant so the editor can address them', () => {
    const gallery = makeSection('gallery', 'masonry')
    const { container } = renderStorefront(
      <StorefrontRenderer config={configWith([gallery])} business={business} can={allCaps} />,
    )

    const node = container.querySelector('[data-sf-section="gallery"]')
    expect(node?.getAttribute('data-sf-variant')).toBe('masonry')
  })
})
