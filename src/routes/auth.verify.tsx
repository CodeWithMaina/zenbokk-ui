import { zodResolver } from '@hookform/resolvers/zod'
import { createFileRoute, Link, useNavigate, useRouter } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Alert } from '../components/ui/alert'
import { Button } from '../components/ui/button'
import { Field, Input } from '../components/ui/field'
import { ApiError, errorMessage } from '../lib/api/client'
import { authApi, useAuth } from '../lib/auth'
import { homePathForRole, requireAnonymous } from '../lib/auth/guards'

type VerifySearch = { email?: string; redirect?: string }

function validateSearch(search: Record<string, unknown>): VerifySearch {
  const email = typeof search.email === 'string' ? search.email.trim() : ''
  const redirect = typeof search.redirect === 'string' ? search.redirect : ''
  return {
    email: email || undefined,
    redirect: redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : undefined,
  }
}

export const Route = createFileRoute('/auth/verify')({
  validateSearch,
  beforeLoad: async () => {
    await requireAnonymous()
  },
  component: VerifyEmailPage,
})

const schema = z.object({
  email: z.email('Enter a valid email address'),
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Enter the six-digit code from your email'),
})

type VerifyValues = z.infer<typeof schema>

const RESEND_COOLDOWN_SECONDS = 30

function VerifyEmailPage() {
  const search = Route.useSearch()
  const navigate = useNavigate()
  const router = useRouter()
  const { completeVerification } = useAuth()
  const [failure, setFailure] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [isResending, setIsResending] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<VerifyValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: search.email ?? '', code: '' },
  })

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = window.setTimeout(() => setCooldown((value) => value - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [cooldown])

  const onSubmit = handleSubmit(async (values) => {
    setFailure(null)
    setNotice(null)
    try {
      const session = await completeVerification({
        email: values.email.trim(),
        code: values.code.trim(),
      })

      if (search.redirect) {
        // A booking draft or other deep link — push it verbatim after verifying.
        router.history.push(search.redirect)
        return
      }
      await navigate({ to: homePathForRole(session.user.role), replace: true })
    } catch (error) {
      if (error instanceof ApiError && error.code === 'CODE_EXPIRED') {
        setFailure('That code has expired. Request a fresh one below.')
        return
      }
      if (error instanceof ApiError && error.code === 'INVALID_VERIFICATION_CODE') {
        setFailure('That code is not right. Check the email and try again.')
        return
      }
      setFailure(errorMessage(error, 'We could not confirm your email. Try again.'))
    }
  })

  const onResend = async () => {
    const email = getValues('email')?.trim()
    if (!email) {
      setFailure('Enter the email address you signed up with first.')
      return
    }

    setFailure(null)
    setNotice(null)
    setIsResending(true)
    try {
      const response = await authApi.requestEmailVerification({ email })
      setNotice(response.message || 'A new code is on its way.')
      setCooldown(RESEND_COOLDOWN_SECONDS)
    } catch (error) {
      setFailure(errorMessage(error, 'We could not resend the code. Try again shortly.'))
    } finally {
      setIsResending(false)
    }
  }

  return (
    <div>
      <p className="eyebrow">One last step</p>
      <h1 className="display mt-[0.4rem] text-title">Confirm your email</h1>
      <p className="mt-[0.4rem] text-meta text-muted">
        We sent a six-digit code to the address you signed up with. It expires in
        10 minutes.
      </p>

      {search.email ? (
        <p className="mt-[0.75rem] text-meta">
          Waiting on <span className="font-semibold">{search.email}</span>
        </p>
      ) : null}

      {failure ? (
        <Alert tone="danger" className="mt-[1.1rem]">
          {failure}
        </Alert>
      ) : null}

      {notice ? (
        <Alert tone="success" className="mt-[1.1rem]" onDismiss={() => setNotice(null)}>
          {notice}
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
          label="Verification code"
          htmlFor="code"
          error={errors.code?.message}
          hint="Six digits, no spaces."
        >
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

        <Button type="submit" variant="primary" size="xl" disabled={isSubmitting}>
          {isSubmitting ? 'Confirming…' : 'Confirm email'}
        </Button>
      </form>

      <div className="mt-[1rem] flex flex-wrap items-center justify-between gap-2 text-meta text-muted">
        <span>Didn’t get the email?</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => void onResend()}
          disabled={isResending || cooldown > 0}
        >
          {isResending
            ? 'Sending…'
            : cooldown > 0
              ? `Resend in ${cooldown}s`
              : 'Send a new code'}
        </Button>
      </div>

      <p className="mt-[1.2rem] text-center text-meta text-muted">
        Wrong address?{' '}
        <Link
          to="/auth/sign-up"
          search={{ redirect: search.redirect }}
          className="link font-semibold"
        >
          Start again
        </Link>
      </p>
    </div>
  )
}
