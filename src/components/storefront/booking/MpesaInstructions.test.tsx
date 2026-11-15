import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MpesaInstructions } from './MpesaInstructions'
import type { PublicPaymentDetails } from '../../../lib/payments/api'

/**
 * The one component both the booking wizard and the confirmation screen render.
 * These tests pin the parts that must never diverge between the two: the menu path
 * per route, the copy value (plain digits for a phone), the partial-payment note and
 * the safe fallback.
 */
function details(overrides: Partial<PublicPaymentDetails> = {}): PublicPaymentDetails {
  return {
    businessId: 'biz',
    businessName: 'Nuru Studio',
    currency: 'KES',
    enabled: true,
    accountType: 'paybill',
    paybillNumber: '247247',
    paybillAccount: 'AURELIA-1042',
    tillNumber: null,
    phoneNumber: null,
    payeeName: 'AURELIA LUXE',
    instructions: null,
    bookingFeePercentage: 30,
    cashEnabled: true,
    payUpfrontEnabled: true,
    payAfterServiceEnabled: false,
    bookingAvailable: true,
    offersPaymentChoice: false,
    ...overrides,
  }
}

const writeText = vi.fn().mockResolvedValue(undefined)

beforeEach(() => {
  writeText.mockClear()
  Object.defineProperty(window.navigator, 'clipboard', {
    value: { writeText },
    configurable: true,
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('MpesaInstructions', () => {
  it('shows the PayBill menu path and rows', () => {
    render(<MpesaInstructions details={details()} amount={1800} serviceTotal={6000} />)

    expect(screen.getByText(/m-pesa · paybill/i)).toBeInTheDocument()
    expect(screen.getByText('Pay Bill')).toBeInTheDocument()
    expect(screen.getByText('247247')).toBeInTheDocument()
    expect(screen.getByText('AURELIA-1042')).toBeInTheDocument()
    // Payee check appears when a payee name is set.
    expect(screen.getByText(/check the name shown is/i)).toBeInTheDocument()
    // Partial payment note: 1800 of 6000.
    expect(screen.getByText(/of the KES 6,000 total \(30%\)/i)).toBeInTheDocument()
  })

  it('shows the Till menu path and only the till row', () => {
    render(
      <MpesaInstructions
        details={details({ accountType: 'till', tillNumber: '5123456', paybillNumber: null, paybillAccount: null, payeeName: null })}
        amount={1500}
        serviceTotal={1500}
      />,
    )

    expect(screen.getByText(/buy goods and services/i)).toBeInTheDocument()
    expect(screen.getByText('5123456')).toBeInTheDocument()
    expect(screen.queryByText(/check the name shown is/i)).not.toBeInTheDocument()
    // No partial note when the amount equals the service total.
    expect(screen.queryByText(/total \(/i)).not.toBeInTheDocument()
  })

  it('groups the phone for display but copies the plain digits', async () => {
    render(
      <MpesaInstructions
        details={details({ accountType: 'send_money', phoneNumber: '254712440001', paybillNumber: null, paybillAccount: null })}
        amount={2400}
        serviceTotal={8000}
      />,
    )

    expect(screen.getByText('0712 440 001')).toBeInTheDocument()
    expect(screen.getByText(/standard m-pesa send-money charges apply/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /copy m-pesa number/i }))
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('0712440001'))
    expect(screen.getByText('Copied')).toBeInTheDocument()
  })

  it('renders the fallback when there are no details', () => {
    render(
      <MpesaInstructions
        details={details({ accountType: null, paybillNumber: null, paybillAccount: null, payeeName: null })}
        amount={0}
      />,
    )

    expect(screen.getByText(/hasn’t finished setting up m-pesa payments/i)).toBeInTheDocument()
  })
})
