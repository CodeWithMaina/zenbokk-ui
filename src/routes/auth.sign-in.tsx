import { zodResolver } from '@hookform/resolvers/zod'
import { createFileRoute, Link, useNavigate, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Alert } from '../components/ui/alert'
import { Button } from '../components/ui/button'
import { Field, Input } from '../components/ui/field'
import { ApiError } from '../lib/api/client'
import { useAuth } from '../lib/auth'
import { homePathForRole, requireAnonymous } from '../lib/auth/guards'

/** Only same-origin paths are accepted as a post-sign-in destination. */
function validateSearch(search: Record<string, unknown>): { redirect?: string } {
  const redirect = typeof search.redirect === 'string' ? search.redirect : ''
  return { redirect: redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : undefined }
}

export const Route = createFileRoute('/auth/sign-in')({
  validateSearch,
  beforeLoad: async () => {
    await requireAnonymous()
  },
  component: SignInPage,
})

const schema = z.object({
  email: z.email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password'),
})

type SignInValues = z.infer<typeof schema>

function SignInPage() {
  const { redirect } = Route.useSearch()
  const navigate = useNavigate()
  const router = useRouter()
  const { signIn } = useAuth()
  const [failure, setFailure] = useState<{ message: string; unverifiedEmail?: string } | null>(
    null,
  )

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = handleSubmit(async (values) => {
    setFailure(null)
    try {
      const response = await signIn(values)
      if (redirect) {
        // Arbitrary deep link (e.g. a booking draft) — push it verbatim.
        router.history.push(redirect)
        return
      }
      await navigate({ to: homePathForRole(response.user.role), replace: true })
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.code === 'EMAIL_NOT_VERIFIED' || error.code === 'EMAIL_NOT_CONFIRMED') {
          setFailure({
            message: 'Confirm your email address to finish signing in.',
            unverifiedEmail: values.email,
          })
          return
        }
        if (error.code === 'INVALID_CREDENTIALS' || error.status === 401) {
          setFailure({ message: 'That email and password don’t match. Try again.' })
          return
        }
        setFailure({ message: error.message })
        return
      }
      setFailure({ message: 'Something went wrong. Please try again.' })
    }
  })

  return (
    <div>
      <p className="eyebrow">Welcome back</p>
      <h1 className="display mt-[0.4rem] text-title">Sign in to Punched</h1>
      <p className="mt-[0.4rem] text-meta text-muted">
        Use the email address you signed up with. Business owners and staff land in
        their own console.
      </p>

      {failure ? (
        <Alert tone="danger" className="mt-[1.1rem]">
          {failure.message}
          {failure.unverifiedEmail ? (
            <>
              {' '}
              <Link
                to="/auth/verify"
                search={{ email: failure.unverifiedEmail }}
                className="link font-semibold"
              >
                Confirm your email
              </Link>
            </>
          ) : null}
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

        <Field
          label="Password"
          htmlFor="password"
          error={errors.password?.message}
          hint={
            <>
              <Link to="/auth/forgot-password" className="link">
                Forgot your password?
              </Link>
            </>
          }
        >
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="Your password"
            invalid={!!errors.password}
            {...register('password')}
          />
        </Field>

        <Button type="submit" variant="primary" size="xl" disabled={isSubmitting}>
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      <p className="mt-[1.2rem] text-center text-meta text-muted">
        New to Punched?{' '}
        <Link to="/auth/sign-up" search={{ redirect }} className="link font-semibold">
          Create an account
        </Link>
      </p>
    </div>
  )
}
