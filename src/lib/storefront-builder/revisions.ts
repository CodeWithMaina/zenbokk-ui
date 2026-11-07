/**
 * Revision-history helpers that are not components.
 *
 * Kept out of the panel so the panel module exports components only (and the
 * date bucketing can be reasoned about — and tested — on its own).
 */

/**
 * Which labelled bucket a saved time falls into in the history timeline.
 *
 * The buckets are deliberately coarse: an owner scanning their history wants
 * "today" versus "last week", not a precise relative timestamp.
 */
export function revisionPeriod(iso: string, now: Date = new Date()): string {
  const date = new Date(iso)
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfYesterday = new Date(startOfToday)
  startOfYesterday.setDate(startOfToday.getDate() - 1)
  const startOfWeek = new Date(startOfToday)
  startOfWeek.setDate(startOfToday.getDate() - 6)

  if (date >= startOfToday) return 'Today'
  if (date >= startOfYesterday) return 'Yesterday'
  if (date >= startOfWeek) return 'Earlier this week'
  return 'Older'
}
