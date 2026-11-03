import { describe, expect, it } from 'vitest'
import {
  resolveSurface,
  slugFromHost,
  storefrontHref,
  storefrontPublicUrl,
  tenantUrl,
} from './host'

/**
 * Tenant (business) address resolution.
 *
 * A business's storefront is reachable two ways — a subdomain
 * (`nuru-studio.zenbokk.com/services`) and a path (`zenbokk.com/nuru-studio/services`).
 * Both must resolve to the same tenant and build the same links, and neither may
 * treat a platform host or a reserved label as a business.
 */
describe('host surface resolution', () => {
  it('resolves a business subdomain to its slug', () => {
    expect(resolveSurface('nuru-studio.zenbokk.com')).toEqual({
      kind: 'tenant',
      host: 'nuru-studio.zenbokk.com',
      slug: 'nuru-studio',
    })
    expect(slugFromHost('nuru-studio.zenbokk.com')).toBe('nuru-studio')
  })

  it('never mistakes a platform host or a reserved label for a business', () => {
    expect(resolveSurface('zenbokk.com').kind).toBe('marketing')
    expect(resolveSurface('www.zenbokk.com').kind).toBe('marketing')
    expect(resolveSurface('admin.zenbokk.com').kind).toBe('admin')
    expect(resolveSurface('api.zenbokk.com').kind).toBe('unknown')
    expect(resolveSurface('a.b.zenbokk.com').kind).toBe('unknown')
    expect(slugFromHost('admin.zenbokk.com')).toBeNull()
  })

  it('builds the canonical tenant URL for a page', () => {
    expect(tenantUrl('nuru-studio')).toBe('http://nuru-studio.zenbokk.com/')
    expect(tenantUrl('nuru-studio', '/gallery')).toBe(
      'http://nuru-studio.zenbokk.com/gallery',
    )
    expect(storefrontPublicUrl('nuru-studio')).toBe('http://nuru-studio.zenbokk.com/')
  })

  it('keeps the slug in the path when the visitor is not on a tenant host', () => {
    // The test environment serves the app from plain localhost, which is the
    // path-based fallback: the slug has to stay in the address.
    expect(storefrontHref('nuru-studio')).toBe('/nuru-studio')
    expect(storefrontHref('nuru-studio', '/gallery')).toBe('/nuru-studio/gallery')
    expect(storefrontHref('nuru-studio', '/team/abc')).toBe('/nuru-studio/team/abc')
  })
})
