import { MessageSquare } from 'lucide-react'
import { cn } from '../../lib/cn'
import { formatDateTime, money } from '../../lib/format'

export type MpesaMessageProps = {
  /**
   * The confirmation the customer pasted, exactly as they sent it. Rendered verbatim —
   * line breaks included — because the owner is checking the message, not our summary of it.
   * Null when no message was submitted (e.g. a Daraja row with no pasted text).
   */
  message: string | null
  /** The receipt the server parsed out of the message, highlighted inside the text. */
  transactionCode?: string | null
  /** What the message says was paid (server-parsed). Null when it could not be read. */
  amount?: number | null
  currency?: string
  /** The date/time the message itself stated. */
  transactionAt?: string | null
  /** The payee the message named, when it could be read. */
  recipient?: string | null
  /** The payer the message named, when it could be read. */
  payer?: string | null
  /** Business name for the SMS header. */
  businessName?: string | null
  className?: string
}

/**
 * The customer's M-PESA confirmation, rendered as the SMS it is.
 *
 * A claim is a message a person copied off their phone, so it is shown inside a message
 * bubble with a network header — not flattened into a generic card of key/value rows. The
 * distinction matters operationally: the owner is looking for the transaction code and the
 * amount inside familiar text, and a tidy table tempts them to trust our parse instead.
 *
 * Everything shown here is either the message verbatim or a value the *server* extracted
 * from it. When a value could not be read, it is shown as "Not found" — never guessed.
 */
export function MpesaMessage({
  message,
  transactionCode,
  amount,
  currency = 'KES',
  transactionAt,
  recipient,
  payer,
  businessName,
  className,
}: MpesaMessageProps) {
  return (
    <div className={cn('mx-auto w-full max-w-[32rem]', className)}>
      {/* The phone frame: a quiet sunken well around a raised bubble. */}
      <div className="rounded-card border border-line bg-sunken p-[0.7rem]">
        <div className="flex items-center justify-between gap-[0.5rem] px-[0.15rem] pb-[0.5rem]">
          <span className="inline-flex items-center gap-[0.35rem] text-caption font-semibold text-muted">
            <MessageSquare className="size-3.5" aria-hidden="true" />
            SMS
          </span>
          <span className="text-caption text-subtle">
            {businessName ? `M-PESA · ${businessName}` : 'M-PESA'}
          </span>
        </div>

        <div className="rounded-card rounded-tl-none border border-line bg-surface p-[0.9rem] shadow-sm">
          {message ? (
            <p className="m-0 font-mono text-meta leading-relaxed whitespace-pre-wrap break-words text-fg">
              <HighlightedMessage text={message} code={transactionCode ?? null} />
            </p>
          ) : (
            <p className="m-0 text-meta text-muted">
              No message was submitted with this claim. The payment was recorded without one (for
              example a provider callback), so there is nothing to read back.
            </p>
          )}
        </div>

        <dl className="mt-[0.7rem] grid grid-cols-2 gap-[0.5rem] px-[0.15rem] text-caption sm:grid-cols-3">
          <Fact label="Amount in message" value={amount != null ? money(amount, currency) : 'Not found'} />
          <Fact label="Transaction code" value={transactionCode ?? 'Not found'} mono />
          <Fact label="Transaction time" value={transactionAt ? formatDateTime(transactionAt) : 'Not found'} />
          {recipient ? <Fact label="Paid to" value={recipient} /> : null}
          {payer ? <Fact label="Paid by" value={payer} /> : null}
        </dl>
      </div>
    </div>
  )
}

/** One labelled fact under the bubble. */
function Fact({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-caption text-subtle">{label}</dt>
      <dd className={cn('m-0 truncate font-medium text-fg', mono && 'font-mono tracking-wide')}>
        {value}
      </dd>
    </div>
  )
}

/**
 * The message with the transaction code marked, so the owner can find it among the text
 * without hunting. Only the exact code the server parsed is marked; if the message is not
 * the source of that code, the text is rendered untouched.
 */
function HighlightedMessage({ text, code }: { text: string; code: string | null }) {
  const needle = code?.trim()
  if (!needle) return <>{text}</>

  const lowerText = text.toLowerCase()
  const lowerNeedle = needle.toLowerCase()
  const parts: Array<{ text: string; mark: boolean }> = []

  let cursor = 0
  let index = lowerText.indexOf(lowerNeedle, cursor)

  while (index !== -1) {
    if (index > cursor) parts.push({ text: text.slice(cursor, index), mark: false })
    parts.push({ text: text.slice(index, index + needle.length), mark: true })
    cursor = index + needle.length
    index = lowerText.indexOf(lowerNeedle, cursor)
  }

  if (cursor < text.length) parts.push({ text: text.slice(cursor), mark: false })

  return (
    <>
      {parts.map((part, position) =>
        part.mark ? (
          <mark
            key={position}
            className="rounded-[0.2rem] bg-accent-soft px-[0.15rem] font-semibold text-accent-ink"
          >
            {part.text}
          </mark>
        ) : (
          <span key={position}>{part.text}</span>
        ),
      )}
    </>
  )
}
