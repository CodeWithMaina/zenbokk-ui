import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { ApiError, errorMessage } from '../../lib/api/client'
import { authApi, useAuth } from '../../lib/auth'
import { businessApi } from '../../lib/business/api'
import { cn } from '../../lib/cn'
import { registerBusinessSchema } from '../../lib/validation/onboarding'
import { PASSWORD_HINT } from '../../lib/validation/password'
import { Alert } from '../ui/alert'
import { Button } from '../ui/button'
import { Field, Input, Textarea } from '../ui/field'

/** The wizard stages, in order. Each validates only its own fields. */
const STEPS = [
  { title: 'Your account', fields: ['fullName', 'email', 'password', 'phoneNumber'] },
  { title: 'Your business', fields: ['businessName', 'businessCategory', 'businessLocation'] },
  {
    title: 'Contact & payouts',
    fields: ['businessPhone', 'businessEmail', 'businessMpesaNumber', 'businessDescription'],
  },
  { title: 'Review', fields: [] },
] as const

/** Which half of the onboarding the form is in. */
type Phase = 'details' | 'verify'

const RESEND_COOLDOWN_SECONDS = 30

export type BusinessRegisterFormProps = {
  /** Called once the account exists, is verified and the business is created. */
  onComplete: () => void
}

/**
 * Owner + business onboarding.
 *
 * Two phases, because the API has two steps and no combined endpoint: public
 * registration creates **customer** accounts only (RegisterRequestValidator
 * enforces role === Customer), and an owner is made by creating a business. So
 * this collects everything, registers the account, verifies the email (which
 * signs the owner in), then creates the business - which promotes them to Owner
 * - and refreshes the session so the token carries the new persona before the
 * dashboard loads.
 */
export function BusinessRegisterForm({ onComplete }: BusinessRegisterFormProps) {
  const { completeVerification, syncSession } = useAuth()
  const [stage, setStage] = useState(0)
  const [phase, setPhase] = useState<Phase>('details')
  const [failure, setFailure] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [isWorking, setIsWorking] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  /** The six-digit code. Outside the RHF form: it is not part of the schema. */
  const [codeInput, setCodeInput] = useState('')

  const {
    register,
    handleSubmit,
    trigger,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(registerBusinessSchema),
    mode: 'onTouched',
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      phoneNumber: '',
      businessName: '',
      businessCategory: '',
      businessLocation: '',
      businessPhone: '',
      businessEmail: '',
      businessMpesaNumber: '',
      businessDescription: '',
    },
  })

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = window.setTimeout(() => setCooldown((value) => value - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [cooldown])

  const isLastStage = stage === STEPS.length - 1
  const busy = isSubmitting || isWorking

  async function next() {
    setFailure(null)
    const fields = STEPS[stage].fields
    const valid = fields.length === 0 ? true : await trigger([...fields])
    if (!valid) return
    setStage((current) => Math.min(current + 1, STEPS.length - 1))
  }
  /** Phase 1: create the account and ask for the verification code. */
  const onSubmitDetails = handleSubmit(async (values) => {
    setFailure(null)
    try {
      await authApi.register({
        fullName: values.fullName,
        email: values.email,
        password: values.password,
        // Public registration is customer-only; the owner persona comes from
        // creating the business in phase 2.
        role: 'Customer',
      })
      setPhase('verify')
    } catch (error) {
      if (error instanceof ApiError && error.code === 'EMAIL_ALREADY_REGISTERED') {
        setFailure(
          'An account already exists for this email address. Sign in instead — if you already own a business, your workspace is waiting.',
        )
        return
      }
      setFailure(
        errorMessage(error, 'We could not create your account. Check the details and try again.'),
      )
    }
  })

  /**
   * Phase 2: verify the email (which signs the owner in), then create the
   * business and refresh the session so the token carries the Owner persona.
   */
  async function submitCode(code: string) {
    setFailure(null)
    setNotice(null)
    setIsWorking(true)
    const values = getValues()

    try {
      await completeVerification({ email: values.email, code })
    } catch (error) {
      setIsWorking(false)
      if (error instanceof ApiError && error.code === 'CODE_EXPIRED') {
        setFailure('That code has expired. Request a fresh one below.')
        return
      }
      if (error instanceof ApiError && error.code === 'INVALID_VERIFICATION_CODE') {
        setFailure('That code is not right. Check the email and try again.')
        return
      }
      setFailure(errorMessage(error, 'We could not confirm your email. Try again.'))
      return
    }

    // The account exists and is verified from here on. Everything below is
    // recoverable on its own, so a failure must not read as registration failing.
    try {
      await businessApi.create({
        name: values.businessName,
        category: values.businessCategory,
        location: values.businessLocation,
        phoneNumber: values.businessPhone || null,
        email: values.businessEmail || null,
        description: values.businessDescription || null,
        mpesaNumber: values.businessMpesaNumber,
      })
    } catch (error) {
      if (error instanceof ApiError && error.code === 'BUSINESS_EXISTS') {
        // Already an owner: nothing to create, just adopt the new persona.
        await syncSession()
        onComplete()
        return
      }
      setIsWorking(false)
      setFailure(
        errorMessage(
          error,
          'Your account is ready, but we could not create the workspace. Try again below.',
        ),
      )
      return
    }

    // Non-fatal: the phone number lives on the profile, not the business.
    if (values.phoneNumber) {
      try {
        await authApi.updateProfile({ phoneNumber: values.phoneNumber })
      } catch {
        // The workspace exists; a missing phone number is not worth blocking on.
      }
    }

    // Re-mint tokens so the session carries the Business role before /dashboard.
    await syncSession()
    onComplete()
  }

  function onVerifySubmit() {
    const code = codeInput.trim()
    if (!/^\d{6}$/.test(code)) {
      setFailure('Enter the six-digit code from your email.')
      return
    }
    void submitCode(code)
  }

  async function onResend() {
    const email = getValues('email')
    if (!email) return
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
  // Phase 2: verify the email, then create the workspace.
  if (phase === 'verify') {
    return (
      <form className="flex flex-col gap-[1.1rem]" onSubmit={onVerifySubmit} noValidate>
        <div className="flex flex-col gap-[0.35rem]">
          <p className="eyebrow">One last step</p>
          <p className="text-meta text-muted">
            We sent a six-digit code to <b className="font-semibold text-fg">{getValues('email')}</b>
            . Confirming it creates{' '}
            <b className="font-semibold text-fg">{getValues('businessName')}</b> and signs you in as
            its owner.
          </p>
        </div>

        {failure ? <Alert tone="danger">{failure}</Alert> : null}
        {notice ? (
          <Alert tone="success" onDismiss={() => setNotice(null)}>
            {notice}
          </Alert>
        ) : null}

        <Field
          label="Verification code"
          htmlFor="code"
          hint="Six digits, no spaces. It expires in 10 minutes."
        >
          <Input
            id="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="123456"
            className="tracking-[0.35em] tabular"
            value={codeInput}
            onChange={(event) => setCodeInput(event.target.value.replace(/\D/g, ''))}
            disabled={busy}
          />
        </Field>

        <Button type="submit" variant="primary" size="xl" disabled={busy}>
          {isWorking ? 'Creating your workspace…' : 'Confirm and create workspace'}
        </Button>

        <div className="flex flex-wrap items-center justify-between gap-2 text-meta text-muted">
          <span>Didn&rsquo;t get the email?</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void onResend()}
            disabled={isResending || cooldown > 0 || busy}
          >
            {isResending ? 'Sending…' : cooldown > 0 ? `Resend in ${cooldown}s` : 'Send a new code'}
          </Button>
        </div>
      </form>
    )
  }

  // Phase 1: collect the account and the business details.
  return (
    <form className="flex flex-col gap-[1.1rem]" onSubmit={onSubmitDetails} noValidate>
      <ol className="flex list-none flex-wrap items-center gap-x-[0.4rem] gap-y-[0.3rem] p-0">
        {STEPS.map((step, index) => {
          const done = index < stage
          const current = index === stage
          return (
            <li key={step.title} className="flex items-center gap-[0.4rem]">
              <span
                aria-current={current ? 'step' : undefined}
                className={cn(
                  'flex items-center gap-[0.35rem] rounded-pill px-[0.6rem] py-[0.25rem] text-caption font-semibold',
                  current ? 'bg-accent-soft text-accent-ink' : done ? 'text-muted' : 'text-subtle',
                )}
              >
                {done ? (
                  <Check className="size-[0.75rem]" aria-hidden="true" />
                ) : (
                  <span className="tabular">{index + 1}</span>
                )}
                {step.title}
              </span>
              {index < STEPS.length - 1 ? (
                <span aria-hidden="true" className="text-line-strong">
                  .
                </span>
              ) : null}
            </li>
          )
        })}
      </ol>

      {failure ? <Alert tone="danger">{failure}</Alert> : null}

      {stage === 0 ? (
        <div className="flex flex-col gap-[0.9rem]">
          <Field label="Your full name" htmlFor="fullName" error={errors.fullName?.message}>
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
              placeholder="owner@example.com"
              invalid={!!errors.email}
              {...register('email')}
            />
          </Field>
          <Field
            label="Password"
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
          <Field
            label="Phone number"
            htmlFor="phoneNumber"
            error={errors.phoneNumber?.message}
            optional
          >
            <Input
              id="phoneNumber"
              type="tel"
              autoComplete="tel"
              placeholder="+254700000000"
              invalid={!!errors.phoneNumber}
              {...register('phoneNumber')}
            />
          </Field>
        </div>
      ) : null}

      {stage === 1 ? (
        <div className="flex flex-col gap-[0.9rem]">
          <Field label="Business name" htmlFor="businessName" error={errors.businessName?.message}>
            <Input
              id="businessName"
              placeholder="Nuru Studio"
              invalid={!!errors.businessName}
              {...register('businessName')}
            />
          </Field>
          <Field
            label="Category"
            htmlFor="businessCategory"
            error={errors.businessCategory?.message}
            hint="What kind of business is this? Café, salon, gym…"
          >
            <Input
              id="businessCategory"
              placeholder="Café, salon, gym…"
              invalid={!!errors.businessCategory}
              {...register('businessCategory')}
            />
          </Field>
          <Field
            label="Location"
            htmlFor="businessLocation"
            error={errors.businessLocation?.message}
          >
            <Input
              id="businessLocation"
              placeholder="Nairobi"
              invalid={!!errors.businessLocation}
              {...register('businessLocation')}
            />
          </Field>
        </div>
      ) : null}

      {stage === 2 ? (
        <div className="flex flex-col gap-[0.9rem]">
          <Field
            label="Business phone"
            htmlFor="businessPhone"
            error={errors.businessPhone?.message}
            optional
          >
            <Input
              id="businessPhone"
              type="tel"
              placeholder="+254700000001"
              invalid={!!errors.businessPhone}
              {...register('businessPhone')}
            />
          </Field>
          <Field
            label="Business email"
            htmlFor="businessEmail"
            error={errors.businessEmail?.message}
            optional
          >
            <Input
              id="businessEmail"
              type="email"
              placeholder="hello@example.com"
              invalid={!!errors.businessEmail}
              {...register('businessEmail')}
            />
          </Field>
          <Field
            label="M-Pesa number"
            htmlFor="businessMpesaNumber"
            error={errors.businessMpesaNumber?.message}
            hint="Where payments for your services are received."
          >
            <Input
              id="businessMpesaNumber"
              type="tel"
              placeholder="+254700000002"
              invalid={!!errors.businessMpesaNumber}
              {...register('businessMpesaNumber')}
            />
          </Field>
          <Field
            label="Description"
            htmlFor="businessDescription"
            error={errors.businessDescription?.message}
            optional
          >
            <Textarea
              id="businessDescription"
              rows={3}
              placeholder="Tell customers what makes your business special…"
              invalid={!!errors.businessDescription}
              {...register('businessDescription')}
            />
          </Field>
        </div>
      ) : null}

      {isLastStage ? (
        <div className="rounded-panel bg-forest p-[1.2rem] text-on-forest">
          <p className="punch-eyebrow text-on-forest/70">Ready to create</p>
          <p className="punch-display mt-[0.4rem] text-[1.6rem] leading-none">
            {getValues('businessName') || 'Your business'}
          </p>
          <dl className="mt-[1rem] grid gap-x-[1.2rem] gap-y-[0.5rem] text-meta sm:grid-cols-2">
            {[
              ['Owner', getValues('fullName')],
              ['Owner email', getValues('email')],
              ['Category', getValues('businessCategory')],
              ['Location', getValues('businessLocation')],
              ['Business phone', getValues('businessPhone')],
              ['M-Pesa number', getValues('businessMpesaNumber')],
            ].map(([label, value]) => (
              <div key={label} className="min-w-0">
                <dt className="text-[0.78rem] text-on-forest/70">{label}</dt>
                <dd className="truncate">{value || '-'}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-[1rem] text-[0.8rem] leading-relaxed text-on-forest/80">
            We&rsquo;ll email {getValues('email') || 'your address'} a six-digit code. Confirming it
            creates the workspace and signs you in as its owner.
          </p>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-[0.6rem]">
        <Button
          variant="ghost"
          onClick={() => setStage((current) => Math.max(current - 1, 0))}
          disabled={stage === 0 || busy}
          className="max-sm:flex-1"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back
        </Button>

        {isLastStage ? (
          <Button type="submit" variant="primary" size="xl" disabled={busy} className="max-sm:flex-1">
            {isSubmitting ? 'Creating account…' : 'Create account'}
          </Button>
        ) : (
          <Button variant="primary" size="xl" onClick={() => void next()} className="max-sm:flex-1">
            Continue
            <ArrowRight className="size-4" aria-hidden="true" />
          </Button>
        )}
      </div>
    </form>
  )
}
