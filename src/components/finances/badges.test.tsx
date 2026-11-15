import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ReconciliationBadge, StatusPair, VerificationBadge } from './badges'

/**
 * The two money states, shown side by side and never merged.
 *
 * The property under test is the one the whole module rests on: a row can be confirmed (the owner accepts
 * the money arrived) and still unreconciled (nobody has compared it with the M-Pesa statement). If the two
 * ever rendered as a single badge, an owner could not tell the difference and the reconciliation screen
 * would lose its point.
 */
describe('finance badges', () => {
  it('renders a verified payment as both verified and not reconciled', () => {
    render(<StatusPair verification="verified" reconciliation="unreconciled" />)

    expect(screen.getByText('Verified')).toBeInTheDocument()
    expect(screen.getByText('Not reconciled')).toBeInTheDocument()
  })

  it('never presents a matched statement line as verified money', () => {
    render(<StatusPair verification="pending" reconciliation="matched" />)

    expect(screen.getByText('Pending')).toBeInTheDocument()
    expect(screen.getByText('Matched')).toBeInTheDocument()
    // The verified wording must not appear anywhere in the pair.
    expect(screen.queryByText('Verified')).not.toBeInTheDocument()
  })

  it('tones each state the way the product does', () => {
    render(
      <>
        <VerificationBadge status="rejected" />
        <ReconciliationBadge status="discrepancy" />
      </>,
    )

    expect(screen.getByText('Rejected')).toHaveClass('bg-danger-soft')
    expect(screen.getByText('Discrepancy')).toHaveClass('bg-danger-soft')
  })

  it('treats an unreconciled row as normal, not as an error', () => {
    render(<ReconciliationBadge status="unreconciled" />)

    const badge = screen.getByText('Not reconciled')
    expect(badge).toHaveClass('bg-neutral-soft')
    expect(badge).not.toHaveClass('bg-danger-soft')
    expect(badge).not.toHaveClass('bg-warning-soft')
  })
})
