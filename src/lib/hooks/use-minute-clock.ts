import { useEffect, useState } from 'react'

/**
 * The current instant, refreshed once a minute.
 *
 * The dashboard draws live things — a "now" marker in the day's schedule, which
 * staff member is mid-appointment — so it needs the clock to move. A minute is
 * the resolution every one of those labels is written at, and re-rendering a
 * clock row every second would be wasted work.
 */
export function useMinuteClock(): Date {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  return now
}
