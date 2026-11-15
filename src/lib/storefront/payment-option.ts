import type { StorefrontPaymentOption } from '../api/types'

/**
 * Which payment option a storefront booking uses.
 *
 * <para><b>Why this is a module and not three lines in the page.</b> The rule has four cases
 * (one option on, the other on, both on, neither on) and getting it wrong means either asking a
 * customer a question with one answer, or silently choosing when their money is taken. Stated
 * once, as a pure function, it can be tested exhaustively — and the page, which needs it in three
 * places (what to render, what to send, what the confirmation says), cannot drift from the tests.
 * The server applies the same rule again; this is only what the page proposes.</para>
 */
export type PaymentOptionPolicy = {
  /** Both options are on, so the customer must choose. */
  needsChoice: boolean
  /** Neither option is on: the business is not taking online bookings. */
  bookingUnavailable: boolean
  /**
   * The option the booking will use when the customer has not been asked — null while a choice
   * is still required, or when the business takes no bookings.
   */
  automatic: StorefrontPaymentOption | null
}

export function paymentOptionPolicy(
  payUpfrontEnabled: boolean,
  payAfterServiceEnabled: boolean,
): PaymentOptionPolicy {
  if (!payUpfrontEnabled && !payAfterServiceEnabled)
    return { needsChoice: false, bookingUnavailable: true, automatic: null }

  if (payUpfrontEnabled && payAfterServiceEnabled)
    return { needsChoice: true, bookingUnavailable: false, automatic: null }

  return {
    needsChoice: false,
    bookingUnavailable: false,
    automatic: payUpfrontEnabled ? 'pay_upfront' : 'pay_after_service',
  }
}

/**
 * The option to send with the booking: the customer's answer when they were asked, the single
 * enabled option when they were not, and null when the page must not book at all.
 */
export function resolvePaymentOption(
  policy: PaymentOptionPolicy,
  chosen: StorefrontPaymentOption | null,
): StorefrontPaymentOption | null {
  if (policy.bookingUnavailable) return null
  return policy.needsChoice ? chosen : policy.automatic
}
