/**
 * CSV export for the finance registers.
 *
 * Two safety rules, always applied:
 *  - every cell is quoted, and embedded quotes are doubled;
 *  - a cell whose text starts with `=`, `+`, `-` or `@` is prefixed with a single
 *    quote, so a customer name can never become a spreadsheet formula.
 * A UTF-8 BOM leads the file so Excel reads KES amounts and Kenyan names correctly.
 */

/** Escape one cell. Values arrive as strings; numbers are formatted by the caller. */
export function csvCell(value: string | number | null | undefined): string {
  let text = value === null || value === undefined ? '' : String(value)
  if (/^[=+\-@]/.test(text)) text = `'${text}`
  return `"${text.replace(/"/g, '""')}"`
}

export function csvRows(rows: readonly (readonly (string | number | null | undefined)[])[]): string {
  return rows.map((row) => row.map(csvCell).join(',')).join('\r\n')
}

/** Download rows as a `.csv` file. Returns the number of data rows written. */
export function downloadCsv(
  fileName: string,
  rows: readonly (readonly (string | number | null | undefined)[])[],
): void {
  const blob = new Blob([String.fromCharCode(0xFEFF) + csvRows(rows)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000)
}
