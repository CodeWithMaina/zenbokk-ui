import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AuditTimeline } from './audit-timeline'
import type { SubscriptionAuditLogEntry } from '../../lib/api/types'

/**
 * The audit feed.
 *
 * An entry has to answer who, what, when and why — the reason is the only part
 * an administrator supplies, so it must be shown rather than summarised away.
 */
const entries: SubscriptionAuditLogEntry[] = [
  {
    id: 'a1',
    action: 'BUSINESS_SUSPENDED',
    actorUserId: 'u1',
    actorName: null,
    targetBusinessId: 'b1',
    targetPlanId: null,
    payload: { previous: 'active', status: 'suspended' },
    reason: 'Chargeback investigation',
    createdAt: '2026-11-04T09:12:00.000Z',
  },
  {
    id: 'a2',
    action: 'TIER_PUBLISHED',
    actorUserId: null,
    actorName: null,
    targetBusinessId: null,
    targetPlanId: 'p1',
    payload: null,
    reason: 'Tier published.',
    createdAt: '2026-11-03T08:00:00.000Z',
  },
]

describe('AuditTimeline', () => {
  it('renders each action with its reason and the recorded payload', () => {
    render(<AuditTimeline entries={entries} />)

    expect(screen.getByText('Business suspended')).toBeInTheDocument()
    expect(screen.getByText(/Chargeback investigation/)).toBeInTheDocument()
    expect(screen.getByText(/"status":"suspended"/)).toBeInTheDocument()
    expect(screen.getByText('Tier published')).toBeInTheDocument()
  })

  it('attributes an entry with no actor to the system rather than to a person', () => {
    render(<AuditTimeline entries={entries} />)
    expect(screen.getByText(/System/)).toBeInTheDocument()
  })

  it('explains an empty history', () => {
    render(<AuditTimeline entries={[]} emptyLabel="Nothing recorded yet." />)
    expect(screen.getByText('Nothing recorded yet.')).toBeInTheDocument()
  })
})
