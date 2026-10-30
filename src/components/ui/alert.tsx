import {
  CircleCheck,
  CircleX,
  Info,
  TriangleAlert,
  X,
} from 'lucide-react'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from '../../lib/cn'
import type { Tone } from './badge'

const toneClass: Record<Tone, string> = {
  success: 'border-success-line bg-success-soft text-success-ink',
  warning: 'border-warning-line bg-warning-soft text-warning-ink',
  danger: 'border-danger-line bg-danger-soft text-danger-ink',
  info: 'border-info-line bg-info-soft text-info-ink',
  neutral: 'border-neutral-line bg-neutral-soft text-neutral-ink',
}

const toneIcon: Record<Tone, ReactNode> = {
  success: <CircleCheck className="size-4 shrink-0" aria-hidden="true" />,
  warning: <TriangleAlert className="size-4 shrink-0" aria-hidden="true" />,
  danger: <CircleX className="size-4 shrink-0" aria-hidden="true" />,
  info: <Info className="size-4 shrink-0" aria-hidden="true" />,
  neutral: <Info className="size-4 shrink-0" aria-hidden="true" />,
}

export type AlertProps = {
  tone?: Tone
  title?: ReactNode
  children?: ReactNode
  onDismiss?: () => void
  dismissLabel?: string
  className?: string
} & Omit<ComponentProps<'div'>, 'title' | 'children'>

/** Inline status message with a semantic icon and optional dismiss action. */
export function Alert({
  tone = 'neutral',
  title,
  children,
  onDismiss,
  dismissLabel = 'Dismiss',
  className,
  ...props
}: AlertProps) {
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn(
        'flex items-start gap-[0.65rem] rounded-md border px-[0.9rem] py-[0.75rem] text-meta',
        toneClass[tone],
        className,
      )}
      {...props}
    >
      <span className="mt-[0.1rem]">{toneIcon[tone]}</span>
      <div className="min-w-0 flex-1">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? (
          <div className={cn('leading-snug', title && 'mt-[0.15rem]')}>
            {children}
          </div>
        ) : null}
      </div>
      {onDismiss ? (
        <button
          type="button"
          aria-label={dismissLabel}
          onClick={onDismiss}
          className="-mr-[0.3rem] -mt-[0.2rem] grid size-[1.6rem] shrink-0 place-items-center rounded-sm opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:shadow-ring"
        >
          <X className="size-[0.9rem]" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  )
}
