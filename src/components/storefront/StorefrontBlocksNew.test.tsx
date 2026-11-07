import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { PublicBusinessProfile, StorefrontConfig, StorefrontSection } from '../../lib/api/types'
import { createDefaultConfig, makeSection } from '../../lib/storefront-builder/defaults'
import { renderStorefront } from '../../test/render'
import { StorefrontRenderer } from './StorefrontBlocksNew'

/**
 * The canonical renderer used by BOTH the public storefront home and the builder
 * preview (navigation + hero + owner sections + footer).
 *
 * These assertions exist because the renderer previously dropped `config.sections`
 * entirely, so everything an owner built in the editor was invisible on the live
 * site and in the preview. They lock in that the composed renderer shows the
 * owner-configured sections and that the builder preview can address them.
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

const allCaps = () => true

function configWith(sections: StorefrontSection[], overrides: Partial<StorefrontConfig> = {}): StorefrontConfig {
  return { ...createDefaultConfig(), sections, ...overrides }
}

describe('StorefrontRenderer (public storefront + builder preview)', () => {
  it('renders the owner-configured sections alongside the hero', () => {
    const stats = makeSection('stats')
    stats.settings = { items: '12 | Years\n4.9 | Rating' }

    const config = configWith([stats], {
      hero: { ...createDefaultConfig().hero, heading: 'Welcome to Nuru' },
    })

    renderStorefront(<StorefrontRenderer config={config} business={business} can={allCaps} />)

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Welcome to Nuru')
    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getByText('Years')).toBeInTheDocument()
  })

  it('drops a section the owner has hidden', () => {
    const hidden = makeSection('announcement')
    hidden.enabled = false
    hidden.settings = { message: 'Should not appear' }

    renderStorefront(<StorefrontRenderer config={configWith([hidden])} business={business} can={allCaps} />)

    expect(screen.queryByText('Should not appear')).not.toBeInTheDocument()
  })

  it('makes each section selectable so the preview can address it', async () => {
    const stats = makeSection('stats')
    stats.settings = { items: '12 | Years' }
    const onSelectSection = vi.fn()

    renderStorefront(
      <StorefrontRenderer
        config={configWith([stats])}
        business={business}
        can={allCaps}
        onSelectSection={onSelectSection}
      />,
    )

    await userEvent.click(screen.getByText('12'))

    expect(onSelectSection).toHaveBeenCalledWith(stats.id)
  })
})
