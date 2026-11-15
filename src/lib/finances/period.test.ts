import { describe, expect, it } from 'vitest'
import {
  DEFAULT_PERIOD,
  PERIODS,
  defaultCustomRange,
  endOfDay,
  periodLabel,
  startOfDay,
  toDateInput,
} from './period'

/**
 * The period every finance screen shares.
 *
 * The preset keys are resolved by the SERVER, so these tests protect the two things the client owns:
 * that the full set of windows the product promises is offered, and that a custom range sends the local
 * day boundaries a person picked rather than a UTC day that would shift their evening takings.
 */
describe('finance periods', () => {
  it('offers every window the finance screens promise', () => {
    expect(PERIODS.map((period) => period.key)).toEqual([
      'today',
      'yesterday',
      'last_7_days',
      'last_30_days',
      'this_month',
      'last_month',
      'this_year',
      'custom',
    ])
  })

  it('defaults to the last 30 days', () => {
    expect(DEFAULT_PERIOD).toBe('last_30_days')
  })

  it('labels a known period and falls back to the raw key', () => {
    expect(periodLabel('last_7_days')).toBe('Last 7 days')
    expect(periodLabel('made_up')).toBe('made_up')
  })

  it('starts a custom range at local midnight and ends it at the last millisecond of the day', () => {
    const from = startOfDay('2026-11-08')
    const to = endOfDay('2026-11-08')
    const start = new Date(from)
    const end = new Date(to)

    expect(start.getHours()).toBe(0)
    expect(start.getMinutes()).toBe(0)
    expect(end.getHours()).toBe(23)
    expect(end.getMinutes()).toBe(59)
    expect(end.getSeconds()).toBe(59)
    expect(end.getMilliseconds()).toBe(999)
    // The same local day, so a range of one date includes everything recorded that day.
    expect(start.getDate()).toBe(end.getDate())
  })

  it('expresses a date input in the viewer timezone', () => {
    expect(toDateInput(new Date(2026, 10, 8))).toBe('2026-11-08')
    expect(toDateInput(new Date(2026, 0, 5))).toBe('2026-01-05')
  })

  it('defaults the custom range to the last 30 days inclusive of today', () => {
    const { from, to } = defaultCustomRange()
    const start = new Date(`${from}T00:00:00`)
    const end = new Date(`${to}T00:00:00`)
    const days = Math.round((end.getTime() - start.getTime()) / 86_400_000)

    expect(today()).toBe(to)
    expect(days).toBe(29)
  })

  function today(): string {
    return toDateInput(new Date())
  }
})
