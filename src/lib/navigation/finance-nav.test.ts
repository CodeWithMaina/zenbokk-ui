import { describe, expect, it } from 'vitest'
import { DASHBOARD_NAV } from './config'

/**
 * The shape of the Finance restructure, pinned.
 *
 * Finance is one expandable entry with three sections — Cashbook (the consolidated book,
 * and where /dashboard/finances lands), Payments (the operational register for appointment
 * money) and Expenses. The old standalone Payments module now lives here, and its old URL
 * redirects to the section. Overview and Analytics are deliberately absent: the Cashbook is
 * the overview, and the analytics live on their own route rather than competing here.
 *
 * These are configuration assertions rather than screen assertions on purpose: the
 * navigation is data, so if someone re-adds an Overview entry, drops Expenses, or points a
 * section at a route that does not exist, the failure names the cause.
 */

/** Every route file, read as text, so a nav entry can be checked against a real route. */
const routeSources = import.meta.glob('./../../routes/*.tsx', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

function routeSourceFor(path: string): string | undefined {
  const name = path.replace(/^\//, '').replace(/\//g, '.')
  const suffix = `routes/${name}.tsx`
  const key = Object.keys(routeSources).find((candidate) => candidate.replace(/\\/g, '/').endsWith(suffix))
  return key ? routeSources[key] : undefined
}

const finance = DASHBOARD_NAV.find((entry) => entry.key === 'finances')

describe('Finance navigation', () => {
  it('exposes the three sections, Cashbook first', () => {
    expect(finance).toBeDefined()
    expect(finance?.children?.map((child) => child.key)).toEqual([
      'finances-cashbook',
      'finances-payments',
      'finances-expenses',
    ])
  })

  it('points each section at its own route', () => {
    expect(finance?.children?.map((child) => child.to)).toEqual([
      '/dashboard/finances/cashbook',
      '/dashboard/finances/payments',
      '/dashboard/finances/expenses',
    ])
  })

  it('lands on the Cashbook when Finance is opened', () => {
    expect(finance?.to).toBe('/dashboard/finances/cashbook')

    const indexKey = Object.keys(routeSources).find((candidate) =>
      candidate.replace(/\\/g, '/').endsWith('routes/dashboard.finances.index.tsx'),
    )
    expect(indexKey, 'no /dashboard/finances index route file').toBeDefined()
    expect(routeSources[indexKey!]).toContain('/dashboard/finances/cashbook')
  })

  it('has no overview or analytics entry left to compete with the sections', () => {
    const paths = (finance?.children ?? []).map((child) => String(child.to))
    const labels = (finance?.children ?? []).map((child) => child.label)

    expect(paths).not.toContain('/dashboard/finances')
    expect(paths).not.toContain('/dashboard/finances/analytics')
    expect(labels).not.toContain('Overview')
    expect(labels).not.toContain('Analytics')
  })

  it('gates every section on the financials module and a finances permission', () => {
    for (const child of finance?.children ?? []) {
      expect(child.module, `${child.key} must require the financials module`).toBe('financials')
      expect(child.permission, `${child.key} must require a finances permission`).toMatch(/^finances\./)
    }
  })

  it('has a real route file behind every section — no placeholder-only pages', () => {
    for (const child of finance?.children ?? []) {
      const path = String(child.to)
      const source = routeSourceFor(path)
      expect(source, `no route file found for ${path}`).toBeDefined()
      expect(source).toContain(`createFileRoute('${path}')`)
    }
  })
})

describe('Payments under Finance', () => {
  it('is Finance’s second section, not a competing top-level entry', () => {
    expect(DASHBOARD_NAV.some((entry) => entry.key === 'payments')).toBe(false)

    const payments = finance?.children?.find((child) => child.key === 'finances-payments')
    expect(payments).toBeDefined()
    expect(payments?.to).toBe('/dashboard/finances/payments')
    expect(payments?.permission).toBe('finances.view')
  })

  it('keeps the old /dashboard/payments URL working as a redirect', () => {
    const source = routeSourceFor('/dashboard/payments')
    expect(source).toBeDefined()
    expect(source).toContain('/dashboard/finances/payments')
    expect(source).toContain('redirect')
  })

  it('has its own register route and a per-payment detail route', () => {
    const register = routeSourceFor('/dashboard/finances/payments')
    expect(register).toContain("createFileRoute('/dashboard/finances/payments')")

    const detailKey = Object.keys(routeSources).find((candidate) =>
      candidate.replace(/\\/g, '/').endsWith('routes/dashboard.finances.payments.$paymentId.tsx'),
    )
    expect(detailKey, 'no payment detail route file').toBeDefined()
  })
})
