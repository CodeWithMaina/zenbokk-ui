import { z } from 'zod'

/**
 * Kenyan phone numbers, in the shapes people actually type them.
 *
 * `0712 345 678`, `0712345678`, `+254712345678`, `254712345678` and
 * `01xx xxx xxx` (Safaricom's newer 01 range) all resolve to the same number.
 * The normalised `254…` form is what the API stores and what an M-Pesa prompt
 * expects, so the form submits that rather than whatever was typed.
 *
 * Returns null for anything that is not a Kenyan mobile number, so callers can
 * branch on a real answer instead of a boolean they then have to re-parse.
 */
export function normaliseKenyanPhone(input: string): string | null {
  const digits = input.replace(/[\s\-()]/g, '')
  if (!/^(?:\+?254|0)?[17]\d{8}$/.test(digits)) return null
  return `254${digits.slice(-9)}`
}

/** `254712345678` → `0712 345 678`, for display. */
export function formatKenyanPhone(input: string): string {
  const normalised = normaliseKenyanPhone(input)
  if (!normalised) return input
  const local = `0${normalised.slice(3)}`
  return `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}`
}

export const storefrontEnquirySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Enter the name we should look for.')
    .max(100, 'Name must be 100 characters or fewer.'),
  phoneNumber: z
    .string()
    .trim()
    .min(1, 'Enter a phone number so the studio can reply.')
    .refine((value) => normaliseKenyanPhone(value) !== null, {
      message: 'Use a Kenyan number, for example 0712 345 678.',
    }),
  message: z
    .string()
    .trim()
    .max(500, 'Please keep it under 500 characters.')
    .optional()
    .or(z.literal('')),
})

export type StorefrontEnquiryValues = z.input<typeof storefrontEnquirySchema>
