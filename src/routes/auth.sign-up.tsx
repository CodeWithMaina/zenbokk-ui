import { zodResolver } from '@hookform/resolvers/zod'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Alert } from '../components/ui/alert'
import { Button } from '../components/ui/button'
import { Field, Input } from '../components/ui/field'
import { ApiError, errorMessage } from '../lib/api/client'
import { useAuth } from '../lib/auth'
import { requireAnonymous } from '../lib/auth/guards'

/** Only same-origin paths are accepted as a post-verification destination. */
function validateSearch(search: Record<string, unknown>): { redirect?: string } {
  const redirect = typeof search.redirect === 'string' ? search.redirect : ''
  return { redirect: redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : undefined }
}

export const Route = createFileRoute('/auth/sign-up')({
  validateSearch,
  beforeLoad: async () => {
    await requireAnonymous()
  },
  component: SignUpPage,
})

const schema = z
  .object({
    fullName: z.string().trim().min(2, 'Enter your full name'),
    email: z.email('Enter a valid email address'),
    password: z.string().min(8, 'Use at least 8 characters'),
    confirmPassword: z.string().min(1, 'Confirm your password'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  })

type SignUpValues = z.infer<typeof schema>

function SignUpPage() {
  const { redirect } = Route.useSearch()
  const navigate = useNavigate()
  const { signUp } = useAuth()
  const [failure, setFailure] = useState<{ message: string; existingAccount?: boolean } | null>(
    null,
  )

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignUpValues>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: '', email: '', password: '', confirmPassword: '' },
  })

  const onSubmit = handleSubmit(async (values) => {
    setFailure(null)
    try {
      await signUp({
        fullName: values.fullName.trim(),
        email: values.email.trim(),
        password: values.password,
      })

      await navigate({
        to: '/auth/verify',
        search: { email: values.email.trim(), redirect },
        replace: true,
      })
    } catch (error) {
      if (error instanceof ApiError && error.code === 'EMAIL_ALREADY_REGISTERED') {
        setFailure({
          message: 'An account already exists for this email address.',
          existingAccount: true,
        })
        return
      }
      setFailure({ message: errorMessage(error, 'We could not create your account. Try again.') })
    }
  })

  return (
    <div>
      <p className="eyebrow">Create your account</p>
      <h1 className="display mt-[0.4rem] text-title">Join Punched</h1>
      <p className="mt-[0.4rem] text-meta text-muted">
        Keep every visit, stamp and appointment in one place. We’ll email you a
        six-digit code to confirm the address.
      </p>

      {failure ? (
        <Alert tone="danger" className="mt-[1.1rem]">
          {failure.message}
          {failure.existingAccount ? (
            <>
              {' '}
              <Link
                to="/auth/sign-in"
                search={{ redirect }}
                className="link font-semibold"
              >
                Sign in instead
              </Link>
            </>
          ) : null}
        </Alert>
      ) : null}

      <form className="mt-[1.2rem] flex flex-col gap-[0.9rem]" onSubmit={onSubmit} noValidate>
        <Field label="Full name" htmlFor="fullName" error={errors.fullName?.message}>
          <Input
            id="fullName"
            autoComplete="name"
            placeholder="Amina Wanjiku"
            invalid={!!errors.fullName}
            {...register('fullName')}
          />
        </Field>

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

        <Field
          label="Password"
          htmlFor="password"
          error={errors.password?.message}
          hint="At least 8 characters."
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

        <Field
          label="Confirm password"
          htmlFor="confirmPassword"
          error={errors.confirmPassword?.message}
        >
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder="Repeat your password"
            invalid={!!errors.confirmPassword}
            {...register('confirmPassword')}
          />
        </Field>

        <Button type="submit" variant="primary" size="xl" disabled={isSubmitting}>
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </Button>
      </form>

      <p className="mt-[1.2rem] text-center text-meta text-muted">
        Already have an account?{' '}
        <Link to="/auth/sign-in" search={{ redirect }} className="link font-semibold">
          Sign in
        </Link>
      </p>
    </div>
  )
}
