import { http } from 'msw'
import { describe, expect, it } from 'vitest'
import { adminApi } from './api'
import { ok } from '../../test/handlers'
import { server } from '../../test/server'

/**
 * The platform-administration wire contract.
 *
 * Each call must hit the exact route, verb and body the controller expects — a
 * typo here would only surface as a 404 in the browser. The handlers echo the
 * captured request so the assertions are on what actually went out.
 */
type Captured = { method: string; url: URL; body: unknown }

function capture() {
  const captured: Captured[] = []
  const handler = (pattern: string) =>
    http.all(`*/api/v1${pattern}`, async ({ request }) => {
      let body: unknown = null
      try {
        body = await request.json()
      } catch {
        body = null
      }
      captured.push({ method: request.method, url: new URL(request.url), body })
      return ok({})
    })
  return { captured, handler }
}

describe('adminApi routes', () => {
  it('lists managed businesses with the filter set as query parameters', async () => {
    const { captured, handler } = capture()
    server.use(handler('/admin/businesses/managed'))

    await adminApi.managedBusinesses({ status: 'active', planKey: 'growth', page: 2, pageSize: 50 })

    expect(captured[0].method).toBe('GET')
    expect(captured[0].url.pathname).toBe('/api/v1/admin/businesses/managed')
    expect(captured[0].url.searchParams.get('status')).toBe('active')
    expect(captured[0].url.searchParams.get('planKey')).toBe('growth')
    expect(captured[0].url.searchParams.get('page')).toBe('2')
  })

  it('reads one business profile, its members and its audit trail', async () => {
    const { captured, handler } = capture()
    server.use(
      handler('/admin/businesses/:id/profile'),
      handler('/admin/businesses/:id/users'),
      handler('/admin/businesses/:id/audit'),
    )

    await adminApi.businessDetail('b1')
    await adminApi.businessUsers('b1', { role: 'Staff', page: 1 })
    await adminApi.businessAudit('b1', { page: 1 })

    expect(captured.map((entry) => entry.url.pathname)).toEqual([
      '/api/v1/admin/businesses/b1/profile',
      '/api/v1/admin/businesses/b1/users',
      '/api/v1/admin/businesses/b1/audit',
    ])
    expect(captured[1].url.searchParams.get('role')).toBe('Staff')
  })

  it('edits a business profile with PUT', async () => {
    const { captured, handler } = capture()
    server.use(handler('/admin/businesses/:id'))

    await adminApi.updateBusiness('b1', { name: 'Acme', reason: 'typo' })

    expect(captured[0].method).toBe('PUT')
    expect(captured[0].url.pathname).toBe('/api/v1/admin/businesses/b1')
    expect(captured[0].body).toEqual({ name: 'Acme', reason: 'typo' })
  })

  it('maps each business status to its own endpoint', async () => {
    const { captured, handler } = capture()
    server.use(
      handler('/admin/businesses/:id/suspend'),
      handler('/admin/businesses/:id/reactivate'),
      handler('/admin/businesses/:id/deactivate'),
    )

    await adminApi.setBusinessStatus('b1', 'suspended', 'review')
    await adminApi.setBusinessStatus('b1', 'active')
    await adminApi.setBusinessStatus('b1', 'deactivated', 'closed')

    expect(captured.map((entry) => `${entry.method} ${entry.url.pathname}`)).toEqual([
      'POST /api/v1/admin/businesses/b1/suspend',
      'POST /api/v1/admin/businesses/b1/reactivate',
      'POST /api/v1/admin/businesses/b1/deactivate',
    ])
    expect(captured[0].body).toEqual({ reason: 'review' })
  })

  it('issues every subscription lifecycle action to its own route', async () => {
    const { captured, handler } = capture()
    server.use(
      handler('/admin/subscriptions'),
      handler('/admin/subscriptions/:id/pause'),
      handler('/admin/subscriptions/:id/resume'),
      handler('/admin/subscriptions/:id/cancel'),
      handler('/admin/subscriptions/:id/reactivate'),
      handler('/admin/subscriptions/:id/deactivate'),
      handler('/admin/subscriptions/:id/extend'),
      handler('/admin/subscriptions/:id/change-plan'),
    )

    await adminApi.subscriptions({ status: 'paused' })
    await adminApi.subscriptionAction('b1', 'pause', 'hold')
    await adminApi.subscriptionAction('b1', 'resume')
    await adminApi.subscriptionAction('b1', 'cancel', 'churn')
    await adminApi.subscriptionAction('b1', 'reactivate')
    await adminApi.subscriptionAction('b1', 'deactivate', 'fraud')
    await adminApi.extendSubscription('b1', '2027-01-01T00:00:00.000Z', 'goodwill')
    await adminApi.changePlan('b1', 'growth', 'upgrade request')

    expect(captured.map((entry) => entry.url.pathname)).toEqual([
      '/api/v1/admin/subscriptions',
      '/api/v1/admin/subscriptions/b1/pause',
      '/api/v1/admin/subscriptions/b1/resume',
      '/api/v1/admin/subscriptions/b1/cancel',
      '/api/v1/admin/subscriptions/b1/reactivate',
      '/api/v1/admin/subscriptions/b1/deactivate',
      '/api/v1/admin/subscriptions/b1/extend',
      '/api/v1/admin/subscriptions/b1/change-plan',
    ])
    expect(captured[7].body).toEqual({ planKey: 'growth', reason: 'upgrade request' })
  })

  it('covers the plan catalogue, its lifecycle and its module set', async () => {
    const { captured, handler } = capture()
    server.use(
      handler('/admin/subscription-tiers'),
      handler('/admin/subscription-tiers/:id'),
      handler('/admin/subscription-tiers/:id/duplicate'),
      handler('/admin/subscription-tiers/:id/publish'),
      handler('/admin/subscription-tiers/:id/modules'),
    )

    await adminApi.tiers()
    await adminApi.createTier({
      key: 'growth',
      name: 'Growth',
      price: 2500,
      billingInterval: 'monthly',
    })
    await adminApi.updateTier('t1', { price: 3000 })
    await adminApi.duplicateTier('t1', {})
    await adminApi.tierLifecycle('t1', 'publish')
    await adminApi.setTierModules('t1', { moduleKeys: ['customers', 'loyalty'] })

    expect(captured.map((entry) => `${entry.method} ${entry.url.pathname}`)).toEqual([
      'GET /api/v1/admin/subscription-tiers',
      'POST /api/v1/admin/subscription-tiers',
      'PUT /api/v1/admin/subscription-tiers/t1',
      'POST /api/v1/admin/subscription-tiers/t1/duplicate',
      'POST /api/v1/admin/subscription-tiers/t1/publish',
      'PUT /api/v1/admin/subscription-tiers/t1/modules',
    ])
    expect(captured[5].body).toEqual({ moduleKeys: ['customers', 'loyalty'] })
  })

  it('reads the module catalogue and edits a module and a business override', async () => {
    const { captured, handler } = capture()
    server.use(
      handler('/admin/module-catalog'),
      handler('/admin/modules/:key'),
      handler('/admin/businesses/:id/modules/:key'),
    )

    await adminApi.moduleCatalog()
    await adminApi.updateModule('loyalty', { isActive: false, reason: 'retired' })
    await adminApi.setBusinessModule('b1', 'loyalty', true, 'pilot')
    await adminApi.removeBusinessModuleOverride('b1', 'loyalty')

    expect(captured.map((entry) => `${entry.method} ${entry.url.pathname}`)).toEqual([
      'GET /api/v1/admin/module-catalog',
      'PUT /api/v1/admin/modules/loyalty',
      'PUT /api/v1/admin/businesses/b1/modules/loyalty',
      'DELETE /api/v1/admin/businesses/b1/modules/loyalty',
    ])
    expect(captured[2].body).toEqual({ enabled: true, reason: 'pilot' })
  })

  it('reads the platform audit feed with its filters', async () => {
    const { captured, handler } = capture()
    server.use(handler('/admin/subscription-audit-logs'))

    await adminApi.auditLogs({ tierId: 't1', page: 3 })

    expect(captured[0].url.pathname).toBe('/api/v1/admin/subscription-audit-logs')
    expect(captured[0].url.searchParams.get('tierId')).toBe('t1')
    expect(captured[0].url.searchParams.get('page')).toBe('3')
  })
})
