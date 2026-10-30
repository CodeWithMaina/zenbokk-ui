import { useQueryClient } from '@tanstack/react-query'
import { Link, Navigate } from '@tanstack/react-router'
import { Compass, RotateCcw, Store } from 'lucide-react'
import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { StorefrontChrome } from '../../components/shell/StorefrontChrome'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { Skeleton } from '../../components/ui/skeleton'
import { ApiError } from '../api/client'
import { resolveSurface, tenantUrl } from '../tenant/host'
import { StorefrontProvider } from './StorefrontProvider'
import { useStorefrontBootstrap } from './use-storefront-bootstrap'

/**
 * Resolves the tenant for a storefront subtree and renders the business's
 * chrome around it.
 *
 * Two address shapes reach the same component:
 *  - `nuru-studio.zenbokk.com/…` — the slug comes from the hostname; a renamed
 *    business is redirected to its canonical host.
 *  - `zenbokk.com/nuru-studio/…` — the path-based fallback used from the
 *    marketing site and in local development without wildcard DNS; a renamed
 *    business is redirected within the SPA.
 *
 * Nothing renders until the backend has confirmed the business exists and is
 * active, so an unknown or suspended address never flashes another tenant's
 * page. The resolved business id is part of every downstream query key, so
 * switching tenants cannot reuse one business's cached data for another.
 */
export function StorefrontGate({ slug, children }: { slug: string; children: ReactNode }) {
  const bootstrap = useStorefrontBootstrap(slug)
  const queryClient = useQueryClient()

  const canonical = bootstrap.data?.slug ?? null
  const businessId = bootstrap.data?.businessId ?? null

  // Tenant switch: drop customer-scoped caches that were fetched for the
  // previous business before the new subtree renders.
  useEffect(() => {
    if (!businessId) return
    void queryClient.invalidateQueries({ queryKey: ['appointments', 'customer'] })
  }, [businessId, queryClient])

  if (bootstrap.isPending) return <StorefrontLoading />

  if (bootstrap.isError) {
    return (
      <StorefrontUnavailable
        slug={slug}
        error={bootstrap.error}
        onRetry={() => void bootstrap.refetch()}
      />
    )
  }

  const data = bootstrap.data

  if (data.moved && data.slug && data.slug !== slug) {
    if (resolveSurface().kind === 'tenant') {
      // Renamed address: keep the visitor on the same path under the canonical
      // host instead of rendering a path-shaped URL inside a host-shaped one.
      const path =
        typeof window === 'undefined'
          ? '/'
          : `${window.location.pathname}${window.location.search}`
      if (typeof window !== 'undefined') window.location.replace(tenantUrl(data.slug, path))
      return <StorefrontLoading />
    }
    return <Navigate to="/$slug" params={{ slug: data.slug }} replace />
  }

  return (
    <StorefrontProvider slug={slug} bootstrap={data}>
      <StorefrontChrome>{children}</StorefrontChrome>
    </StorefrontProvider>
  )
}

function Shell({ children }: { children: ReactNode }) {
  return <div className="grid min-h-svh place-items-center bg-bg px-5 py-12">{children}</div>
}

function StorefrontLoading() {
  return (
    <Shell>
      <div className="w-full max-w-[52rem] space-y-[1.1rem]" aria-busy="true" aria-live="polite">
        <span className="sr-only">Loading this business’s page…</span>
        <Skeleton className="h-[3rem] w-[40%]" />
        <Skeleton className="h-[12rem] rounded-card" />
        <div className="grid gap-[0.8rem] sm:grid-cols-3">
          <Skeleton className="h-[8rem] rounded-card" />
          <Skeleton className="h-[8rem] rounded-card" />
          <Skeleton className="h-[8rem] rounded-card" />
        </div>
      </div>
    </Shell>
  )
}

function StorefrontUnavailable({
  slug,
  error,
  onRetry,
}: {
  slug: string
  error: unknown
  onRetry: () => void
}) {
  const notFound = error instanceof ApiError && (error.isNotFound || error.status === 400)
  const suspended =
    error instanceof ApiError &&
    (error.code === 'BUSINESS_INACTIVE' || error.code === 'BUSINESS_SUSPENDED')
  const message = notFound
    ? `Nothing answers to “${slug}” right now. Check the address you were given.`
    : suspended
      ? 'This business has paused its page. Its bookings are handled directly in the meantime.'
      : error instanceof ApiError
        ? error.message
        : 'We couldn’t load this business’s page.'

  return (
    <Shell>
      <Card className="w-full max-w-[32rem] p-[clamp(1.2rem,4vw,1.9rem)]">
        <span className="grid size-[2.6rem] place-items-center rounded-full bg-accent-soft text-accent-ink">
          <Store className="size-[1.2rem]" aria-hidden="true" />
        </span>
        <p className="eyebrow mt-[0.9rem]">{notFound ? 'No such address' : 'Page unavailable'}</p>
        <h1 className="display mt-[0.35rem] text-title">
          {notFound ? 'We can’t find that business' : 'This page is taking a break'}
        </h1>
        <p className="mt-[0.5rem] text-meta text-muted">{message}</p>
        <div className="mt-[1.3rem] flex flex-wrap gap-[0.5rem]">
          {!notFound ? (
            <Button variant="primary" onClick={onRetry}>
              <RotateCcw className="size-4" aria-hidden="true" />
              Try again
            </Button>
          ) : null}
          <Link to="/" className="btn btn-ghost no-underline">
            <Compass className="size-4" aria-hidden="true" />
            Go to Zenbokk
          </Link>
        </div>
      </Card>
    </Shell>
  )
}
