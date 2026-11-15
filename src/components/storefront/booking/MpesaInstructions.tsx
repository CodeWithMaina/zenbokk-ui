import { Check, ChevronRight, Copy, ShieldCheck } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { money } from '../../../lib/format'
import type { PublicPaymentDetails } from '../../../lib/payments/api'
import { MANUAL_MPESA, normaliseMethod, type ManualMpesaMethod } from '../../../lib/payments/validation'

/**
 * How to pay this business by M-PESA: PayBill, Till, or Send Money to a phone number.
 *
 * It renders its own card. If a caller already wraps it in one, drop that wrapper so
 * there is not a double border.
 *
 * Rendered in the booking wizard (before the appointment exists) and on the
 * confirmation screen (after it does). It is one component in both places on purpose:
 * a divergence between "what I was told to pay" and "what I am told to pay" is the
 * kind of bug that costs a customer money.
 *
 * Everything it shows comes from `details`, which the server has already narrowed to
 * the ONE active, enabled, complete method. The client never decides which method is
 * active and never computes the amount.
 */

type Field = { id: string; label: string; display: string; copy: string }

const METHODS: Record<ManualMpesaMethod, { name: string; path: string[] }> = {
  paybill: { name: 'PayBill', path: ['M-PESA', 'Lipa na M-PESA', 'Pay Bill'] },
  till: { name: 'Till', path: ['M-PESA', 'Lipa na M-PESA', 'Buy Goods and Services'] },
  send_money: { name: 'Send Money', path: ['M-PESA', 'Send Money'] },
}

/** `254712440001` → `0712 440 001` (the grouped form the customer reads). */
function toLocalPhone(raw: string): string {
  const d = raw.replace(/\D/g, '')
  if (d.startsWith('254') && d.length === 12) return `0${d.slice(3)}`
  if (d.length === 9) return `0${d}`
  return d
}

/** The method + the rows to show, from a server-narrowed payload. */
function resolveMethod(details: PublicPaymentDetails): { method: ManualMpesaMethod; fields: Field[] } {
  const method = normaliseMethod(details.accountType)
  const fields: Field[] = []
  const add = (id: string, label: string, value: string | null | undefined, copy?: string) => {
    const v = (value ?? '').trim()
    if (v) fields.push({ id, label, display: v, copy: copy ?? v })
  }

  if (method === MANUAL_MPESA.paybill) {
    add('paybill', 'Business number', details.paybillNumber)
    add('account', 'Account number', details.paybillAccount)
  } else if (method === MANUAL_MPESA.till) {
    add('till', 'Till number', details.tillNumber)
  } else if (method === MANUAL_MPESA.sendMoney) {
    const local = toLocalPhone(details.phoneNumber ?? '')
    if (local) {
      const grouped = `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}`.trim()
      // Display grouped, copy the plain digits the keypad wants.
      fields.push({ id: 'phone', label: 'M-PESA number', display: grouped, copy: local })
    }
  }

  return { method, fields }
}

/**
 * Copy through the Clipboard API, with a fallback for insecure contexts and denied
 * permissions (where `navigator.clipboard` is unavailable or rejects).
 */
async function copyText(value: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value)
      return true
    }
  } catch {
    // fall through to the execCommand fallback
  }
  try {
    const textarea = document.createElement('textarea')
    textarea.value = value
    textarea.setAttribute('readonly', '')
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    const ok = document.execCommand('copy')
    textarea.remove()
    return ok
  } catch {
    return false
  }
}

/* -------------------------------------------------------------------------- */

function CopyButton({ label, copied, onCopy }: { label: string; copied: boolean; onCopy: () => void }) {
  return (
    <button
      type="button"
      onClick={onCopy}
      aria-label={`Copy ${label}`}
      className={
        'inline-flex h-control-sm min-w-[5.4rem] shrink-0 items-center justify-center gap-[0.35rem] ' +
        'rounded-md border px-[0.8rem] text-meta font-semibold transition-colors duration-200 ' +
        'focus-visible:shadow-ring focus-visible:outline-none [@media(pointer:coarse)]:min-h-[44px] ' +
        (copied
          ? 'border-success-line bg-success-soft text-success-ink'
          : 'border-line bg-surface text-fg hover:bg-hover active:bg-pressed')
      }
    >
      {copied ? <Check className="size-3.5" aria-hidden="true" /> : <Copy className="size-3.5" aria-hidden="true" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

/**
 * One detail, one row: label above, the value large in monospace, copy on the right.
 * Large because the customer reads it off this screen and types it on a keypad, and a
 * mistyped number sends money to a stranger.
 */
function DetailRow({ field, copied, onCopy }: { field: Field; copied: boolean; onCopy: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 px-[0.9rem] py-[0.7rem]">
      <div className="min-w-0">
        <dt className="text-caption text-muted">{field.label}</dt>
        <dd className="m-0 break-all font-mono text-heading font-semibold tracking-wide tabular">
          {field.display}
        </dd>
      </div>
      <CopyButton label={field.label} copied={copied} onCopy={onCopy} />
    </div>
  )
}

function Step({ n, children }: { n?: number; children: ReactNode }) {
  return (
    <li className="flex gap-[0.7rem]">
      {n !== undefined ? (
        <span
          aria-hidden="true"
          className="mt-[0.1rem] grid size-[1.4rem] shrink-0 place-items-center rounded-round bg-accent-soft text-caption font-bold text-accent-ink"
        >
          {n}
        </span>
      ) : null}
      <div className="min-w-0 flex-1 text-meta text-fg">{children}</div>
    </li>
  )
}


/* -------------------------------------------------------------------------- */

export type MpesaInstructionsProps = {
  details: PublicPaymentDetails
  /** The amount to send right now. Always the server's figure. */
  amount: number
  /** The full booking total, shown only when it differs from `amount`. */
  serviceTotal?: number
  /** Number the steps and show the M-PESA menu path. Off when the caller explains them itself. */
  showSteps?: boolean
  className?: string
}

export function MpesaInstructions({
  details,
  amount,
  serviceTotal,
  showSteps = true,
  className = '',
}: MpesaInstructionsProps) {
  const { method, fields } = resolveMethod(details)
  const config = METHODS[method]

  // One state for the whole card, so only the most recent copy shows "Copied".
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  async function copy(id: string, value: string) {
    const ok = await copyText(value)
    if (!ok) return
    setCopiedId(id)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setCopiedId(null), 2000)
  }

  const amountField: Field = { id: 'amount', label: 'Amount', display: String(amount), copy: String(amount) }
  const partial = serviceTotal !== undefined && serviceTotal !== amount
  const n = (i: number) => (showSteps ? i : undefined)

  // Nothing to pay to yet: say so, rather than render empty number rows. This is also
  // the safe branch for an unknown `accountType` from an older client.
  if (fields.length === 0) {
    return (
      <div className={`rounded-card border border-line bg-surface p-card ${className}`}>
        <p className="text-meta text-muted">
          This business hasn’t finished setting up M-PESA payments. Please contact them to arrange
          payment.
        </p>
      </div>
    )
  }

  let step = 0

  return (
    <div className={`overflow-hidden rounded-card border border-line bg-surface ${className}`}>
      {/* Header: what to pay, and by which route */}
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-[0.4rem] border-b border-line bg-sunken px-[0.9rem] py-[0.8rem]">
        <div>
          <span className="inline-flex items-center rounded-pill bg-accent-soft px-[0.6rem] py-[0.15rem] text-pill font-semibold text-accent-ink">
            M-PESA · {config.name}
          </span>
          <p className="mt-[0.35rem] text-meta text-muted">Booking fee to pay now</p>
        </div>
        <b className="text-metric font-bold tracking-tight tabular">{money(amount)}</b>
      </div>

      <div className="flex flex-col gap-[0.9rem] p-[0.9rem]">
        {partial ? (
          <p className="text-caption text-subtle">
            {money(amount)} of the {money(serviceTotal as number)} total ({details.bookingFeePercentage}%).
            The balance is settled at your appointment.
          </p>
        ) : null}

        {details.instructions ? <p className="text-meta text-fg">{details.instructions}</p> : null}

        <ol className="flex flex-col gap-[0.9rem]">
          {showSteps ? (
            <Step n={n(++step)}>
              <span className="text-muted">On your phone, open</span>
              <span className="mt-[0.35rem] flex flex-wrap items-center gap-[0.2rem]">
                {config.path.map((part, i) => (
                  <span key={part} className="inline-flex items-center gap-[0.2rem]">
                    <b className="rounded-sm bg-sunken px-[0.5rem] py-[0.15rem] font-semibold">{part}</b>
                    {i < config.path.length - 1 ? (
                      <ChevronRight className="size-3.5 text-subtle" aria-hidden="true" />
                    ) : null}
                  </span>
                ))}
              </span>
            </Step>
          ) : null}

          <Step n={n(++step)}>
            <span className="text-muted">
              {showSteps ? 'Enter these details exactly' : 'Payment details'}
            </span>
            <dl className="m-0 mt-[0.4rem] divide-y divide-line overflow-hidden rounded-lg border border-line">
              {fields.map((f) => (
                <DetailRow
                  key={f.id}
                  field={f}
                  copied={copiedId === f.id}
                  onCopy={() => void copy(f.id, f.copy)}
                />
              ))}
              <DetailRow
                field={amountField}
                copied={copiedId === 'amount'}
                onCopy={() => void copy('amount', amountField.copy)}
              />
            </dl>
          </Step>

          {details.payeeName ? (
            <Step n={n(++step)}>
              <span className="flex items-start gap-[0.45rem] rounded-lg bg-success-soft px-[0.7rem] py-[0.55rem] text-success-ink">
                <ShieldCheck className="mt-[0.1rem] size-4 shrink-0" aria-hidden="true" />
                <span>
                  Before you enter your PIN, check the name shown is{' '}
                  <b>“{details.payeeName}”</b>. If it isn’t, cancel.
                </span>
              </span>
            </Step>
          ) : null}

          <Step n={n(++step)}>
            Paste the M-PESA confirmation message you receive below.
            {method === MANUAL_MPESA.sendMoney ? (
              <span className="mt-[0.25rem] block text-caption text-subtle">
                Standard M-PESA send-money charges apply.
              </span>
            ) : null}
          </Step>
        </ol>
      </div>

      {/* Announces copy results to screen readers without moving focus */}
      <span className="sr-only" role="status" aria-live="polite">
        {copiedId ? 'Copied to clipboard' : ''}
      </span>
    </div>
  )
}

