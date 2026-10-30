import { zodResolver } from '@hookform/resolvers/zod'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Alert } from '../components/ui/alert'
import { Button } from '../components/ui/button'
import { Field, Input } from '../components/ui/field'
import { errorMessage } from '../lib/api/client'
import { authApi } from '../lib/auth'
import { requireAnonymous } from '../lib/auth/guards'

export const Route = createFileRoute('/auth/forgot-password')({
  beforeLoad: async () => {
    await requireAnonymous()
  },
  component: ForgotPasswordPage,
})

const schema = z.object({
  email: z.email('Enter a valid email address'),
})

type ForgotValues = z.infer<typeof schema>

function ForgotPasswordPage() {
  const [failure, setFailure] = useState<string | null>(null)
  const [sentTo, setSentTo] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  })

  const onSubmit = handleSubmit(async (values) => {
    setFailure(null)
    try {
      await authApi.forgotPassword({ email: values.email.trim() })
      setSentTo(values.email.trim())
    } catch (error) {
      setFailure(errorMessage(error, 'We could not send a reset code. Try again shortly.'))
    }
  })

  if (sentTo) {
    return (
      <div>
        <p className="eyebrow">Check your inbox</p>
        <h1 className="display mt-[0.4rem] text-title">Reset link sent</h1>
        <p className="mt-[0.4rem] text-meta text-muted">
          If an account exists for <span className="font-semibold">{sentTo}</span>,
          we’ve emailed a six-digit reset code. It expires in 10 minutes.
        </p>

        <Alert tone="success" className="mt-[1.1rem]">
          Enter the code on the next screen to choose a new password.
        </Alert>

        <Link
          to="/auth/reset-password"
          search={{ email: sentTo }}
          className="btn btn-primary btn-xl mt-[1.2rem] w-full no-underline"
        >
          Enter reset code
        </Link>

        <p className="mt-[1.2rem] text-center text-meta text-muted">
          <Link to="/auth/sign-in" className="link font-semibold">
            Back to sign in
          </Link>
        </p>
      </div>
    )
  }

  return (
    <div>
      <p className="eyebrow">Forgot password</p>
      <h1 className="display mt-[0.4rem] text-title">Get back in</h1>
      <p className="mt-[0.4rem] text-meta text-muted">
        Enter the email address on your account and we’ll send a six-digit code to
        reset your password.
      </p>

      {failure ? (
        <Alert tone="danger" className="mt-[1.1rem]">
          {failure}
        </Alert>
      ) : null}

      <form className="mt-[1.2rem] flex flex-col gap-[0.9rem]" onSubmit={onSubmit} noValidate>
        <Field label="Email" htmlFor="email" error={errors.email?.message}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            invalid={!!errors.email}
            {...register('email')}
          />
        </Field>

        <Button type="submit" variant="primary" size="xl" disabled={isSubmitting}>
          {isSubmitting ? 'Sending…' : 'Send reset code'}
        </Button>
      </form>

      <p className="mt-[1.2rem] text-center text-meta text-muted">
        Remembered it?{' '}
        <Link to="/auth/sign-in" className="link font-semibold">
          Sign in
        </Link>
      </p>
    </div>
  )
}
