/**
 * The one ordering vocabulary the finance registers use.
 *
 * The reference design offers five orders on every register — newest, oldest, highest, lowest and
 * name A→Z — and the same five values travel to the server. Keeping the wire names here (rather
 * than in three page components) is what stops the payments register and the cashbook from
 * disagreeing about what "highest" means.
 */

export const FINANCE_SORT_VALUES = ['date-d', 'date-a', 'amt-d', 'amt-a', 'name-a'] as const

export type FinanceSort = (typeof FINANCE_SORT_VALUES)[number]

export const FINANCE_SORT_OPTIONS: readonly { value: FinanceSort; label: string }[] = [
  { value: 'date-d', label: 'Newest first' },
  { value: 'date-a', label: 'Oldest first' },
  { value: 'amt-d', label: 'Highest amount' },
  { value: 'amt-a', label: 'Lowest amount' },
  { value: 'name-a', label: 'Name A to Z' },
]

export const DEFAULT_FINANCE_SORT: FinanceSort = 'date-d'

/** Narrow a value from the URL to a sort we honour. */
export function parseFinanceSort(value: unknown): FinanceSort {
  return FINANCE_SORT_VALUES.includes(value as FinanceSort) ? (value as FinanceSort) : DEFAULT_FINANCE_SORT
}

export function financeSortLabel(sort: FinanceSort): string {
  return FINANCE_SORT_OPTIONS.find((option) => option.value === sort)?.label ?? 'Newest first'
}

/**
 * The ledger endpoints (`/finances/cashbook`, `/finances/expenses`) take a field plus a direction
 * rather than the register's composite name, so the UI's one vocabulary is translated here once.
 */
export function ledgerSortParams(sort: FinanceSort): { sort: string; sortDirection: 'asc' | 'desc' } {
  switch (sort) {
    case 'date-a':
      return { sort: 'date', sortDirection: 'asc' }
    case 'amt-d':
      return { sort: 'amount', sortDirection: 'desc' }
    case 'amt-a':
      return { sort: 'amount', sortDirection: 'asc' }
    case 'name-a':
      return { sort: 'description', sortDirection: 'asc' }
    default:
      return { sort: 'date', sortDirection: 'desc' }
  }
}

/** Toggling a column header: newest ⇄ oldest, highest ⇄ lowest, and name stays A→Z. */
export function toggleFinanceSort(current: FinanceSort, next: FinanceSort): FinanceSort {
  if (current === next) {
    if (next === 'date-d') return 'date-a'
    if (next === 'date-a') return 'date-d'
    if (next === 'amt-d') return 'amt-a'
    if (next === 'amt-a') return 'amt-d'
  }
  return next
}
