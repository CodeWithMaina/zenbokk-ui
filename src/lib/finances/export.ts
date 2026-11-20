/**
 * Collect every row behind a filtered register, page by page, for a CSV export.
 *
 * The registers page server-side, so a download must not silently contain only the page the reader
 * happens to be looking at. This walks the same filtered endpoint the screen uses (100 rows at a
 * time, the API's maximum) and stops at `maxRows` so a mistaken "export everything" cannot pull an
 * unbounded ledger into memory. Returns only rows the server actually sent — nothing is invented,
 * and the totals in the file therefore match the totals on screen.
 */
export async function collectFilteredRows<T>(
  fetchPage: (page: number, pageSize: number) => Promise<{ items: T[]; totalCount: number }>,
  maxRows = 5000,
  pageSize = 100,
): Promise<T[]> {
  const first = await fetchPage(1, pageSize)
  const rows = [...first.items]
  const pageCount = Math.min(Math.ceil(first.totalCount / pageSize), Math.ceil(maxRows / pageSize))

  for (let page = 2; page <= pageCount; page += 1) {
    const next = await fetchPage(page, pageSize)
    if (next.items.length === 0) break
    rows.push(...next.items)
  }

  // The server's own count is the ceiling: a page that over-reports (or a filter that changed
  // between requests) can never make the file longer than the filtered result it describes.
  return rows.slice(0, Math.min(maxRows, Math.max(0, first.totalCount)))
}
