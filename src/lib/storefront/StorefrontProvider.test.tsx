import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useStorefront } from './use-storefront'
import { getActiveTenantSlug } from '../tenant/tenant-store'
import { makeBootstrap } from '../../test/fixtures'
import { renderStorefront } from '../../test/render'

/**
 * Tenant switching.
 *
 * Every request made from a storefront subtree carries the resolved business as
 * the tenant header, so the value has to be published by the provider and has to
 * change when the visitor moves to a different business. The second assertion is
 * the one that matters: a stale slug would let one business's page query another
 * business's data.
 */
function Probe() {
  const { businessId, canonicalSlug, can } = useStorefront()
  return (
    <p>
      {businessId} · {canonicalSlug} · appointments {String(can('appointments'))}
    </p>
  )
}

describe('StorefrontProvider', () => {
  it('publishes the resolved business as the active tenant', () => {
    renderStorefront(<Probe />, {
      bootstrap: makeBootstrap({ slug: 'nuru-studio', businessId: 'A' }),
    })

    expect(screen.getByText(/^A · nuru-studio/)).toBeInTheDocument()
    expect(getActiveTenantSlug()).toBe('nuru-studio')
  })

  it('moves the active tenant when the visitor switches business', () => {
    const first = renderStorefront(<Probe />, {
      bootstrap: makeBootstrap({ slug: 'nuru-studio', businessId: 'A' }),
    })
    expect(getActiveTenantSlug()).toBe('nuru-studio')
    first.unmount()

    renderStorefront(<Probe />, {
      bootstrap: makeBootstrap({ slug: 'aurelia-luxe', businessId: 'B' }),
    })

    expect(screen.getByText(/^B · aurelia-luxe/)).toBeInTheDocument()
    expect(getActiveTenantSlug()).toBe('aurelia-luxe')
  })

  it('follows the business’s capabilities rather than assuming them', () => {
    renderStorefront(<Probe />, {
      bootstrap: makeBootstrap({
        business: { ...makeBootstrap().business, capabilities: { appointments: false } },
      }),
    })

    expect(screen.getByText(/appointments false/)).toBeInTheDocument()
  })
})
