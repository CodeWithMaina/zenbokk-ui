import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ModuleEntitlementList } from './module-entitlement-list'
import type { AdminBusinessEffectiveModule } from '../../lib/api/types'

/**
 * Module entitlements for one business.
 *
 * The distinctions the platform administrator needs are made explicit: a module
 * can be included by the plan, granted manually, or withheld, and a module can
 * read "enabled" yet not grant access. The assertions are on those words,
 * because they are the whole point of the screen.
 */
const modules: AdminBusinessEffectiveModule[] = [
  {
    key: 'customers',
    name: 'Customers',
    description: 'Customer management',
    isCore: true,
    isEnabled: true,
    hasAccess: true,
    source: 'PLAN',
    reason: null,
    dependencies: [],
  },
  {
    key: 'analytics',
    name: 'Analytics',
    description: 'Reports',
    isCore: false,
    isEnabled: true,
    hasAccess: false,
    source: 'PLAN',
    reason: null,
    dependencies: ['customers'],
  },
  {
    key: 'loyalty',
    name: 'Loyalty',
    description: 'Programmes',
    isCore: false,
    isEnabled: false,
    hasAccess: false,
    source: 'ADMIN',
    reason: 'Withdrawn pending review',
    dependencies: ['customers'],
  },
]

describe('ModuleEntitlementList', () => {
  it('distinguishes available, enabled-without-access and disabled modules', () => {
    render(<ModuleEntitlementList modules={modules} />)

    expect(screen.getByText('Available')).toBeInTheDocument()
    expect(screen.getByText('Enabled — no access')).toBeInTheDocument()
    expect(screen.getByText('Disabled')).toBeInTheDocument()
  })

  it('shows the entitlement source so an override is never mistaken for a plan grant', () => {
    render(<ModuleEntitlementList modules={modules} />)

    // The two plan-granted modules both carry the PLAN source.
    expect(screen.getAllByText('Plan')).toHaveLength(2)
    expect(screen.getByText('Admin override')).toBeInTheDocument()
    expect(screen.getByText('Withdrawn pending review')).toBeInTheDocument()
  })

  it('enables a disabled module through the admin override', async () => {
    const user = userEvent.setup()
    const onSet = vi.fn()

    render(<ModuleEntitlementList modules={modules} onSet={onSet} />)

    // The disabled row offers Enable; the enabled row offers Disable.
    await user.click(screen.getAllByRole('button', { name: /enable/i })[0])

    expect(onSet).toHaveBeenCalledWith('loyalty', true)
  })

  it('disables an enabled module through the admin override', async () => {
    const user = userEvent.setup()
    const onSet = vi.fn()

    render(<ModuleEntitlementList modules={modules} onSet={onSet} />)

    await user.click(screen.getAllByRole('button', { name: /disable/i })[0])

    expect(onSet).toHaveBeenCalledWith('customers', false)
  })

  it('offers Revert only for a module that carries an override', async () => {
    const user = userEvent.setup()
    const onRemoveOverride = vi.fn()

    render(<ModuleEntitlementList modules={modules} onRemoveOverride={onRemoveOverride} />)

    // Only the ADMIN-sourced module may be reverted to its plan entitlement.
    const reverts = screen.getAllByRole('button', { name: /revert/i })
    expect(reverts).toHaveLength(1)

    await user.click(reverts[0])
    expect(onRemoveOverride).toHaveBeenCalledWith('loyalty')
  })

  it('explains an empty catalogue instead of rendering an empty table', () => {
    render(<ModuleEntitlementList modules={[]} />)
    expect(screen.getByText('No modules in the catalogue')).toBeInTheDocument()
  })
})
