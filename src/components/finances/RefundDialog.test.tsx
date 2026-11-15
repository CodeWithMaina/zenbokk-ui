import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { RefundDialog } from './RefundDialog'
import { ThemeProvider } from '../../theme'

type Target = {
  id: string
  reference: string
  amount: number
  refundableAmount: number
  customerName: string | null
}

const TARGET: Target = {
  id: '11111111-1111-1111-1111-111111111111',
  reference: 'FIN-2026-0001',
  amount: 1000,
  refundableAmount: 600,
  customerName: 'Amina Yusuf',
}

function renderRefund(target: Target | null = TARGET) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  })

  return render(
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <RefundDialog target={target} onClose={() => {}} />
      </QueryClientProvider>
    </ThemeProvider>,
  )
}

/**
 * Refunding an income row, fully or partly.
 *
 * Two rules keep refunds honest, and both are asserted here rather than trusted: the cap is what is LEFT
 * (not the original amount), and a refund is only recorded as money out once someone says the money has
 * actually gone back. The original payment is never touched.
 */
describe('RefundDialog', () => {
  it('caps the pre-filled amount at what is still refundable, not the original', async () => {
    renderRefund()

    expect(screen.getByText(/against FIN-2026-0001 · Amina Yusuf/i)).toBeInTheDocument()
    // The prefilled figure is what is LEFT, so the field can never invite a refused refund.
    expect(screen.getByLabelText('Amount (KES)')).toHaveValue('600')
    expect(screen.getByText(/KES 600 of KES 1,000 is left to refund/i)).toBeInTheDocument()
  })

  it('will not record a refund without a reason', async () => {
    renderRefund()

    expect(screen.getByRole('button', { name: 'Record refund' })).toBeDisabled()

    await userEvent.type(screen.getByLabelText('Reason (required)'), 'Service cut short')

    expect(screen.getByRole('button', { name: 'Record refund' })).toBeEnabled()
  })

  it('refuses an amount above the cap and says why', async () => {
    renderRefund()

    const amount = screen.getByLabelText('Amount (KES)')
    await userEvent.clear(amount)
    await userEvent.type(amount, '700')
    await userEvent.type(screen.getByLabelText('Reason (required)'), 'Full refund please')

    expect(screen.getByText(/that is more than the KES 600 still refundable/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Record refund' })).toBeDisabled()
  })

  it('treats a decided-but-unpaid refund as a separate decision from a returned one', async () => {
    renderRefund()

    const returned = screen.getByLabelText(/the money has already gone back/i)
    expect(returned).toBeChecked()

    await userEvent.click(returned)
    expect(returned).not.toBeChecked()

    // The reason is stated where the owner makes the decision, not left to be discovered afterwards.
    expect(screen.getByText(/it is recorded as pending and\s+does not reduce what you took this period/i)).toBeInTheDocument()
  })

  it('renders nothing when there is no income to refund', () => {
    const { container } = renderRefund(null)

    expect(container).toBeEmptyDOMElement()
  })
})
