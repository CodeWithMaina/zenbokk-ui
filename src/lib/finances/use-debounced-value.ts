import { useEffect, useState } from 'react'

/**
 * Delays a fast-changing value (a search box) so the query and the URL update once
 * the typing settles, not on every keystroke.
 */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay)
    return () => window.clearTimeout(timer)
  }, [value, delay])
  return debounced
}

/** Replace one query-string value without disturbing the others. */
export function syncUrlParam(key: string, value: string, resetPage = true): void {
  const url = new URL(window.location.href)
  if (value) url.searchParams.set(key, value)
  else url.searchParams.delete(key)
  if (resetPage) url.searchParams.set('page', '1')
  window.history.replaceState({}, '', url.toString())
}

/** A `<input type="date">` value for `offsetDays` from today. */
function dateInput(offsetDays: number): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  const month = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${d.getFullYear()}-${month}-${day}`
}

/** Turn the drawer's date preset into the concrete from/to the URL carries. */
export function presetRange(preset: string): { from?: string; to?: string } {
  switch (preset) {
    case 'today':
      return { from: dateInput(0), to: dateInput(0) }
    case '7d':
      return { from: dateInput(-6), to: dateInput(0) }
    case '30d':
      return { from: dateInput(-29), to: dateInput(0) }
    default:
      return {}
  }
}

