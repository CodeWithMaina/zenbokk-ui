import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MpesaMessage } from './MpesaMessage'

/**
 * The customer's confirmation, rendered as the SMS it is.
 *
 * The properties under test are the ones the board's honesty depends on: the message is
 * shown verbatim (never a tidied rewrite), the transaction code is highlighted inside that
 * text, and a value the server could not read reads as "Not found" instead of being invented.
 */
const MESSAGE =
  'QJK42NUM01 Confirmed. Ksh2,500.00 sent to NURU STUDIO for account 12345 on 12/5/26 at 3:04 PM.\n' +
  'Transaction cost, Ksh0.00.\nNew M-PESA balance is Ksh12,450.00.'

describe('MpesaMessage', () => {
  it('renders the submitted message verbatim, on one element', () => {
    render(<MpesaMessage message={MESSAGE} transactionCode="QJK42NUM01" />)

    // The code is highlighted, so the text is split across elements; the paragraph is the
    // element that holds the whole message. `textContent` preserves the customer's line breaks.
    const paragraph = screen
      .getByText(/Confirmed\. Ksh2,500\.00 sent to NURU STUDIO/)
      .closest('p')

    expect(paragraph).not.toBeNull()
    expect(paragraph!.textContent).toContain('QJK42NUM01')
    expect(paragraph!.textContent).toContain('\nNew M-PESA balance is Ksh12,450.00.')
  })

  it('highlights the transaction code inside the message', () => {
    render(<MpesaMessage message={MESSAGE} transactionCode="QJK42NUM01" />)

    const marks = document.querySelectorAll('mark')
    expect(marks).toHaveLength(1)
    expect(marks[0].textContent).toBe('QJK42NUM01')
  })

  it('marks nothing when the message does not contain the code it was given', () => {
    render(<MpesaMessage message={MESSAGE} transactionCode="ZZZ99YYY" />)

    expect(document.querySelectorAll('mark')).toHaveLength(0)
  })

  it('shows what the server read, and says so when it read nothing', () => {
    render(
      <MpesaMessage
        message="Confirmed. Ksh1,000.00 sent to NURU STUDIO."
        transactionCode={null}
        amount={null}
        currency="KES"
      />,
    )

    // Two facts the parser could not establish: the code and the amount.
    expect(screen.getAllByText('Not found')).toHaveLength(3)
  })

  it('shows the parsed amount rather than trusting a caller-supplied figure', () => {
    render(<MpesaMessage message={MESSAGE} transactionCode="QJK42NUM01" amount={2500} currency="KES" />)

    // `money()` is the app's whole-shilling format: `KES 2,500`.
    expect(screen.getAllByText('KES 2,500').length).toBeGreaterThan(0)
  })

  it('explains the absence of a message instead of faking one', () => {
    render(<MpesaMessage message={null} />)

    expect(screen.getByText(/No message was submitted with this claim/)).toBeInTheDocument()
    expect(screen.queryByRole('mark')).toBeNull()
  })
})
