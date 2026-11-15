import { render, screen } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import { describe, expect, it } from 'vitest'
import type { StorefrontBootstrap } from '../../lib/api/types'
import { createDefaultConfig } from '../../lib/storefront-builder/defaults'
import { StorefrontProvider } from '../../lib/storefront/StorefrontProvider'
import { ThemeProvider } from '../../theme'
import { makeBootstrap, makeBusinessProfile, makeLandingPage } from '../../test/fixtures'
import { createTestQueryClient } from '../../test/render'
import { StorefrontFooter } from './StorefrontFooter'

/**
 * The minimal footer.
 *
 * It navigates with the router's `Link`, so the render needs a real (in-memory)
 * router whose tree contains the destinations it points at — and, because the
 * router mounts on a tick, each test waits for the frame to appear.
 */
function renderFooter(bootstrap: StorefrontBootstrap = makeBootstrap()) {
  const rootRoute = createRootRoute({ component: () => <StorefrontFooter /> })
  const router = createRouter({
    routeTree: rootRoute.addChildren([
      createRoute({ getParentRoute: () => rootRoute, path: '/privacy' }),
      createRoute({ getParentRoute: () => rootRoute, path: '/terms' }),
      createRoute({ getParentRoute: () => rootRoute, path: '/legal' }),
    ]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })

  return render(
    <ThemeProvider>
      <QueryClientProvider client={createTestQueryClient()}>
        <StorefrontProvider slug={bootstrap.slug} bootstrap={bootstrap}>
          <RouterProvider router={router} />
        </StorefrontProvider>
      </QueryClientProvider>
    </ThemeProvider>,
  )
}

function bootstrapWith(
  socials: { platform: string; url: string }[],
  phoneNumber: string | null,
): StorefrontBootstrap {
  const config = createDefaultConfig()
  return makeBootstrap({
    business: makeBusinessProfile({ phoneNumber }),
    landingPage: makeLandingPage({
      storefront: {
        ...config,
        isPublished: true,
        publishedAt: null,
        heroBackgroundVariants: [],
        heroCarouselVariants: [],
        themeBackgroundVariants: [],
        headerLogoVariants: [],
        footerLogoVariants: [],
        ogImageVariants: [],
        faviconVariants: [],
        footer: { ...config.footer, socials },
      },
    }),
  })
}

describe('StorefrontFooter', () => {
  it('shows the year, the platform credit and the legal links', async () => {
    renderFooter()

    expect(
      await screen.findByText(new RegExp(`© ${new Date().getFullYear()} Nuru Studio`)),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Zenbokk' })).toHaveAttribute(
      'href',
      'http://zenbokk.com/',
    )
    expect(screen.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute(
      'href',
      '/privacy',
    )
    expect(screen.getByRole('link', { name: 'Terms of Service' })).toHaveAttribute(
      'href',
      '/terms',
    )
    expect(screen.getByRole('link', { name: 'Legal' })).toHaveAttribute('href', '/legal')
  })

  it('renders only the networks that have a configured URL', async () => {
    renderFooter(
      bootstrapWith(
        [
          { platform: 'Instagram', url: 'https://instagram.com/aurelia' },
          { platform: 'TikTok', url: 'https://tiktok.com/@aurelia' },
        ],
        null,
      ),
    )

    const instagram = await screen.findByRole('link', { name: 'Instagram' })
    expect(instagram).toHaveAttribute('href', 'https://instagram.com/aurelia')
    expect(instagram).toHaveAttribute('target', '_blank')
    expect(instagram).toHaveAttribute('rel', 'noopener noreferrer')
    expect(screen.getByRole('link', { name: 'TikTok' })).toBeInTheDocument()
    // Facebook and WhatsApp are not configured, so they never appear.
    expect(screen.queryByRole('link', { name: 'Facebook' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'WhatsApp' })).not.toBeInTheDocument()
  })

  it('builds WhatsApp from the business phone number', async () => {
    renderFooter(bootstrapWith([], '+254 712 440 001'))

    expect(await screen.findByRole('link', { name: 'WhatsApp' })).toHaveAttribute(
      'href',
      'https://wa.me/254712440001',
    )
  })

  it('hides the social row entirely when there is nothing to link to', async () => {
    renderFooter(bootstrapWith([], null))

    await screen.findByRole('link', { name: 'Privacy Policy' })
    expect(screen.queryByRole('link', { name: 'Instagram' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'WhatsApp' })).not.toBeInTheDocument()
  })
})
