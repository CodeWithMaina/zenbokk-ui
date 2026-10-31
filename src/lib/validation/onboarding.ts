import { z } from 'zod'
import { passwordSchema } from './password'

/**
 * Zod schemas mirroring the backend FluentValidation rules
 * (`Application/Validators/OnboardingValidators.cs`). Keeping them in step with
 * the API means a submission is never sent only to be rejected for something the
 * form could have caught.
 */

/** An optional text field that normalises `''` to `undefined` for the API. */
function optionalText(message: string, max: number) {
  return z
    .string()
    .max(max, message)
    .optional()
    .or(z.literal(''))
    .transform((value) => (value ? value : undefined))
}

const optionalEmail = optionalText('Invalid business email format', 255).refine(
  (value) => value === undefined || z.email().safeParse(value).success,
  'Invalid business email format',
)

/** Owner + business registration (`POST /v1/auth/register-business`). */
export const registerBusinessSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, 'Full name is required')
    .max(100, 'Full name must not exceed 100 characters'),
  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .max(255, 'Email must not exceed 255 characters')
    .pipe(z.email('Invalid email format')),
  password: passwordSchema,
  phoneNumber: optionalText('Phone number must not exceed 20 characters', 20),
  businessName: z
    .string()
    .trim()
    .min(1, 'Business name is required')
    .max(100, 'Business name must not exceed 100 characters'),
  businessCategory: z
    .string()
    .trim()
    .min(1, 'Business category is required')
    .max(50, 'Business category must not exceed 50 characters'),
  businessLocation: z
    .string()
    .trim()
    .min(1, 'Business location is required')
    .max(100, 'Business location must not exceed 100 characters'),
  businessPhone: optionalText('Business phone must not exceed 20 characters', 20),
  businessEmail: optionalEmail,
  businessMpesaNumber: z
    .string()
    .trim()
    .min(1, 'Business M-Pesa number is required')
    .max(20, 'Business M-Pesa number must not exceed 20 characters'),
  businessDescription: optionalText(
    'Business description must not exceed 500 characters',
    500,
  ),
})

export type RegisterBusinessValues = z.input<typeof registerBusinessSchema>

/** Staff invitation acceptance (`POST /v1/invitations/{token}/accept`). */
export const acceptInvitationSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, 'Full name is required')
    .max(100, 'Full name must not exceed 100 characters'),
  password: passwordSchema,
  emailConfirmation: z
    .string()
    .trim()
    .min(1, 'Please confirm the invited email address')
    .pipe(z.email('Invalid email format')),
})

export type AcceptInvitationValues = z.input<typeof acceptInvitationSchema>
