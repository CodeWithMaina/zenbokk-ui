import { useEffect, useState } from 'react'

/**
 * Debounce a fast-changing value (a search box) before it reaches a query key.
 *
 * Returning the value rather than the setter keeps the component's own state as
 * the single source of truth, so the input never lags behind the keystroke.
 */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs)
    return () => window.clearTimeout(timer)
  }, [value, delayMs])

  return debounced
}
