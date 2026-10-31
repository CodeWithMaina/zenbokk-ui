import { useId } from 'react'
import type { ReactNode } from 'react'
import { Minus, Plus } from 'lucide-react'
import { clamp } from '../../lib/format'
import { cn } from '../../lib/cn'
import { Button } from './button'
import { Field, Input } from './field'
import { Note } from './note'

export type StampAdjusterProps = {
  /** Stamps currently saved on the client record. */
  savedStamps: number
  /** Draft stamp count, controlled by the page. */
  value: number
  onValueChange: (value: number) => void
  goal?: number
  reason: string
  onReasonChange: (reason: string) => void
  onSave: () => void
  /** Defaults to restoring `savedStamps` through `onValueChange`. */
  onReset?: () => void
  saving?: boolean
  /**
   * The API requires a reason for every manual action (`loyalty` module). When
   * true the field is no longer marked optional and Save waits for it.
   */
  reasonRequired?: boolean
  title?: ReactNode
  description?: ReactNode
  reasonLabel?: ReactNode
  reasonPlaceholder?: string
  saveLabel?: string
  resetLabel?: string
  className?: string
}

/**
 * Manual stamp stepper from the client loyalty tab. The delta is always shown
 * against the saved total so it is clear what will be written on save.
 */
export function StampAdjuster({
  savedStamps,
  value,
  onValueChange,
  goal = 8,
  reason,
  onReasonChange,
  onSave,
  onReset,
  saving = false,
  reasonRequired = false,
  title = 'Adjust stamps',
  description = 'Add or remove stamps by hand. Every change is logged in Activity.',
  reasonLabel = 'Reason',
  reasonPlaceholder = 'e.g. Missed stamp from 12 Oct',
  saveLabel = 'Save changes',
  resetLabel = 'Reset',
  className,
}: StampAdjusterProps) {
  const titleId = useId()
  const reasonId = useId()
  const total = Math.max(1, Math.floor(goal))
  const saved = clamp(Math.floor(savedStamps), 0, total)
  const current = clamp(Math.floor(value), 0, total)
  const delta = current - saved
  const dirty = delta !== 0
  const blockedByReason = reasonRequired && reason.trim().length === 0

  const reset = () => {
    if (onReset) onReset()
    else onValueChange(saved)
  }

  const status =
    delta === 0
      ? current >= total
        ? 'Reward ready to redeem'
        : `${total - current} to the next reward`
      : `${delta > 0 ? '+' : ''}${delta} pending · ${saved} to ${current}`

  return (
    <section
      aria-labelledby={titleId}
      className={cn('card p-[1.1rem]', className)}
    >
      <h2 id={titleId} className="text-heading font-bold tracking-snug">
        {title}
      </h2>
      {description ? (
        <p className="mt-[0.15rem] text-meta text-muted">{description}</p>
      ) : null}

      <div className="mt-[1rem] flex items-center gap-[0.8rem]">
        <Button
          size="icon"
          aria-label="Remove a stamp"
          disabled={saving || current <= 0}
          onClick={() => onValueChange(current - 1)}
          className="size-[2.8rem] shrink-0 rounded-round"
        >
          <Minus className="size-[1.1rem]" aria-hidden="true" />
        </Button>

        <div className="min-w-0 flex-1 text-center">
          <b className="block text-metric leading-none font-bold tabular">
            {current}
          </b>
          <span className="mt-[0.2rem] block text-meta text-muted">
            of {total} stamps
          </span>
        </div>

        <Button
          size="icon"
          aria-label="Add a stamp"
          disabled={saving || current >= total}
          onClick={() => onValueChange(current + 1)}
          className="size-[2.8rem] shrink-0 rounded-round"
        >
          <Plus className="size-[1.1rem]" aria-hidden="true" />
        </Button>
      </div>

      <Note
        className={cn(
          'mt-[0.9rem] px-[0.9rem] py-[0.65rem] text-center',
          dirty && 'border-accent/40 text-fg',
        )}
      >
        {status}
      </Note>

      <Field
        label={reasonLabel}
        optional={!reasonRequired}
        htmlFor={reasonId}
        className="mt-[0.9rem]"
        error={
          blockedByReason && dirty
            ? 'A reason is required for every manual stamp change.'
            : undefined
        }
      >
        <Input
          id={reasonId}
          value={reason}
          placeholder={reasonPlaceholder}
          autoComplete="off"
          disabled={saving}
          onChange={(event) => onReasonChange(event.target.value)}
        />
      </Field>

      <div className="mt-[1rem] flex flex-wrap justify-end gap-[0.5rem]">
        <Button
          onClick={reset}
          disabled={saving || !dirty}
          className="max-sm:flex-1"
        >
          {resetLabel}
        </Button>
        <Button
          variant="primary"
          onClick={onSave}
          disabled={saving || !dirty || blockedByReason}
          className="max-sm:flex-1"
        >
          {saving ? 'Saving…' : saveLabel}
        </Button>
      </div>
    </section>
  )
}
