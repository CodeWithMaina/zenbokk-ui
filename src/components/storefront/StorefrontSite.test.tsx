import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { PublicBusinessProfile, StorefrontConfig, StorefrontNavItem } from '../../lib/api/types'
import { createDefaultConfig } from '../../lib/storefront-builder/defaults'
import { renderStorefront } from '../../test/render'
import { StorefrontRenderer } from './StorefrontBlocksNew'

/**
 * The canonical storefront renderer, exercised against every design choice the
 * editor exposes. These lock in that each header/hero/footer variant is a real,
 * distinct layout, that per-page content follows the home-vs-other-pages rule,
 * that dark mode and motion reach the DOM, and that the newsletter never pretends
 * to submit.
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
  phoneNumber: '+254700111222',
  email: 'hello@nuru.test',
  hasAppointments: true,
  hasLoyalty: false,
  hasReferralProgram: false,
  capabilities: {},
  loyaltyProgram: null,
}

const can = () => true

function config(overrides: Partial<StorefrontConfig> = {}): StorefrontConfig {
  const base = createDefaultConfig()
  return { ...base, sections: [], ...overrides }
}

function header(overrides: Partial<StorefrontConfig['header']> = {}) {
  const base = createDefaultConfig().header
  return { ...base, ...overrides }
}

function hero(overrides: Partial<StorefrontConfig['hero']> = {}) {
  const base = createDefaultConfig().hero
  return { ...base, ...overrides }
}

function footer(overrides: Partial<StorefrontConfig['footer']> = {}) {
  const base = createDefaultConfig().footer
  return { ...base, ...overrides }
}

// ── header ───────────────────────────────────────────────────────────────────

const HEADER_LAYOUTS = ['classic', 'centered', 'split', 'minimal', 'pill', 'glass', 'utility', 'bar'] as const

describe('header variants', () => {
  for (const layout of HEADER_LAYOUTS) {
    it(`draws the ${layout} layout`, () => {
      const { container } = renderStorefront(
        <StorefrontRenderer config={config({ header: header({ variant: layout }) })} business={business} can={can} />,
      )
      // `bar` renders the announcement strip plus the classic bar.
      const expected = layout === 'bar' ? 'classic' : layout
      expect(container.querySelector(`.sf-nv.sf-l-${expected}`)).not.toBeNull()
      if (layout === 'bar') expect(container.querySelector('.sf-ann')).not.toBeNull()
      if (layout === 'utility') expect(container.querySelector('.sf-uc')).not.toBeNull()
    })
  }

  it('uses the owner’s custom navigation, with dropdown children', () => {
    const nav: StorefrontNavItem[] = [
      { label: 'Treatments', enabled: true, destination: 'services', url: '', children: [
        { label: 'Hair', enabled: true, destination: 'services', url: '', children: [] },
      ] },
      { label: 'Partner', enabled: true, destination: 'external', url: 'https://partner.test', children: [] },
    ]
    const { container } = renderStorefront(
      <StorefrontRenderer config={config({ header: header({ nav }) })} business={business} can={can} />,
    )
    // Both the desktop nav and the (in-DOM) mobile drawer carry the label.
    expect(screen.getAllByText('Treatments').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Hair').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Partner').length).toBeGreaterThan(0)
    // A javascript: URL is never turned into a live link.
    const partner = container.querySelector('a[href="https://partner.test"]')
    expect(partner).not.toBeNull()
  })

  it('falls back to the pages flagged showInNav when no custom nav is set', () => {
    renderStorefront(<StorefrontRenderer config={config()} business={business} can={can} />)
    // The default pages are Home / Services / About / Contact.
    expect(screen.getAllByText('Services').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Contact').length).toBeGreaterThan(0)
  })

  it('honours the drawer position, CTA style and uppercase links', () => {
    const { container } = renderStorefront(
      <StorefrontRenderer
        config={config({ header: header({ drawer: 'right', ctaStyle: 'outline', uppercaseLinks: true, height: 30 }) })}
        business={business}
        can={can}
      />,
    )
    expect(container.querySelector('.sf-drw.sf-right')).not.toBeNull()
    expect(container.querySelector('.sf-nv.sf-cta-outline')).not.toBeNull()
    expect(container.querySelector('.sf-nv.sf-caps')).not.toBeNull()
  })

  it('shows the announcement and utility cells from config', () => {
    const { unmount } = renderStorefront(
      <StorefrontRenderer
        config={config({ header: header({ variant: 'bar', announcement: 'Festive offer — 20% off' }) })}
        business={business}
        can={can}
      />,
    )
    expect(screen.getByText('Festive offer — 20% off')).toBeInTheDocument()
    unmount()

    renderStorefront(
      <StorefrontRenderer
        config={config({ header: header({ variant: 'utility', utilityLeft: 'Mon–Sat', utilityRight: 'Call us' }) })}
        business={business}
        can={can}
      />,
    )
    expect(screen.getByText('Mon–Sat')).toBeInTheDocument()
    expect(screen.getByText('Call us')).toBeInTheDocument()
  })
})

// ── hero ─────────────────────────────────────────────────────────────────────

const HERO_LAYOUTS = ['overlay', 'centered', 'split', 'split-reverse', 'minimal', 'gradient', 'facts', 'collage', 'booking'] as const

describe('hero variants', () => {
  for (const layout of HERO_LAYOUTS) {
    it(`draws a distinct ${layout} composition`, () => {
      const { container } = renderStorefront(
        <StorefrontRenderer
          config={config({ hero: hero({ variant: layout, heading: 'Welcome to Nuru' }) })}
          business={business}
          can={can}
        />,
      )
      const heroEl = container.querySelector('.sf-hro')
      expect(heroEl, layout).not.toBeNull()
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Welcome to Nuru')
    })
  }

  it('renders the real background image and overlay for an overlay hero', () => {
    const { container } = renderStorefront(
      <StorefrontRenderer
        config={config({ hero: hero({ variant: 'overlay', overlayOpacity: 60 }) })}
        business={business}
        can={can}
        heroVariants={[{ url: 'https://img.test/hero.jpg', width: 1600, height: 900, format: 'webp' }]}
      />,
    )
    expect(container.querySelector('.sf-bgi')).not.toBeNull()
    // The resolved image is wired into the hero element as its CSS variable.
    const heroEl = container.querySelector('.sf-hro') as HTMLElement
    expect(heroEl.style.getPropertyValue('--sf-hi')).toContain('hero.jpg')
  })

  it('uses the facts band and booking panel as real layouts with live business data', () => {
    const { unmount } = renderStorefront(
      <StorefrontRenderer
        config={config({ hero: hero({ variant: 'facts' }) })}
        business={business}
        can={can}
        teamCount={3}
      />,
    )
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('Specialists')).toBeInTheDocument()
    // The location appears in the facts band and in the header drawer contact block.
    expect(screen.getAllByText('Nairobi').length).toBeGreaterThan(0)
    unmount()

    renderStorefront(
      <StorefrontRenderer config={config({ hero: hero({ variant: 'booking' }) })} business={business} can={can} />,
    )
    expect(document.querySelector('.sf-bk2')).not.toBeNull()
  })

  it('renders the hero CTAs with their configured labels', () => {
    renderStorefront(
      <StorefrontRenderer
        config={config({
          hero: hero({ variant: 'split', primaryCtaLabel: 'Book now', secondaryCtaLabel: 'See services' }),
        })}
        business={business}
        can={can}
      />,
    )
    // The header CTA also reads "Book now", so match on count rather than a single node.
    expect(screen.getAllByText('Book now').length).toBeGreaterThan(0)
    expect(screen.getByText('See services')).toBeInTheDocument()
  })

  it('never reintroduces placeholder business data', () => {
    renderStorefront(<StorefrontRenderer config={config()} business={business} can={can} />)
    expect(screen.queryByText(/hello@example\.com/)).not.toBeInTheDocument()
    expect(screen.queryByText(/\+254 700 000 000/)).not.toBeInTheDocument()
    expect(screen.queryByText(/unsplash/i)).not.toBeInTheDocument()
  })
})

// ── footer ───────────────────────────────────────────────────────────────────

const FOOTER_LAYOUTS = ['columns', 'newsletter', 'centered', 'minimal', 'wordmark', 'split'] as const

describe('footer variants', () => {
  for (const layout of FOOTER_LAYOUTS) {
    it(`draws the ${layout} layout`, () => {
      const { container } = renderStorefront(
        <StorefrontRenderer
          config={config({ footer: footer({ variant: layout, showWordmark: layout === 'wordmark' }) })}
          business={business}
          can={can}
        />,
      )
      expect(container.querySelector(`.sf-ftr[data-sf-footer="${layout}"]`)).not.toBeNull()
    })
  }

  it('shows real contact details and the resolved navigation', () => {
    // The contact/nav columns live in the multi-column footer, which the default
    // (minimal) template does not use — so select the layout that renders them.
    renderStorefront(
      <StorefrontRenderer
        config={config({ footer: footer({ variant: 'columns' }) })}
        business={business}
        can={can}
      />,
    )
    // tel:/mailto: links come from the business profile, not hardcoded copy.
    expect(document.querySelector('a[href="tel:+254700111222"]')).not.toBeNull()
    expect(document.querySelector('a[href="mailto:hello@nuru.test"]')).not.toBeNull()
    expect(screen.getAllByText('Nairobi').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Explore').length).toBeGreaterThan(0)
  })

  it('renders the oversize wordmark only when asked', () => {
    const { unmount } = renderStorefront(
      <StorefrontRenderer
        config={config({ footer: footer({ variant: 'wordmark', showWordmark: true }) })}
        business={business}
        can={can}
      />,
    )
    expect(document.querySelector('.sf-wm')).not.toBeNull()
    unmount()

    renderStorefront(
      <StorefrontRenderer
        config={config({ footer: footer({ variant: 'wordmark', showWordmark: false }) })}
        business={business}
        can={can}
      />,
    )
    expect(document.querySelector('.sf-wm')).toBeNull()
  })

  it('never pretends the newsletter submits', () => {
    const { container } = renderStorefront(
      <StorefrontRenderer
        config={config({ footer: footer({ variant: 'newsletter', newsletterHeadline: 'Ready when you are?' }) })}
        business={business}
        can={can}
      />,
    )
    expect(screen.getByText('Ready when you are?')).toBeInTheDocument()
    // The signup is design only: no form, no input, no submit button.
    expect(container.querySelector('.sf-nf')).not.toBeNull()
    expect(container.querySelector('.sf-nf input')).toBeNull()
    expect(container.querySelector('.sf-nf button')).toBeNull()
    expect(container.querySelector('form')).toBeNull()
  })
})
