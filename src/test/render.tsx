import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import type { RenderOptions, RenderResult } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import type { StorefrontBootstrap } from '../lib/api/types'
import { DashboardContext } from '../lib/dashboard/dashboard-context'
import type { DashboardContextValue } from '../lib/dashboard/dashboard-context'
import { StorefrontProvider } from '../lib/storefront/StorefrontProvider'
import { ThemeProvider } from '../theme'
import { makeBootstrap } from './fixtures'
import { makeDashboardContext } from './appointments'

/**
 * Rendering utilities.
 *
 * A storefront component is never rendered bare: it reads the resolved tenant
 * from context, its data from React Query and (sometimes) its theme from the
 * provider. `renderStorefront` mounts the same provider stack the app does, in
 * the same order, so a test asserts the component's real behaviour rather than
 * a simplified arrangement.
 *
 * Retries are off and the cache is per-render, so a failure surfaces as a
 * failure instead of being retried, and no data leaks between tests.
 */

export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0, refetchOnWindowFocus: false },
      mutations: { retry: false },
    },
  })
}

export type StorefrontRenderOptions = Omit<RenderOptions, 'wrapper'> & {
  /** The resolved tenant. Override to change capabilities or the business. */
  bootstrap?: StorefrontBootstrap
  /** Share a client when a test must inspect or prime the cache. */
  queryClient?: QueryClient
}

export function renderStorefront(
  ui: ReactElement,
  options: StorefrontRenderOptions = {},
): RenderResult & { queryClient: QueryClient } {
  const { bootstrap = makeBootstrap(), queryClient = createTestQueryClient(), ...rest } = options

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <StorefrontProvider slug={bootstrap.slug} bootstrap={bootstrap}>
            {children}
          </StorefrontProvider>
        </QueryClientProvider>
      </ThemeProvider>
    )
  }

  return { ...render(ui, { wrapper: Wrapper, ...rest }), queryClient }
}

export type DashboardRenderOptions = Omit<RenderOptions, 'wrapper'> & {
  /** The resolved business console: entitlements, permissions, business, plan. */
  context?: DashboardContextValue
  /** Share a client when a test must inspect or prime the cache. */
  queryClient?: QueryClient
}

/**
 * Mount a business-console screen with the same providers the dashboard shell
 * supplies. Pages read module access and permissions from the context rather
 * than deciding for themselves, so a test must supply it too — otherwise it
 * would be asserting behaviour the app never produces.
 */
export function renderDashboard(
  ui: ReactElement,
  options: DashboardRenderOptions = {},
): RenderResult & { queryClient: QueryClient } {
  const {
    context = makeDashboardContext(),
    queryClient = createTestQueryClient(),
    ...rest
  } = options

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <DashboardContext value={context}>{children}</DashboardContext>
        </QueryClientProvider>
      </ThemeProvider>
    )
  }

  return { ...render(ui, { wrapper: Wrapper, ...rest }), queryClient }
}
