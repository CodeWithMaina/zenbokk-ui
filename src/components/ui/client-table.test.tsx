import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { ClientSummary } from './client-card'
import { ClientTable } from './client-table'

/**
 * The client roster table.
 *
 * The Stamps column is loyalty content, so the Customers page turns it off when
 * the workspace does not own the loyalty module. The table must then render
 * without the column while still listing the client.
 */

const rows: ClientSummary[] = [
  {
    id: 'c1',
    name: 'Wanjiru Kariuki',
    status: 'active',
    statusLabel: 'Active',
    stamps: 4,
    stampGoal: 8,
  },
]

describe('ClientTable', () => {
  it('shows the Stamps column by default', () => {
    render(<ClientTable rows={rows} />)

    expect(screen.getByRole('columnheader', { name: 'Stamps' })).toBeInTheDocument()
    expect(screen.getByText('4/8')).toBeInTheDocument()
  })

  it('hides the Stamps column when the loyalty module is off', () => {
    render(<ClientTable rows={rows} showStamps={false} />)

    expect(screen.queryByRole('columnheader', { name: 'Stamps' })).toBeNull()
    expect(screen.queryByText('4/8')).toBeNull()
    // The client is still listed; only the loyalty column is gone.
    expect(screen.getByText('Wanjiru Kariuki')).toBeInTheDocument()
  })
})
