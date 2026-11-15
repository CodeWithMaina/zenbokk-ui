import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BreakdownList } from './BreakdownList'
import type { FinancialBreakdownItem } from '../../lib/finances/api'

function item(overrides: Partial<FinancialBreakdownItem> = {}): FinancialBreakdownItem {
  return { key: 'cash', label: 'Cash', amount: 1000, count: 1, percentage: 100, ...overrides }
}

/**
 * A breakdown, as bars.
 *
 * The amount is the fact and the bar is decoration, so the assertions are about the money and the order:
 * the biggest contributor comes first, because that is the answer to "where did this come from".
 */
describe('BreakdownList', () => {
  it('shows each slice with its amount and share', () => {
    render(
      <BreakdownList
        items={[
          item({ key: 'mpesa_till', label: 'M-Pesa Till', amount: 2450, percentage: 70 }),
          item({ key: 'cash', label: 'Cash', amount: 1050, percentage: 30 }),
        ]}
      />,
    )

    expect(screen.getByText('M-Pesa Till')).toBeInTheDocument()
    expect(screen.getByText('KES 2,450')).toBeInTheDocument()
    expect(screen.getByText('70%')).toBeInTheDocument()

    expect(screen.getByText('Cash')).toBeInTheDocument()
    expect(screen.getByText('KES 1,050')).toBeInTheDocument()
    expect(screen.getByText('30%')).toBeInTheDocument()
  })

  it('keeps the order the server sent, so the largest contributor leads', () => {
    render(
      <BreakdownList
        items={[
          item({ key: 'rent', label: 'Rent', amount: 15000, percentage: 88.2 }),
          item({ key: 'utilities', label: 'Utilities', amount: 2000, percentage: 11.8 }),
        ]}
      />,
    )

    const labels = screen.getAllByRole('listitem').map((row) => row.textContent)
    expect(labels[0]).toContain('Rent')
    expect(labels[1]).toContain('Utilities')
  })

  it('says so when the period has nothing in it', () => {
    render(<BreakdownList items={[]} />)

    expect(screen.getByText('Nothing recorded for this period.')).toBeInTheDocument()
  })

  it('labels each bar for a screen reader rather than leaving it decorative', () => {
    render(<BreakdownList items={[item({ label: 'Bank transfer', amount: 500, percentage: 100 })]} />)

    expect(screen.getByRole('img', { name: 'Bank transfer: 100% of the total' })).toBeInTheDocument()
  })
})
