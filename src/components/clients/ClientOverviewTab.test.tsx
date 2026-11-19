import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { CustomerDetailsResponse } from '../../lib/api/types'
import { MODULE } from '../../lib/entitlements'
import { makeDashboardContext } from '../../test/appointments'
import { renderDashboard } from '../../test/render'
import { ClientOverviewTab } from './ClientOverviewTab'

/**
 * The client Overview tab.
 *
 * Loyalty is its own module. When the workspace is not entitled to it the tab
 * must show nothing loyalty-shaped — no card, no stamp metrics and no
 * design/reward rows — even though the details endpoint still returns them. The
 * test supplies the same module access the dashboard shell would, so it asserts
 * the behaviour the app actually produces.
 */

function makeDetails(overrides: Partial<CustomerDetailsResponse> = {}): CustomerDetailsResponse {
  return {
    customer: {
      userId: 'cust-1',
      fullName: 'Wanjiru Kariuki',
      email: 'wanjiru@example.com',
      phoneNumber: '+254700000000',
      dateOfBirth: null,
      gender: null,
      avatarUrl: null,
      enrolledAt: '2026-01-01T00:00:00.000Z',
      lastStampAt: '2026-11-01T09:00:00.000Z',
    },
    status: { enrollmentStatus: 'active', customerType: 'registered', hasLoyaltyCard: true },
    metrics: {
      stampsIn7d: 2,
      visitsIn7d: 1,
      lifetimeStamps: 12,
      totalRedemptions: 3,
      totalVisits: 15,
      lastVisitAt: '2026-11-01T09:00:00.000Z',
    },
    finance: {
      currency: 'KES',
      totalSpent: 18500,
      paidTransactions: 4,
      refundedAmount: 0,
      completedAppointments: 6,
      averageSpend: 4625,
      lastPaymentAt: '2026-11-01T09:00:00.000Z',
      topService: { serviceId: 'svc-1', serviceName: 'Braids', timesServed: 3 },
      hasHistory: true,
    },
    loyalty: {
      cardId: 'card-1',
      programId: 'prog-1',
      programName: 'Aurelia Gold',
      totalStamps: 4,
      stampsRequired: 8,
      rewardDescription: 'Free treatment',
      rewardReady: false,
      cardDesignId: null,
      cardDesignName: null,
      cardDesignIsDefault: true,
      cardDesignHtml: null,
      rewardValue: 0,
      rewardExpirationHours: 0,
    },
    serverMs: 1,
    ...overrides,
  }
}

const LOYALTY_ON = makeDashboardContext({
  entitlements: [MODULE.customers, MODULE.loyalty],
  hasModule: (key: string) => key === MODULE.customers || key === MODULE.loyalty,
})

const LOYALTY_OFF = makeDashboardContext({
  entitlements: [MODULE.customers],
  hasModule: (key: string) => key === MODULE.customers,
})

describe('ClientOverviewTab', () => {
  it('shows the loyalty card, stamp metrics and reward rows when Loyalty is enabled', () => {
    renderDashboard(
      <ClientOverviewTab details={makeDetails({ loyalty: null })} customerId="cust-1" />,
      { context: LOYALTY_ON },
    )

    expect(screen.getByRole('heading', { name: 'Loyalty card' })).toBeInTheDocument()
    expect(screen.getByText('Lifetime stamps')).toBeInTheDocument()
    expect(screen.getByText('Redemptions')).toBeInTheDocument()
    expect(screen.getByText('Card design')).toBeInTheDocument()
    expect(screen.getByText('Reward')).toBeInTheDocument()
  })

  it('renders nothing loyalty-shaped when Loyalty is disabled', () => {
    renderDashboard(<ClientOverviewTab details={makeDetails()} customerId="cust-1" />, {
      context: LOYALTY_OFF,
    })

    // The client's own metrics still render...
    expect(screen.getByText('Total visits')).toBeInTheDocument()
    // ...but nothing belonging to the loyalty module does.
    expect(screen.queryByRole('heading', { name: 'Loyalty card' })).toBeNull()
    expect(screen.queryByText('Lifetime stamps')).toBeNull()
    expect(screen.queryByText('Redemptions')).toBeNull()
    expect(screen.queryByText('Card design')).toBeNull()
    expect(screen.queryByText('Reward')).toBeNull()
  })
})
