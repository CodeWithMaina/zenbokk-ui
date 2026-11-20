import { describe, expect, it, vi } from 'vitest'
import { collectFilteredRows } from './export'

/**
 * The export walks the REGISTER's endpoint, so its contract is worth pinning: every row behind the
 * filter, page by page, and no unbounded read. A bug here is a CSV that looks complete and is not.
 */
describe('collectFilteredRows', () => {
  it('walks every page of the filtered set', async () => {
    const fetchPage = vi.fn(async (page: number, pageSize: number) => ({
      items: Array.from({ length: pageSize }, (_, index) => (page - 1) * pageSize + index),
      totalCount: 250,
    }))

    const rows = await collectFilteredRows<number>(fetchPage)

    expect(rows).toHaveLength(250)
    expect(fetchPage).toHaveBeenCalledTimes(3)
    expect(fetchPage).toHaveBeenNthCalledWith(1, 1, 100)
    expect(fetchPage).toHaveBeenNthCalledWith(3, 3, 100)
    expect(new Set(rows).size).toBe(250)
  })

  it('stops at the row cap instead of pulling an unbounded ledger', async () => {
    const fetchPage = vi.fn(async (page: number, pageSize: number) => ({
      items: Array.from({ length: pageSize }, (_, index) => (page - 1) * pageSize + index),
      totalCount: 10_000,
    }))

    const rows = await collectFilteredRows<number>(fetchPage, 150, 100)

    expect(rows).toHaveLength(150)
    expect(fetchPage).toHaveBeenCalledTimes(2)
  })

  it('returns exactly what the server sent when the result is empty', async () => {
    const rows = await collectFilteredRows<number>(async () => ({ items: [], totalCount: 0 }))
    expect(rows).toEqual([])
  })
})
