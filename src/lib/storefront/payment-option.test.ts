import { describe, expect, it } from 'vitest'
import { paymentOptionPolicy, resolvePaymentOption } from './payment-option'

/**
 * Which payment option a storefront booking uses.
 *
 * The four configurations a business owner can save, and what each means for the customer:
 * exactly one option is applied without asking, both means the customer is asked, and neither
 * means there is nothing to book with. The server enforces the same rule (a hidden control is
 * not a rule), so these cases mirror the backend's policy tests deliberately.
 */
describe('paymentOptionPolicy', () => {
  it('asks the customer only when both options are enabled', () => {
    const policy = paymentOptionPolicy(true, true)

    expect(policy.needsChoice).toBe(true)
    expect(policy.bookingUnavailable).toBe(false)
    expect(policy.automatic).toBeNull()
    // Nothing is chosen for the customer: their money, their timing.
    expect(resolvePaymentOption(policy, null)).toBeNull()
    expect(resolvePaymentOption(policy, 'pay_upfront')).toBe('pay_upfront')
    expect(resolvePaymentOption(policy, 'pay_after_service')).toBe('pay_after_service')
  })

  it('applies paying during booking without asking when it is the only option', () => {
    const policy = paymentOptionPolicy(true, false)

    expect(policy.needsChoice).toBe(false)
    expect(policy.automatic).toBe('pay_upfront')
    expect(resolvePaymentOption(policy, null)).toBe('pay_upfront')
    // A choice the page was never asked for cannot change the answer.
    expect(resolvePaymentOption(policy, 'pay_after_service')).toBe('pay_upfront')
  })

  it('applies paying after the service without asking when it is the only option', () => {
    const policy = paymentOptionPolicy(false, true)

    expect(policy.needsChoice).toBe(false)
    expect(policy.automatic).toBe('pay_after_service')
    expect(resolvePaymentOption(policy, null)).toBe('pay_after_service')
    expect(resolvePaymentOption(policy, 'pay_upfront')).toBe('pay_after_service')
  })

  it('books nothing when the business has switched both options off', () => {
    const policy = paymentOptionPolicy(false, false)

    expect(policy.bookingUnavailable).toBe(true)
    expect(policy.needsChoice).toBe(false)
    expect(policy.automatic).toBeNull()
    // No option is invented: the booking is not sent at all.
    expect(resolvePaymentOption(policy, 'pay_upfront')).toBeNull()
    expect(resolvePaymentOption(policy, 'pay_after_service')).toBeNull()
  })
})
