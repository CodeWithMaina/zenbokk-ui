import { useMutation } from '@tanstack/react-query'
import { ArrowRight, Loader2, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { errorMessage } from '../../../lib/api/client'
import type { GuestSession } from '../../../lib/storefront'
import { guestBookingApi, writeGuestSession } from '../../../lib/storefront'
import { normaliseKenyanPhone } from '../../../lib/validation/contact'
import { Alert } from '../../ui/alert'
import { Button } from '../../ui/button'

export type GuestVerifyPanelProps = {
  businessId: string
  /** Called once the visitor holds a valid, verified token. */
  onVerified: (session: GuestSession) => void
}

/**
 * Verifying a visitor who has no account.
 *
 * Two steps, and the second only becomes reachable once the first has been
 * accepted by the server: give the details, then the code that was emailed to
 * them. Nothing here decides that a booking may proceed — it only proves the
 * visitor controls an inbox, and hands the resulting short-lived token back to
 * the wizard, which then books through the ordinary customer API.
 *
 * Every refusal the server can return is surfaced as its own message, because
 * they mean different things to the person reading them: "the code has expired",
 * "that address already has an account", "wait a moment before asking again".
 */
export function GuestVerifyPanel({ businessId, onVerified }: GuestVerifyPanelProps) {
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [failure, setFailure] = useState<string | null>(null)

  const start = useMutation({
    mutationFn: () =>
      guestBookingApi.start(businessId, {
        fullName: fullName.trim(),
        phoneNumber: normaliseKenyanPhone(phone) ?? phone.trim(),
        email: email.trim(),
      }),
    onSuccess: (response) => {
      setFailure(null)
      setSentTo(response.email)
    },
    onError: (error) => setFailure(errorMessage(error, 'We could not send a code just now.')),
  })

  const verify = useMutation({
    mutationFn: () =>
      guestBookingApi.verify(businessId, {
        phoneNumber: normaliseKenyanPhone(phone) ?? phone.trim(),
        code: code.trim(),
      }),
    onSuccess: (response) => {
      const session: GuestSession = {
        token: response.accessToken,
        expiresAt: Date.now() + response.expiresIn * 1000,
        fullName: response.customer.fullName,
        phoneNumber: response.customer.phoneNumber,
      }
      writeGuestSession(businessId, session)
      setFailure(null)
      onVerified(session)
    },
    onError: (error) => setFailure(errorMessage(error, 'That code was not accepted.')),
  })

  const busy = start.isPending || verify.isPending

  return (
    <div className="rounded-panel border border-line bg-surface p-[1rem]">
      <span className="grid size-[2.2rem] place-items-center rounded-full bg-accent-soft text-accent-ink">
        <ShieldCheck className="size-[1.1rem]" aria-hidden="true" />
      </span>
      <h3 className="sf-heading mt-[0.6rem]">
        {sentTo ? 'Enter your code' : 'Confirm it’s you'}
      </h3>
      <p className="mt-[0.3rem] text-meta text-muted">
        {sentTo
          ? `We sent a 6-digit code to ${sentTo}. It expires in 10 minutes.`
          : 'You don’t need an account. We’ll email you a code to confirm your number.'}
      </p>

      {failure ? (
        <Alert tone="danger" className="mt-[0.9rem]" onDismiss={() => setFailure(null)}>
          {failure}
        </Alert>
      ) : null}

      {sentTo ? (
        <>
          <label className="label mt-[1rem]" htmlFor="guest-code">
            Your code
          </label>
          <input
            id="guest-code"
            className="input"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            placeholder="123456"
            onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
          />

          <div className="mt-[1rem] flex flex-wrap items-center gap-[0.6rem]">
            <Button
              variant="primary"
              disabled={busy || code.trim().length !== 6}
              onClick={() => verify.mutate()}
            >
              {verify.isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <ShieldCheck className="size-4" aria-hidden="true" />
              )}
              Verify and continue
            </Button>
            <Button variant="ghost" disabled={busy} onClick={() => start.mutate()}>
              Send a new code
            </Button>
          </div>

          <button
            type="button"
            className="mt-[0.8rem] text-caption text-muted underline"
            onClick={() => {
              setSentTo(null)
              setCode('')
              setFailure(null)
            }}
          >
            Use a different number
          </button>
        </>
      ) : (
        <>
          <label className="label mt-[1rem]" htmlFor="guest-name">
            Your name
          </label>
          <input
            id="guest-name"
            className="input"
            type="text"
            autoComplete="name"
            value={fullName}
            placeholder="e.g. Peter Chege"
            onChange={(event) => setFullName(event.target.value)}
          />

          <label className="label mt-[0.8rem]" htmlFor="guest-phone">
            Phone number
          </label>
          <input
            id="guest-phone"
            className="input"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={phone}
            placeholder="07XX XXX XXX"
            onChange={(event) => setPhone(event.target.value)}
          />

          <label className="label mt-[0.8rem]" htmlFor="guest-email">
            Email
          </label>
          <input
            id="guest-email"
            className="input"
            type="email"
            autoComplete="email"
            value={email}
            placeholder="you@example.com"
            onChange={(event) => setEmail(event.target.value)}
          />
          <p className="mt-[0.3rem] text-caption text-subtle">
            The code goes here. We never share your details.
          </p>

          <Button
            variant="primary"
            className="mt-[1.1rem] w-full"
            disabled={
              busy ||
              fullName.trim().length < 2 ||
              phone.trim().length === 0 ||
              email.trim().length === 0
            }
            onClick={() => start.mutate()}
          >
            {start.isPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <ArrowRight className="size-4" aria-hidden="true" />
            )}
            Send my code
          </Button>
        </>
      )}
    </div>
  )
}
