import { useId } from 'react'
import type { ReactNode } from 'react'
import { Check } from 'lucide-react'
import { formatDuration, money } from '../../lib/format'
import { cn } from '../../lib/cn'
import { Button } from './button'
import { Portal } from './portal'
import { useOverlay } from './use-overlay'

export type BookingConfirmationService = {
  id?: string
  name: ReactNode
  duration?: number
  price?: number
}

export type BookingConfirmationProps = {
  open: boolean
  onClose: () => void
  date: ReactNode
  time: ReactNode
  services: readonly BookingConfirmationService[]
  total: number
  currency?: string
  customerName?: ReactNode
  title?: ReactNode
  description?: ReactNode
  confirmLabel?: string
  onConfirm?: () => void
  closeOnConfirm?: boolean
  className?: string
}

/**
 * Success dialog shown after a booking. The ticket mirrors the confirmation
 * sheet in the Clients design and uses a dashed tear line instead of an image.
 */
export function BookingConfirmation({
  open,
  onClose,
  date,
  time,
  services,
  total,
  currency = 'KES',
  customerName,
  title = 'Booking confirmed',
  description,
  confirmLabel = 'View appointments',
  onConfirm,
  closeOnConfirm = true,
  className,
}: BookingConfirmationProps) {
  const titleId = useId()
  const descriptionId = useId()
  const panelRef = useOverlay<HTMLDivElement>(open, onClose)

  if (!open) return null

  const details =
    description ??
    (customerName ? (
      <>{customerName} will receive a confirmation.</>
    ) : (
      'The appointment has been added to the calendar.'
    ))

  return (
    <Portal>
      <button
        type="button"
        className="scrim"
        aria-label="Close confirmation"
        tabIndex={-1}
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        className={cn(
          'dialog max-h-[calc(100dvh-2rem)] overflow-y-auto text-center focus:outline-none',
          className,
        )}
      >
        <div className="mx-auto grid size-14 shrink-0 place-items-center rounded-round bg-success-soft text-success-ink">
          <Check className="size-7" strokeWidth={2.6} aria-hidden="true" />
        </div>

        <h2
          id={titleId}
          className="mt-[0.8rem] text-sheet font-bold tracking-snug text-fg"
        >
          {title}
        </h2>
        <p id={descriptionId} className="mt-[0.2rem] text-meta text-muted">
          {details}
        </p>

        <div className="mt-[1rem] overflow-hidden rounded-lg border border-line bg-surface text-left">
          <div className="grid grid-cols-2 divide-x divide-line">
            <div className="min-w-0 p-[0.8rem]">
              <p className="text-caption tracking-caps text-muted uppercase">
                Date
              </p>
              <p className="mt-[0.15rem] truncate font-semibold">{date}</p>
            </div>
            <div className="min-w-0 p-[0.8rem]">
              <p className="text-caption tracking-caps text-muted uppercase">
                Time
              </p>
              <p className="mt-[0.15rem] truncate font-semibold tabular">
                {time}
              </p>
            </div>
          </div>

          <div className="border-t border-dashed border-line p-[0.8rem]">
            <ul className="flex flex-col gap-[0.35rem] text-meta">
              {services.map((service, index) => (
                <li
                  key={service.id ?? index}
                  className="flex items-baseline justify-between gap-4"
                >
                  <span className="min-w-0">
                    <span className="font-medium">{service.name}</span>
                    {service.duration !== undefined ? (
                      <span className="text-muted">
                        {' '}
                        · {formatDuration(service.duration)}
                      </span>
                    ) : null}
                  </span>
                  {service.price !== undefined ? (
                    <span className="shrink-0 tabular">
                      {money(service.price, currency)}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>

            <div className="mt-[0.6rem] flex items-baseline justify-between gap-4 border-t border-line pt-[0.55rem]">
              <b>Total</b>
              <b className="tabular">{money(total, currency)}</b>
            </div>
          </div>
        </div>

        <Button
          variant="primary"
          className="mt-[1rem] w-full"
          onClick={() => {
            onConfirm?.()
            if (closeOnConfirm) onClose()
          }}
        >
          {confirmLabel}
        </Button>
      </div>
    </Portal>
  )
}
