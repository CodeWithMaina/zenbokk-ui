import { describe, expect, it } from 'vitest'
import { bookingProgressRows } from './BookingProgress'

/**
 * The booking progress model.
 *
 * The rule this file exists to protect: the panel never claims something happened
 * that the server has not reported. A booking in flight is not "secured", and a
 * booking that exists with a pasted M-PESA message is *awaiting verification*, not
 * paid.
 */

describe('bookingProgressRows', () => {
  it('keeps the appointment stage pending while the request is in flight', () => {
    const rows = bookingProgressRows({ state: 'submitting', paysUpfront: true })

    const availability = rows.find((row) => row.key === 'availability')
    const appointment = rows.find((row) => row.key === 'appointment')
    const done = rows.find((row) => row.key === 'done')

    expect(availability?.state).toBe('active')
    expect(appointment?.state).toBe('pending')
    expect(done?.state).toBe('pending')
    expect(done?.label).toBe('Booking confirmed')
  })

  it('marks the booking secured only after the server confirmed it', () => {
    const rows = bookingProgressRows({ state: 'confirmed', paysUpfront: false })

    expect(rows.find((row) => row.key === 'appointment')?.state).toBe('done')
    expect(rows.find((row) => row.key === 'done')?.state).toBe('done')
    // No payment stage when the business takes none up front.
    expect(rows.some((row) => row.key === 'payment')).toBe(false)
  })

  it('separates awaiting verification from a verified payment', () => {
    const pending = bookingProgressRows({
      state: 'confirmed',
      paysUpfront: true,
      paymentState: 'pending_verification',
    })
    expect(pending.find((row) => row.key === 'payment')?.label).toBe('Payment awaiting verification')
    expect(pending.find((row) => row.key === 'payment')?.state).toBe('active')

    const verified = bookingProgressRows({
      state: 'confirmed',
      paysUpfront: true,
      paymentState: 'paid',
    })
    expect(verified.find((row) => row.key === 'payment')?.label).toBe('Payment confirmed')
    expect(verified.find((row) => row.key === 'payment')?.state).toBe('done')
  })

  it('stops at availability on a conflict and says nothing was booked', () => {
    const rows = bookingProgressRows({ state: 'conflict', paysUpfront: true })

    expect(rows.find((row) => row.key === 'availability')?.state).toBe('warning')
    expect(rows.find((row) => row.key === 'appointment')?.detail).toMatch(/nothing has been booked/i)
    expect(rows.some((row) => row.state === 'done' && row.key !== 'details')).toBe(false)
  })
})
