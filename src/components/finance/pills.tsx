import { useEffect, useState } from 'react'
import { Check, Copy, Banknote } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '../../lib/cn'
import { paymentStatusDisplay } from '../../lib/finances/status'
import { Badge, StatusPill } from '../ui/badge'

/** Payment status pill: Paid / Pending / Needs verification / Failed / Refunded. */
export function PaymentStatusPill({ status, className }: { status: string; className?: string }) {
  const display = paymentStatusDisplay(status)
  return (
    <StatusPill tone={display.tone} className={className}>
      {display.label}
    </StatusPill>
  )
}

/** Neutral method pill — no status dot; cash shows the banknote glyph, as the design does. */
export function MethodPill({ label, cash = false }: { label: string; cash?: boolean }) {
  return (
    <Badge tone="neutral">
      {cash ? <Banknote className="mr-[0.25rem] size-[0.8rem]" aria-hidden="true" /> : null}
      {label}
    </Badge>
  )
}

/**
 * Copy-to-clipboard with an inline tick. Falls back to a toast when the
 * Clipboard API is unavailable (non-secure contexts).
 */
export function CopyButton({ value, label = 'Copy' }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(false), 1_600)
    return () => window.clearTimeout(timer)
  }, [copied])

  const copy = async () => {
    try {
      if (!navigator.clipboard) throw new Error('Clipboard unavailable')
      await navigator.clipboard.writeText(value)
      setCopied(true)
    } catch {
      toast.error('Copy is not available here')
    }
  }

  return (
    <button
      type="button"
      aria-label={label}
      onClick={(event) => {
        event.stopPropagation()
        void copy()
      }}
      className={cn(
        'grid size-[1.9rem] shrink-0 place-items-center rounded-sm text-subtle transition-colors',
        'hover:bg-sunken hover:text-fg focus-visible:outline-none focus-visible:shadow-ring',
      )}
    >
      {copied ? (
        <Check className="size-[0.9rem] text-accent" aria-hidden="true" />
      ) : (
        <Copy className="size-[0.9rem]" aria-hidden="true" />
      )}
    </button>
  )
}
