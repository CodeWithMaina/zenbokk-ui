import { zodResolver } from '@hookform/resolvers/zod'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { Alert } from '../components/ui/alert'
import { Button } from '../components/ui/button'
import { Field, Input } from '../components/ui/field'
import { ApiError, errorMessage } from '../lib/api/client'
import { authApi } from '../lib/auth'
import { requireAnonymous } from '../lib/auth/guards'
import { PASSWORD_HINT, passwordSchema } from '../lib/validation/password'

type ResetSearch = { email?: string }

function validateSearch(search: Record<string, unknown>): ResetSearch {
  return {
    email: typeof search.email === 'string' && search.email.trim() ? search.email.trim() : undefined,
  }
}

export const Route = createFileRoute('/auth/reset-password')({
  validateSearch,
  beforeLoad: async () => {
    await requireAnonymous()
  },
  component: ResetPasswordPage,
})

const schema = z
  .object({
    email: z.email('Enter a valid email address'),
    code: z
      .string()
      .trim()
      .regex(/^\d{6}$/, 'Enter the six-digit code from your email'),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, 'Confirm your new password'),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  })

type ResetValues = z.infer<typeof schema>

function ResetPasswordPage() {
  const { email } = Route.useSearch()
  const navigate = useNavigate()
  const [failure, setFailure] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: email ?? '', code: '', newPassword: '', confirmPassword: '' },
  })

  const onSubmit = handleSubmit(async (values) => {
    setFailure(null)
    try {
      await authApi.resetPassword({
        email: values.email.trim(),
        code: values.code.trim(),
        newPassword: values.newPassword,
      })
      toast.success('Password updated. Sign in with your new password.')
      await navigate({ to: '/auth/sign-in', replace: true })
    } catch (error) {
      if (error instanceof ApiError && error.code === 'CODE_EXPIRED') {
        setFailure('That reset code has expired. Request a new one.')
        return
      }
      setFailure(errorMessage(error, 'We could not reset your password. Try again.'))
    }
  })

  return (
    <div>
      <p className="eyebrow">Choose a new password</p>
      <h1 className="display mt-[0.4rem] text-title">Reset your password</h1>
      <p className="mt-[0.4rem] text-meta text-muted">
        Enter the six-digit code from the reset email, then choose a new password.
      </p>

      {failure ? (
        <Alert tone="danger" className="mt-[1.1rem]">
          {failure}{' '}
          <Link to="/auth/forgot-password" className="link font-semibold">
            Request a new code
          </Link>
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

        <Field label="Reset code" htmlFor="code" error={errors.code?.message}>
          <Input
            id="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="123456"
            className="tracking-[0.35em] tabular"
            invalid={!!errors.code}
            {...register('code')}
          />
        </Field>

        <Field
          label="New password"
          htmlFor="newPassword"
          error={errors.newPassword?.message}
          hint={PASSWORD_HINT}
        >
          <Input
            id="newPassword"
            type="password"
            autoComplete="new-password"
            placeholder="Choose a new password"
            invalid={!!errors.newPassword}
            {...register('newPassword')}
          />
        </Field>

        <Field
          label="Confirm new password"
          htmlFor="confirmPassword"
          error={errors.confirmPassword?.message}
        >
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder="Repeat the new password"
            invalid={!!errors.confirmPassword}
            {...register('confirmPassword')}
          />
        </Field>

        <Button type="submit" variant="primary" size="xl" disabled={isSubmitting}>
          {isSubmitting ? 'Updating…' : 'Update password'}
        </Button>
      </form>

      <p className="mt-[1.2rem] text-center text-meta text-muted">
        <Link to="/auth/sign-in" className="link font-semibold">
          Back to sign in
        </Link>
      </p>
    </div>
  )
}
