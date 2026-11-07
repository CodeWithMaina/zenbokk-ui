import { render, screen, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import { http } from 'msw'
import { describe, expect, it } from 'vitest'
import type { DashboardContextValue } from '../../lib/dashboard/dashboard-context'
import { DashboardContext } from '../../lib/dashboard/dashboard-context'
import { MODULE } from '../../lib/entitlements'
import { createDefaultConfig } from '../../lib/storefront-builder'
import { ThemeProvider } from '../../theme'
import { makeDashboardContext } from '../../test/appointments'
import { TEST_BUSINESS_ID } from '../../test/fixtures'
import { fail, ok } from '../../test/handlers'
import { createTestQueryClient } from '../../test/render'
import { server } from '../../test/server'
import { StorefrontStatusCard } from './StorefrontStatusCard'

/**
 * The storefront card on the dashboard home.
 *
 * It is the dashboard's only view of whether the public page is live, so each
 * publication state is asserted against the real builder payload — and the module
 * being switched off must not quietly show a stale status.
 */

const BUILDER = '*/api/v1/storefront/builder'

function builderState(overrides: Record<string, unknown> = {}) {
  const config = createDefaultConfig()
  return {
    businessId: TEST_BUSINESS_ID,
    templateId: 'classic',
    isPublished: true,
    publishedAt: '2026-11-05T09:00:00.000Z',
    updatedAt: '2026-11-06T09:00:00.000Z',
    hasDraft: true,
    hasUnpublishedChanges: false,
    draft: config,
    published: config,
    draftVersion: 7,
    latestRevisionNumber: 7,
    ...overrides,
  }
}

/**
 * The card navigates with the router's `Link`, so the render needs a real (in
 * memory) router whose tree contains the destinations it points at.
 */
function renderCard(context: DashboardContextValue) {
  const rootRoute = createRootRoute({ component: () => <StorefrontStatusCard /> })
  const routes = [
    createRoute({ getParentRoute: () => rootRoute, path: '/' }),
    createRoute({ getParentRoute: () => rootRoute, path: '/$slug' }),
    createRoute({ getParentRoute: () => rootRoute, path: '/dashboard/storefront/builder' }),
    createRoute({ getParentRoute: () => rootRoute, path: '/dashboard/storefront/templates' }),
    createRoute({ getParentRoute: () => rootRoute, path: '/dashboard/settings' }),
  ]
  const router = createRouter({
    routeTree: rootRoute.addChildren(routes),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })

  return render(
    <ThemeProvider>
      <QueryClientProvider client={createTestQueryClient()}>
        <DashboardContext value={context}>
          <RouterProvider router={router} />
        </DashboardContext>
      </QueryClientProvider>
    </ThemeProvider>,
  )
}

function storefrontContext(overrides: Partial<DashboardContextValue> = {}) {
  return makeDashboardContext({
    entitlements: [MODULE.storefront],
    hasModule: (key: string) => key === MODULE.storefront,
    ...overrides,
  })
}

describe('StorefrontStatusCard', () => {
  it('shows the live status, the address and how many versions are stored', async () => {
    server.use(http.get(BUILDER, () => ok(builderState())))

    renderCard(storefrontContext())

    expect(await screen.findByText('Live')).toBeInTheDocument()
    expect(screen.getByText('Your published page is up to date.')).toBeInTheDocument()
    expect(screen.getByText('Saved versions')).toBeInTheDocument()
    expect(screen.getByText('7')).toBeInTheDocument()
    expect(screen.getByTitle(/aurelia-luxe/)).toBeInTheDocument()
    // The date is rendered from the server value, never invented.
    expect(screen.queryByText('Never')).not.toBeInTheDocument()
  })

  it('warns when saved changes are not live yet', async () => {
    server.use(http.get(BUILDER, () => ok(builderState({ hasUnpublishedChanges: true }))))

    renderCard(storefrontContext())

    expect(await screen.findByText('Draft changes')).toBeInTheDocument()
    expect(
      screen.getByText('You have saved changes that are not on the live page yet.'),
    ).toBeInTheDocument()
  })

  it('says so when the page has never been published', async () => {
    server.use(
      http.get(BUILDER, () => ok(builderState({ isPublished: false, publishedAt: null }))),
    )

    renderCard(storefrontContext())

    expect(await screen.findByText('Not published')).toBeInTheDocument()
    expect(screen.getByText('Never')).toBeInTheDocument()
    // Nothing to open while the page is offline.
    expect(screen.queryByRole('link', { name: /Live page/ })).not.toBeInTheDocument()
  })

  it('offers the module upgrade instead of a status when the module is off', async () => {
    let reads = 0
    server.use(
      http.get(BUILDER, () => {
        reads += 1
        return ok(builderState())
      }),
    )

    renderCard(
      makeDashboardContext({
        entitlements: [],
        hasModule: () => false,
      }),
    )

    expect(await screen.findByText(/storefront isn’t in this plan/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Review modules' })).toBeInTheDocument()
    expect(screen.queryByText('Live')).not.toBeInTheDocument()
    // A business without the module must not trigger a status read at all.
    expect(reads).toBe(0)
    await waitFor(() => expect(screen.queryByText('Saved versions')).not.toBeInTheDocument())
  })

  it('explains a failed status read instead of showing an empty page', async () => {
    server.use(http.get(BUILDER, () => fail('LOAD_FAILED', 'boom', 500)))

    renderCard(storefrontContext())

    expect(
      await screen.findByText('Your storefront status could not be loaded. Open the editor to check it.'),
    ).toBeInTheDocument()
  })
})
