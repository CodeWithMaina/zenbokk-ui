import { describe, expect, it } from 'vitest'
import {
  DEFAULT_FINANCE_SORT,
  financeSortLabel,
  ledgerSortParams,
  parseFinanceSort,
  toggleFinanceSort,
} from './sort'

/**
 * The ordering vocabulary is shared by three registers, so it is pinned here: a change to one
 * mapping silently reorders every finance list, which is exactly the kind of drift a unit test is
 * for. The wire values are part of the API contract (the server falls back to newest-first for
 * anything else), so they are asserted literally.
 */
describe('finance sorting', () => {
  it('reads only the five orders it knows, falling back to newest first', () => {
    expect(parseFinanceSort('date-a')).toBe('date-a')
    expect(parseFinanceSort('amt-d')).toBe('amt-d')
    expect(parseFinanceSort('name-a')).toBe('name-a')
    expect(parseFinanceSort('sideways')).toBe(DEFAULT_FINANCE_SORT)
    expect(parseFinanceSort(null)).toBe(DEFAULT_FINANCE_SORT)
  })

  it('labels every order the drawer offers', () => {
    expect(financeSortLabel('date-d')).toBe('Newest first')
    expect(financeSortLabel('amt-a')).toBe('Lowest amount')
    expect(financeSortLabel('name-a')).toBe('Name A to Z')
  })

  it('translates a register order into the ledger endpoint field and direction', () => {
    expect(ledgerSortParams('date-d')).toEqual({ sort: 'date', sortDirection: 'desc' })
    expect(ledgerSortParams('date-a')).toEqual({ sort: 'date', sortDirection: 'asc' })
    expect(ledgerSortParams('amt-d')).toEqual({ sort: 'amount', sortDirection: 'desc' })
    expect(ledgerSortParams('amt-a')).toEqual({ sort: 'amount', sortDirection: 'asc' })
    expect(ledgerSortParams('name-a')).toEqual({ sort: 'description', sortDirection: 'asc' })
  })

  it('reverses a second click on the same column, and leaves A→Z alone', () => {
    expect(toggleFinanceSort('date-d', 'date-d')).toBe('date-a')
    expect(toggleFinanceSort('date-a', 'date-a')).toBe('date-d')
    expect(toggleFinanceSort('amt-d', 'amt-d')).toBe('amt-a')
    expect(toggleFinanceSort('name-a', 'name-a')).toBe('name-a')
    expect(toggleFinanceSort('date-d', 'amt-d')).toBe('amt-d')
  })
})
