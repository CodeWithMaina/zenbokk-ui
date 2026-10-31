import { z } from 'zod'

/**
 * The server's password policy, mirrored on the client.
 *
 * `RegisterRequestValidator`, `RegisterBusinessRequestValidator`,
 * `ResetPasswordRequestValidator`, `ChangePasswordRequestValidator` and
 * `AcceptStaffInvitationRequestValidator` all enforce the same rule: at least
 * eight characters with one uppercase letter, one number and one special
 * character. Declaring it once means the client never lets a password through
 * that the API is guaranteed to reject — the user gets the requirement inline
 * instead of after a round trip.
 */
export const PASSWORD_MIN_LENGTH = 8

export const PASSWORD_HINT =
  'At least 8 characters, with one uppercase letter, one number and one special character.'

/** The characters the API's special-character rule accepts. */
const SPECIAL_CHARACTERS = '!@#$%^&*(),.?":{}|<>'

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Use at least ${PASSWORD_MIN_LENGTH} characters`)
  .regex(/[A-Z]/, 'Add at least one uppercase letter')
  .regex(/[0-9]/, 'Add at least one number')
  .regex(
    new RegExp(`[${SPECIAL_CHARACTERS.replace(/[\\^\]]/g, '\\$&')}]`),
    'Add at least one special character (for example ! ? @ #)',
  )
