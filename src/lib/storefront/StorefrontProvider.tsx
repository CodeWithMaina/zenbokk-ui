import { useEffect, useMemo } from 'react'
import type { ReactNode } from 'react'
import type { StorefrontBootstrap } from '../api/types'
import { hasCapability } from '../entitlements'
import { setActiveTenantSlug } from '../tenant/tenant-store'
import { StorefrontContext } from './storefront-context'
import type { StorefrontContextValue } from './storefront-context'

/**
 * Publishes the resolved tenant for a storefront subtree.
 *
 * The `$slug` layout only mounts this once bootstrap has succeeded, so children
 * can read the business unconditionally, and every later API call from the
 * subtree carries the canonical tenant header.
 */
export function StorefrontProvider({
  slug,
  bootstrap,
  children,
}: {
  slug: string
  bootstrap: StorefrontBootstrap
  children: ReactNode
}) {
  const canonicalSlug = bootstrap.slug || slug

  useEffect(() => {
    setActiveTenantSlug(canonicalSlug)
  }, [canonicalSlug])

  const value = useMemo<StorefrontContextValue>(
    () => ({
      slug,
      canonicalSlug,
      businessId: bootstrap.businessId,
      business: bootstrap.business,
      landingPage: bootstrap.landingPage,
      capabilities: bootstrap.business.capabilities ?? {},
      can: (key) => hasCapability(bootstrap.business.capabilities, key),
    }),
    [bootstrap, slug, canonicalSlug],
  )

  return <StorefrontContext value={value}>{children}</StorefrontContext>
}
