import { zodResolver } from '@hookform/resolvers/zod'
import { Link, createFileRoute, useNavigate, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { AuthShell } from '../components/shell/AuthShell'
import { Alert } from '../components/ui/alert'
import { Button } from '../components/ui/button'
import { Field, Input } from '../components/ui/field'
import { ApiError } from '../lib/api/client'
import { useAuth } from '../lib/auth'
import { destinationForRole, requireAnonymous, requirePlatformSurface } from '../lib/auth/guards'
import { resolveSurface } from '../lib/tenant'

/** Only same-origin paths are accepted as a post-sign-in destination. */
function validateSearch(search: Record<string, unknown>): { redirect?: string } {
  const redirect = typeof search.redirect === 'string' ? search.redirect : ''
  return { redirect: redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : undefined }
}

export const Route = createFileRoute('/login')({
  validateSearch,
  beforeLoad: async () => {
    requirePlatformSurface('/login')
    await requireAnonymous()
  },
  component: ConsoleSignInPage,
})

const schema = z.object({
  email: z.email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password'),
})

type SignInValues = z.infer<typeof schema>

/**
 * The console sign-in door.
 *
 * Business owners and staff enter here from the marketing site; platform
 * administrators are sent to their own host. Customers are not turned away —
 * their account is valid — but their bookings, stamps and appointments live
 * inside the business they belong to, so the page explains where to go instead
 * of dropping them on a page with nothing on it.
 */
function ConsoleSignInPage() {
  const { redirect } = Route.useSearch()
  const navigate = useNavigate()
  const router = useRouter()
  const { signIn } = useAuth()
  const [failure, setFailure] = useState<{ message: string; unverifiedEmail?: string } | null>(
    null,
  )
  const [customerNotice, setCustomerNotice] = useState(false)

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
    setCustomerNotice(false)
    try {
      const response = await signIn(values)
      const role = response.user.role

      if (role === 'Customer') {
        setCustomerNotice(true)
        return
      }

      if (redirect) {
        router.history.push(redirect)
        return
      }

      const landing = destinationForRole(role, resolveSurface().kind === 'tenant')
      if (landing.kind === 'external') {
        window.location.assign(landing.href)
        return
      }
      await navigate({ to: landing.to, replace: true })
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
    <AuthShell>
      <p className="eyebrow">Business console</p>
      <h1 className="display mt-[0.4rem] text-title">Sign in to Punched</h1>
      <p className="mt-[0.4rem] text-meta text-muted">
        Owners, managers and staff sign in here. Your console follows your role.
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

      {customerNotice ? (
        <Alert tone="info" className="mt-[1.1rem]" title="This is a customer account">
          Your bookings, stamps and appointments live on the page of the business you belong to.
          Open that business&rsquo;s address and sign in from there.{' '}
          <Link to="/auth/sign-in" className="link font-semibold">
            Use the customer sign-in instead
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

        <Field
          label="Password"
          htmlFor="password"
          error={errors.password?.message}
          hint={
            <Link to="/auth/forgot-password" className="link">
              Forgot your password?
            </Link>
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
        Don&rsquo;t have a workspace yet?{' '}
        <Link to="/register" className="link font-semibold">
          Register your business
        </Link>
      </p>
    </AuthShell>
  )
}
