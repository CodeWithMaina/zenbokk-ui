import { Badge } from './badge'
import type { Tone } from './badge'

/**
 * How a customer belongs to a business.
 *
 * `guest` — booked without an account (account-free flow). `registered` — holds a
 * real Punched account. The value is per business: the same person can be a guest
 * at one business and registered at another, so it is shown wherever a customer is
 * named in a business-scoped surface.
 */
export type CustomerType = 'guest' | 'registered'

/** Human label for a customer type, or null when it is unknown/absent. */
export function customerTypeLabel(type: string | null | undefined): string | null {
  if (type === 'guest') return 'Guest'
  if (type === 'registered') return 'Registered'
  return null
}

/** `guest` reads as a noteworthy state; `registered` is the quiet default. */
export function customerTypeTone(type: string | null | undefined): Tone {
  return type === 'guest' ? 'info' : 'neutral'
}

export type CustomerTypeBadgeProps = {
  type: string | null | undefined
  className?: string
}

/**
 * A small Guest / Registered tag. Renders nothing for an unknown value so a
 * surface never asserts a relationship it was not told about.
 */
export function CustomerTypeBadge({ type, className }: CustomerTypeBadgeProps) {
  const label = customerTypeLabel(type)
  if (!label) return null
  return (
    <Badge tone={customerTypeTone(type)} className={className}>
      {label}
    </Badge>
  )
}
