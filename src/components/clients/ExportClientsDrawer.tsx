import { useState } from 'react'
import { Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react'
import { Alert } from '../ui/alert'
import { Button } from '../ui/button'
import { Drawer } from '../ui/drawer'
import { errorMessage } from '../../lib/api/client'
import type { BusinessCustomer } from '../../lib/api/types'
import { clientsApi } from '../../lib/clients/api'
import {
  buildClientsCsv,
  downloadBlob,
  exportFileName,
} from '../../lib/clients/export'

export type ExportClientsDrawerProps = {
  open: boolean
  onClose: () => void
  /** Rows the caller has selected, so a selection can be exported exactly. */
  selectedRows: readonly BusinessCustomer[]
  /** Current search term; the only filter the server export understands. */
  search: string
  /** Rows matching the current search, for the copy above the button. */
  matchingCount?: number
  /** Called after a real download completes. */
  onExported?: (message: string) => void
}

/**
 * Export menu from the Clients design.
 *
 * Only CSV exists in Punched, so Excel and PDF are shown as unavailable rather
 * than as buttons that pretend to work.
 */
export function ExportClientsDrawer({
  open,
  onClose,
  selectedRows,
  search,
  matchingCount,
  onExported,
}: ExportClientsDrawerProps) {
  const [busy, setBusy] = useState<'all' | 'selected' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const exportSelected = () => {
    if (selectedRows.length === 0) return
    setError(null)
    setBusy('selected')
    try {
      const csv = buildClientsCsv(selectedRows)
      downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), exportFileName('clients_selected'))
      onExported?.(
        `Exported ${selectedRows.length} selected client${selectedRows.length === 1 ? '' : 's'} as CSV.`,
      )
      onClose()
    } catch (cause) {
      setError(errorMessage(cause, 'The export could not be created.'))
    } finally {
      setBusy(null)
    }
  }

  const exportAll = async () => {
    setError(null)
    setBusy('all')
    try {
      const blob = await clientsApi.exportCsv(search || null)
      downloadBlob(blob, exportFileName())
      onExported?.('Your CSV export has been downloaded.')
      onClose()
    } catch (cause) {
      setError(errorMessage(cause, 'The export could not be created.'))
    } finally {
      setBusy(null)
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Export clients"
      description="CSV only — Punched has no Excel or PDF export endpoint."
    >
      <div className="flex flex-col gap-[1.1rem]">
        {error ? <Alert tone="danger" title="Export failed">{error}</Alert> : null}

        <section className="flex flex-col gap-[0.6rem]">
          <div>
            <p className="font-semibold">CSV · selected clients</p>
            <p className="mt-[0.1rem] text-meta text-muted">
              {selectedRows.length > 0
                ? `Exports the ${selectedRows.length} client${selectedRows.length === 1 ? '' : 's'} you selected, exactly as listed.`
                : 'Select clients in the list to export just those rows.'}
            </p>
          </div>
          <Button
            variant="primary"
            disabled={selectedRows.length === 0 || busy !== null}
            onClick={exportSelected}
            className="w-full sm:w-auto"
          >
            {busy === 'selected' ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Download className="size-4" aria-hidden="true" />
            )}
            Download selected
          </Button>
        </section>

        <section className="flex flex-col gap-[0.6rem] border-t border-line pt-[1.1rem]">
          <div>
            <p className="font-semibold">CSV · every matching client</p>
            <p className="mt-[0.1rem] text-meta text-muted">
              {search
                ? `Every client whose name, email or phone matches “${search}” — all pages, ignoring the status filter and your selection.`
                : 'Every client enrolled with your business — all pages, ignoring the status filter and your selection.'}
              {matchingCount !== undefined ? ` ${matchingCount} rows match right now.` : ''}
            </p>
          </div>
          <Button
            disabled={busy !== null}
            onClick={() => void exportAll()}
            className="w-full sm:w-auto"
          >
            {busy === 'all' ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Download className="size-4" aria-hidden="true" />
            )}
            Download CSV
          </Button>
        </section>

        <section className="flex flex-col gap-[0.6rem] border-t border-line pt-[1.1rem]">
          <p className="font-semibold">Excel and PDF</p>
          <div className="flex flex-wrap gap-[0.5rem]">
            <Button disabled className="max-sm:flex-1">
              <FileSpreadsheet className="size-4" aria-hidden="true" />
              Excel
            </Button>
            <Button disabled className="max-sm:flex-1">
              <FileText className="size-4" aria-hidden="true" />
              PDF
            </Button>
          </div>
          <p className="text-meta text-muted">
            Not available: the API exposes no spreadsheet or document export, so
            nothing is generated for these formats.
          </p>
        </section>
      </div>
    </Drawer>
  )
}
