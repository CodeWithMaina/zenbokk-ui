import { describe, expect, it } from 'vitest'
import { DASHBOARD_NAV } from './config'

/**
 * The shape of the Finance restructure, pinned.
 *
 * Finance is four sections in the order an owner works them — Reconciliation (verify what
 * customers claim) → Transactions (money recognised as received) → Expenses (money spent) →
 * Cashbook (the consolidated book) — and Payments stays a SEPARATE operational module.
 *
 * These are configuration assertions rather than screen assertions on purpose: the navigation is
 * data, so if someone re-adds an Overview entry, drops Expenses, or folds Payments back under
 * Finance, the failure points at the cause rather than at a widget.
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
  it('exposes exactly the four sections, Cashbook first', () => {
    expect(finance).toBeDefined()
    // Cashbook leads: it is where /dashboard/finances lands and the answer to "how is the
    // business doing?" — the rest of Finance is how you get to the numbers in it.
    expect(finance?.children?.map((child) => child.key)).toEqual([
      'finances-cashbook',
      'finances-reconciliation',
      'finances-transactions',
      'finances-expenses',
    ])
  })

  it('points each section at its own route', () => {
    expect(finance?.children?.map((child) => child.to)).toEqual([
      '/dashboard/finances/cashbook',
      '/dashboard/finances/reconciliation',
      '/dashboard/finances/transactions',
      '/dashboard/finances/expenses',
    ])
  })

  it('lands on the Cashbook when Finance is opened', () => {
    // The group has no `to` of its own (it is a disclosure), and the index route redirects the
    // bare /dashboard/finances URL to the canonical Cashbook route.
    expect(finance?.to).toBeUndefined()

    const indexKey = Object.keys(routeSources).find((candidate) =>
      candidate.replace(/\\/g, '/').endsWith('routes/dashboard.finances.index.tsx'),
    )
    expect(indexKey, 'no /dashboard/finances index route file').toBeDefined()
    expect(routeSources[indexKey!]).toContain('/dashboard/finances/cashbook')
  })

  it('has no overview or analytics entry left to compete with the four sections', () => {
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
      // The file must declare the route at the path the menu points at, so a rename cannot leave
      // a menu item pointing at a 404.
      expect(source).toContain(`createFileRoute('${path}')`)
    }
  })
})

describe('Payments navigation', () => {
  it('stays a separate top-level module rather than a child of Finance', () => {
    const payments = DASHBOARD_NAV.find((entry) => entry.key === 'payments')

    expect(payments).toBeDefined()
    expect(payments?.to).toBe('/dashboard/payments')
    expect(payments?.module).toBe('payments')
    expect(payments?.permission).toBe('payments.view')
    expect(finance?.children?.some((child) => child.key === 'payments')).toBe(false)
  })

  it('has a real route file', () => {
    const source = routeSourceFor('/dashboard/payments')
    expect(source).toBeDefined()
    expect(source).toContain("createFileRoute('/dashboard/payments')")
  })
})
