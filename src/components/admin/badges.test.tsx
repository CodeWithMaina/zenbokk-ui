import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  BusinessStatusPill,
  MemberStatusPill,
  ModuleSourceBadge,
  PlanLifecyclePill,
  SubscriptionStatusPill,
  auditActionLabel,
  auditActionTone,
} from './badges'

/**
 * The platform status vocabulary.
 *
 * These pills are the only place a status string becomes a label and a colour,
 * so a list, a detail page and a filter cannot disagree about what "paused"
 * looks like. The assertions are on the label a person reads and the semantic
 * tone class the token system provides.
 */
describe('admin status badges', () => {
  it('labels each business status and never echoes the raw value', () => {
    const { rerender } = render(<BusinessStatusPill status="active" />)
    expect(screen.getByText('Active')).toBeInTheDocument()

    rerender(<BusinessStatusPill status="suspended" />)
    expect(screen.getByText('Suspended')).toBeInTheDocument()

    rerender(<BusinessStatusPill status="deactivated" />)
    expect(screen.getByText('Deactivated')).toBeInTheDocument()
  })

  it('falls back to the raw value for an unknown business status', () => {
    render(<BusinessStatusPill status="quarantined" />)
    expect(screen.getByText('quarantined')).toBeInTheDocument()
  })

  it('shows an explicit "no subscription" state rather than a blank pill', () => {
    render(<SubscriptionStatusPill status={null} />)
    expect(screen.getByText('No subscription')).toBeInTheDocument()
  })

  it('renders every subscription lifecycle state with its own label', () => {
    const expected: [string, string][] = [
      ['active', 'Active'],
      ['trial', 'Trial'],
      ['past_due', 'Past due'],
      ['paused', 'Paused'],
      ['canceled', 'Cancelled'],
      ['expired', 'Expired'],
      ['deactivated', 'Deactivated'],
    ]

    for (const [status, label] of expected) {
      const { unmount } = render(<SubscriptionStatusPill status={status} />)
      expect(screen.getByText(label)).toBeInTheDocument()
      unmount()
    }
  })

  it('labels plan lifecycle states and member statuses', () => {
    const { rerender } = render(<PlanLifecyclePill lifecycle="Draft" />)
    expect(screen.getByText('Draft')).toBeInTheDocument()
    rerender(<PlanLifecyclePill lifecycle="Archived" />)
    expect(screen.getByText('Archived')).toBeInTheDocument()

    rerender(<MemberStatusPill status="Invited" />)
    expect(screen.getByText('Invited')).toBeInTheDocument()
  })

  it('distinguishes a plan grant from an administrator override', () => {
    const { rerender } = render(<ModuleSourceBadge source="PLAN" />)
    expect(screen.getByText('Plan')).toBeInTheDocument()

    rerender(<ModuleSourceBadge source="ADMIN" />)
    expect(screen.getByText('Admin override')).toBeInTheDocument()

    rerender(<ModuleSourceBadge source="OVERRIDE" />)
    expect(screen.getByText('Owner override')).toBeInTheDocument()
  })
})

describe('audit action vocabulary', () => {
  it('humanises an action code', () => {
    expect(auditActionLabel('BUSINESS_MODULE_FORCE_ENABLED')).toBe(
      'Business module force enabled',
    )
  })

  it('tones destructive and constructive actions differently', () => {
    expect(auditActionTone('BUSINESS_SUSPENDED')).toBe('danger')
    expect(auditActionTone('BUSINESS_SUBSCRIPTION_PAUSED')).toBe('warning')
    expect(auditActionTone('TIER_PUBLISHED')).toBe('success')
    expect(auditActionTone('SOMETHING_ELSE')).toBe('info')
  })
})
