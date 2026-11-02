import { useEffect, useMemo, useRef, useState } from 'react'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '../../lib/cn'
import { useMediaQuery } from '../../lib/hooks/use-media-query'
import { Button } from '../ui/button'
import { Portal } from '../ui/portal'

export type LoyaltyDatePickerProps = {
  id?: string
  /** Accessible label, rendered above the field by the caller. */
  label: string
  /** `YYYY-MM-DD`, or empty for "no date". */
  value: string
  onChange: (value: string) => void
  placeholder?: string
  /** Days on or before this `YYYY-MM-DD` are disabled (the end-date rule). */
  disableOnOrBefore?: string
  /** Which quick presets to offer. */
  presets?: 'start' | 'end'
  invalid?: boolean
  className?: string
}

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function toValue(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function fromValue(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, (month ?? 1) - 1, day ?? 1)
}

const displayFormatter = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})
const monthFormatter = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' })

function formatDisplay(value: string): string {
  return value ? displayFormatter.format(fromValue(value)) : ''
}

/** Preset resolution for the calendar's quick choices, kept out of render. */
function quickChoiceValue(key: string, value: string): string {
  const base = new Date()
  base.setHours(0, 0, 0, 0)
  const date = new Date(base)
  if (key === 'tom') date.setDate(date.getDate() + 1)
  if (key === 'mon') date.setDate(date.getDate() + ((8 - date.getDay()) % 7 || 7))
  if (/^\dm$/.test(key)) {
    const anchor = value ? fromValue(value) : base
    date.setFullYear(anchor.getFullYear(), anchor.getMonth() + Number(key[0]), anchor.getDate())
  }
  return toValue(date)
}

/**
 * The design's custom date field: a button showing the chosen date that opens a
 * month calendar. On a pointer device the calendar is a popover anchored to the
 * field; on phones it is a bottom sheet. Past days (and, for an end date, days
 * on or before the start) are disabled rather than merely rejected on save.
 */
export function LoyaltyDatePicker({
  id,
  label,
  value,
  onChange,
  placeholder = 'Select date',
  disableOnOrBefore,
  presets = 'start',
  invalid = false,
  className,
}: LoyaltyDatePickerProps) {
  const isDesktop = useMediaQuery('(min-width: 601px)')
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const [cursor, setCursor] = useState(() => {
    const base = value ? fromValue(value) : new Date()
    return new Date(base.getFullYear(), base.getMonth(), 1)
  })
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)

  useEffect(() => {
    if (!open) return
    // Captured so Escape closes the calendar before it reaches a drawer's own
    // Escape handler — a nested overlay should dismiss the innermost layer first.
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopPropagation()
      setOpen(false)
    }
    document.addEventListener('keydown', onKeyDown, true)
    return () => document.removeEventListener('keydown', onKeyDown, true)
  }, [open])

  useEffect(() => {
    if (!open) return
    if (isDesktop) {
      const rect = buttonRef.current?.getBoundingClientRect()
      if (rect) {
        const width = 304
        const top = Math.min(rect.bottom + 6, window.innerHeight - 380)
        setPosition({
          top: Math.max(8, top),
          left: Math.min(Math.max(8, rect.left), window.innerWidth - width - 8),
        })
      }
    } else {
      setPosition(null)
    }
  }, [open, isDesktop])

  const openPicker = () => {
    const base = value ? fromValue(value) : new Date()
    setCursor(new Date(base.getFullYear(), base.getMonth(), 1))
    setOpen(true)
  }

  const todayValue = useMemo(() => toValue(new Date()), [])

  const days = useMemo(() => {
    const year = cursor.getFullYear()
    const month = cursor.getMonth()
    const lead = (new Date(year, month, 1).getDay() + 6) % 7
    const count = new Date(year, month + 1, 0).getDate()
    return { lead, count }
  }, [cursor])

  const presetList =
    presets === 'start'
      ? [
          { key: 'today', label: 'Today' },
          { key: 'tom', label: 'Tomorrow' },
          { key: 'mon', label: 'Next Monday' },
        ]
      : [
          { key: '1m', label: '+1 month' },
          { key: '3m', label: '+3 months' },
          { key: '6m', label: '+6 months' },
        ]

  return (
    <div className={cn('min-w-0', className)}>
      <span className="label" id={id ? `${id}-label` : undefined}>
        {label}
      </span>
      <button
        ref={buttonRef}
        type="button"
        id={id}
        onClick={openPicker}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-labelledby={id ? `${id}-label ${id}` : undefined}
        aria-invalid={invalid || undefined}
        className={cn(
          'input flex items-center justify-between gap-[0.6rem] text-left',
          invalid && 'border-danger-solid',
          open && 'border-fg',
        )}
      >
        <span className={cn('truncate', !value && 'text-subtle')}>
          {value ? formatDisplay(value) : placeholder}
        </span>
        <CalendarIcon className="size-4 shrink-0 text-muted" aria-hidden="true" />
      </button>

      {open ? (
        <Portal>
          <button
            type="button"
            aria-label="Close date picker"
            tabIndex={-1}
            className={cn(
              'fixed inset-0 z-(--z-popover)',
              isDesktop ? 'bg-transparent' : 'bg-scrim',
            )}
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-label={`Choose a ${label.toLowerCase()}`}
            style={isDesktop && position ? { top: position.top, left: position.left } : undefined}
            className={cn(
              'fixed z-(--z-popover) bg-raised text-fg shadow-overlay',
              isDesktop
                ? 'w-[19rem] rounded-card border border-line p-[1rem]'
                : 'inset-x-0 bottom-0 rounded-t-sheet border-t border-line p-[1.2rem] pb-[calc(1rem+env(safe-area-inset-bottom))]',
            )}
          >
            <div className="mb-[0.4rem] flex items-center justify-between">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Previous month"
                onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
              >
                <ChevronLeft className="size-4" aria-hidden="true" />
              </Button>
              <div className="text-heading font-bold" aria-live="polite">
                {monthFormatter.format(cursor)}
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Next month"
                onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
              >
                <ChevronRight className="size-4" aria-hidden="true" />
              </Button>
            </div>

            <div className="grid grid-cols-7 text-center text-[0.72rem] font-semibold tracking-caps text-muted uppercase">
              {WEEKDAYS.map((day) => (
                <span key={day} className="py-[0.3rem]">
                  {day}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-y-[0.15rem]">
              {Array.from({ length: days.lead }, (_, index) => (
                <span key={`lead-${index}`} />
              ))}
              {Array.from({ length: days.count }, (_, index) => {
                const dayValue = toValue(
                  new Date(cursor.getFullYear(), cursor.getMonth(), index + 1),
                )
                const disabled =
                  (disableOnOrBefore !== undefined && dayValue <= disableOnOrBefore) ||
                  dayValue < todayValue
                const selected = dayValue === value
                const isToday = dayValue === todayValue
                return (
                  <button
                    key={dayValue}
                    type="button"
                    disabled={disabled}
                    autoFocus={selected}
                    aria-pressed={selected}
                    aria-label={displayFormatter.format(fromValue(dayValue))}
                    onClick={() => {
                      onChange(dayValue)
                      setOpen(false)
                    }}
                    className={cn(
                      'grid min-h-[2.3rem] place-items-center rounded-ico text-label font-medium transition-colors',
                      'hover:bg-hover disabled:cursor-default disabled:opacity-30',
                      isToday && !selected && 'text-accent',
                      selected && 'bg-inverse font-semibold text-on-inverse hover:bg-inverse',
                    )}
                  >
                    {index + 1}
                  </button>
                )
              })}
            </div>

            <div className="mt-[0.8rem] flex flex-wrap gap-[0.4rem]">
              {presetList.map((preset) => (
                <button
                  key={preset.key}
                  type="button"
                  onClick={() => {
                    onChange(quickChoiceValue(preset.key, value))
                    setOpen(false)
                  }}
                  className="min-h-[2rem] rounded-pill border border-line bg-surface px-[0.75rem] text-[0.8rem] font-medium transition-colors hover:bg-hover"
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <div className="mt-[0.8rem] flex justify-between border-t border-line pt-[0.4rem]">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onChange('')
                  setOpen(false)
                }}
              >
                Clear
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </Portal>
      ) : null}
    </div>
  )
}
