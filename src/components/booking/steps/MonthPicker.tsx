import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { dateKey, monthGrid, todayKey } from '../../../lib/booking'
import { cn } from '../../../lib/cn'
import { Button } from '../../ui/button'

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

/**
 * Month picker for the date step.
 *
 * A bottom sheet on phones and a centred card from 40rem up (the stylesheet's
 * own breakpoint), so it never covers the field it edits on a small screen.
 * Days before today are disabled: the API refuses a past slot, so offering one
 * would only produce a refusal later.
 */
export function MonthPicker({
  value,
  onSelect,
  onClose,
}: {
  /** The currently chosen `yyyy-MM-dd`, if any. */
  value: string | null
  onSelect: (date: string) => void
  onClose: () => void
}) {
  const anchor = value ? new Date(`${value}T12:00:00`) : new Date()
  const today = todayKey()
  const [year, setYear] = useState(anchor.getFullYear())
  const [month, setMonth] = useState(anchor.getMonth())
  const cells = monthGrid(year, month)
  const thisMonth = year === new Date().getFullYear() && month === new Date().getMonth()

  // Escape closes the calendar before the wizard: the dialog's own handler is on
  // `document` in the bubble phase, so stopping propagation here keeps the modal
  // open while the sheet it covers goes away.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      event.stopPropagation()
      onClose()
    }
    document.addEventListener('keydown', onKeyDown, true)
    return () => document.removeEventListener('keydown', onKeyDown, true)
  }, [onClose])

  function shift(delta: number) {
    const next = new Date(year, month + delta, 1)
    setYear(next.getFullYear())
    setMonth(next.getMonth())
  }

  return (
    <div
      className="bkw-calendar-overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="bkw-calendar" role="dialog" aria-label="Choose a date">
        <div className="mb-[0.6rem] flex items-center justify-between gap-[0.5rem]">
          <Button
            size="icon"
            aria-label="Previous month"
            disabled={thisMonth}
            onClick={() => shift(-1)}
          >
            <ChevronLeft className="size-[1.1rem]" aria-hidden="true" />
          </Button>
          <b className="text-sheet font-semibold">
            {new Date(year, month, 1).toLocaleDateString('en-GB', {
              month: 'long',
              year: 'numeric',
            })}
          </b>
          <Button size="icon" aria-label="Next month" onClick={() => shift(1)}>
            <ChevronRight className="size-[1.1rem]" aria-hidden="true" />
          </Button>
        </div>

        <div className="bkw-calendar-grid">
          {WEEKDAYS.map((day) => (
            <div key={day} className="bkw-calendar-weekday">
              {day}
            </div>
          ))}
          {cells.map((cell, index) => {
            if (!cell) return <div key={`empty-${index}`} />
            const key = dateKey(cell)
            const past = key < today
            return (
              <button
                key={key}
                type="button"
                disabled={past}
                aria-current={key === today ? 'date' : undefined}
                className={cn(
                  'bkw-calendar-day tabular',
                  key === today && 'today',
                  key === value && 'is-on',
                )}
                onClick={() => onSelect(key)}
              >
                {cell.getDate()}
              </button>
            )
          })}
        </div>

        <div className="mt-[0.8rem] flex justify-end">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}
