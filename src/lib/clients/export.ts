import type { BusinessCustomer } from '../api/types'

/**
 * Client export helpers.
 *
 * Two CSV paths exist, and the UI must be explicit about which one it is:
 *  - the server export (`GET …/customers/export`) covers every customer that
 *    matches the search term, across all pages, and ignores status/sorting;
 *  - the selected-clients CSV is built from the roster rows the caller has
 *    actually selected, so it honours a selection the API cannot express.
 *
 * Excel and PDF are not offered: Punched has no endpoint that produces them.
 */

const CSV_HEADER = [
  'Name',
  'Email',
  'Phone',
  'DateOfBirth',
  'Gender',
  'TotalStamps',
  'LifetimeStamps',
  'TotalRedemptions',
  'EnrolledAt',
  'LastStampAt',
]

function escapeCell(value: string | null | undefined): string {
  if (!value) return ''
  return value.includes(',') || value.includes('"')
    ? `"${value.replace(/"/g, '""')}"`
    : value
}

function dateOnly(iso: string | null): string {
  return iso ? iso.slice(0, 10) : ''
}

/** The same column set the server export writes. */
export function buildClientsCsv(rows: readonly BusinessCustomer[]): string {
  const lines = [CSV_HEADER.join(',')]

  for (const row of rows) {
    lines.push(
      [
        escapeCell(row.fullName),
        escapeCell(row.email),
        escapeCell(row.phoneNumber),
        dateOnly(row.dateOfBirth),
        escapeCell(row.gender),
        row.totalStamps,
        row.lifetimeStamps,
        row.totalRedemptions,
        dateOnly(row.enrolledAt),
        dateOnly(row.lastStampAt),
      ].join(','),
    )
  }

  return lines.join('\r\n')
}

/** Hand a blob to the browser as a download. */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  link.remove()
  // Give the browser a tick to start the download before revoking the URL.
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

/** `clients_20261031.csv` — matches the server's own file name shape. */
export function exportFileName(prefix = 'clients', date = new Date()): string {
  const stamp = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(
    date.getDate(),
  ).padStart(2, '0')}`
  return `${prefix}_${stamp}.csv`
}
