import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { ApiError, errorMessage } from '../../lib/api/client'
import { useAuth } from '../../lib/auth'
import { invitationApi } from '../../lib/invitations/api'
import { acceptInvitationSchema } from '../../lib/validation/onboarding'
import { PASSWORD_HINT } from '../../lib/validation/password'
import { Alert } from '../ui/alert'
import { Button } from '../ui/button'
import { Field, Input } from '../ui/field'

export type AcceptInvitationFormProps = {
  token: string
  /** The invited address, read from the persisted invitation server-side. */
  invitedEmail: string
  /** Called with the identity's email once the server has issued a session. */
  onAccepted: (email: string) => void
}

/**
 * Staff account creation from an invitation.
 *
 * The email field is locked to the address on the invitation: the server
 * compares `emailConfirmation` against its own stored record, so letting the
 * invitee type a different address would only produce a rejection. The form
 * mirrors that rule instead of discovering it after a round trip.
 */
export function AcceptInvitationForm({
  token,
  invitedEmail,
  onAccepted,
}: AcceptInvitationFormProps) {
  const { establishSession } = useAuth()
  const [failure, setFailure] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(acceptInvitationSchema),
    mode: 'onTouched',
    defaultValues: { fullName: '', password: '', emailConfirmation: invitedEmail },
  })

  const onSubmit = handleSubmit(async (values) => {
    setFailure(null)
    try {
      const response = await invitationApi.accept(token, values)
      // The accept call returns a full token pair; adopting it here is what makes
      // the new staff member signed in rather than merely registered.
      await establishSession(response)
      onAccepted(response.user.email)
    } catch (error) {
      // The codes below are the ones `InvitationService` actually returns.
      const code = error instanceof ApiError ? error.code : ''
      switch (code) {
        case 'EMAIL_MISMATCH':
          setFailure('That email address does not match the one this invitation was sent to.')
          return
        case 'EMAIL_IN_USE':
          setFailure(
            'An account already exists for this address. Sign in with it instead — an invitation creates a new staff account, it cannot be added to an existing one.',
          )
          return
        case 'ALREADY_STAFF':
          setFailure('This address is already a member of the team. Just sign in.')
          return
        case 'EXPIRED':
          setFailure('This invitation has expired. Ask the business owner to send a new one.')
          return
        case 'REVOKED':
          setFailure('This invitation was withdrawn. Ask the business owner for a new one.')
          return
        case 'ALREADY_USED':
          setFailure('This invitation has already been accepted. Sign in instead.')
          return
        case 'INVALID_TOKEN':
          setFailure('This invitation link is invalid. Ask the business owner to resend it.')
          return
        default:
          setFailure(errorMessage(error, 'We could not activate your account. Try again.'))
      }
    }
  })

  return (
    <form className="flex flex-col gap-[0.9rem]" onSubmit={onSubmit} noValidate>
      {failure ? <Alert tone="danger">{failure}</Alert> : null}

      <Field label="Your full name" htmlFor="fullName" error={errors.fullName?.message}>
        <Input
          id="fullName"
          autoComplete="name"
          placeholder="Amina Wanjiku"
          invalid={!!errors.fullName}
          {...register('fullName')}
        />
      </Field>

      <Field
        label="Email"
        htmlFor="emailConfirmation"
        error={errors.emailConfirmation?.message}
        hint="Locked to the address this invitation was sent to."
      >
        <Input
          id="emailConfirmation"
          type="email"
          autoComplete="email"
          readOnly
          className="bg-hover"
          invalid={!!errors.emailConfirmation}
          {...register('emailConfirmation')}
        />
      </Field>

      <Field
        label="Choose a password"
        htmlFor="password"
        error={errors.password?.message}
        hint={PASSWORD_HINT}
      >
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          placeholder="Choose a password"
          invalid={!!errors.password}
          {...register('password')}
        />
      </Field>

      <Button type="submit" variant="primary" size="xl" disabled={isSubmitting}>
        {isSubmitting ? 'Activating…' : 'Join the team'}
      </Button>
    </form>
  )
}
