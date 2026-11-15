import { PERIODS, defaultCustomRange, type PeriodKey } from '../../lib/finances/period'

export type PeriodPickerProps = {
  period: string
  from: string
  to: string
  onChange: (next: { period: string; from: string; to: string }) => void
  /** Rendered smaller, for a toolbar. */
  compact?: boolean
  className?: string
}

/**
 * The period every finance screen shares.
 *
 * The preset keys are resolved by the SERVER in the business's timezone, so "Today" and "This month"
 * mean the business's day and month. A custom range is the only case that sends explicit dates, and it
 * sends the local day boundaries the owner picked.
 */
export function PeriodPicker({ period, from, to, onChange, compact = false, className }: PeriodPickerProps) {
  const custom = period === 'custom'

  const selectPeriod = (next: string) => {
    if (next !== 'custom') {
      onChange({ period: next, from: '', to: '' })
      return
    }

    const range = from && to ? { from, to } : defaultCustomRange()
    onChange({ period: 'custom', ...range })
  }

  return (
    <div className={className}>
      <label className="sr-only" htmlFor="finance-period">
        Period
      </label>
      <select
        id="finance-period"
        className={compact ? 'select h-control-sm min-h-0 text-meta' : 'select'}
        value={period}
        onChange={(event) => selectPeriod(event.target.value)}
      >
        {PERIODS.map((option) => (
          <option key={option.key} value={option.key}>
            {option.label}
          </option>
        ))}
      </select>

      {custom ? (
        <div className="mt-[0.5rem] flex flex-wrap items-end gap-[0.5rem]">
          <label className="flex flex-1 flex-col gap-[0.2rem] text-caption text-muted">
            From
            <input
              type="date"
              className="input h-control-sm min-h-0 text-meta"
              value={from}
              max={to || undefined}
              onChange={(event) => onChange({ period: 'custom', from: event.target.value, to })}
            />
          </label>
          <label className="flex flex-1 flex-col gap-[0.2rem] text-caption text-muted">
            To
            <input
              type="date"
              className="input h-control-sm min-h-0 text-meta"
              value={to}
              min={from || undefined}
              onChange={(event) => onChange({ period: 'custom', from, to: event.target.value })}
            />
          </label>
        </div>
      ) : null}
    </div>
  )
}

export type { PeriodKey }
