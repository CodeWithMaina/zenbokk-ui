/**
 * The date windows the finance screens offer, and how they become the query the API understands.
 *
 * The period key is sent to the server, which resolves the window in the BUSINESS's timezone — so
 * "today" means the business's today, not the browser's and not UTC. Only a custom range sends
 * explicit instants, and those are the local day boundaries the user picked.
 */

export const PERIODS = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'last_7_days', label: 'Last 7 days' },
  { key: 'last_30_days', label: 'Last 30 days' },
  { key: 'this_month', label: 'This month' },
  { key: 'last_month', label: 'Last month' },
  { key: 'this_year', label: 'This year' },
  { key: 'custom', label: 'Custom range' },
] as const

export type PeriodKey = (typeof PERIODS)[number]['key']

export const DEFAULT_PERIOD: PeriodKey = 'last_30_days'

export function periodLabel(key: string): string {
  return PERIODS.find((period) => period.key === key)?.label ?? key
}

/** Local start of a `yyyy-mm-dd` value, as the ISO instant the API accepts. */
export function startOfDay(value: string): string {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, (month ?? 1) - 1, day ?? 1, 0, 0, 0, 0).toISOString()
}

/** Local END of a `yyyy-mm-dd` value (23:59:59.999), so the range is inclusive as a person expects. */
export function endOfDay(value: string): string {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, (month ?? 1) - 1, day ?? 1, 23, 59, 59, 999).toISOString()
}

/** `2026-11-08` for a `Date`, in the viewer's timezone. */
export function toDateInput(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/** The default custom range: the last 30 local days, both ends inclusive. */
export function defaultCustomRange(): { from: string; to: string } {
  const today = new Date()
  const start = new Date(today)
  start.setDate(start.getDate() - 29)
  return { from: toDateInput(start), to: toDateInput(today) }
}
