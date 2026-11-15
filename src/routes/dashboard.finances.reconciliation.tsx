import { createFileRoute } from '@tanstack/react-router'
import { Loader2, Scale, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { ReconciliationBadge } from '../components/finances/badges'
import { ClaimsBoard } from '../components/finances/ClaimsBoard'
import { ModulePlaceholder } from '../components/shell/ModulePlaceholder'
import { Alert } from '../components/ui/alert'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { ConfirmDialog } from '../components/ui/confirm-dialog'
import { EmptyState } from '../components/ui/empty-state'
import { MetricGrid } from '../components/ui/metric-tile'
import { PageHeader } from '../components/ui/page-header'
import { Skeleton } from '../components/ui/skeleton'
import { Tabs } from '../components/ui/tabs'
import { errorMessage } from '../lib/api/client'
import { useDashboardContext } from '../lib/dashboard/dashboard-context'
import { MODULE } from '../lib/entitlements'
import {
  useReconciliation,
  useReconciliationActions,
  useTransactionDecisions,
  type MpesaStatementLine,
  type ReconciliationWorkspace,
} from '../lib/finances/api'
import { formatDate, formatDateTime, money } from '../lib/format'

export const Route = createFileRoute('/dashboard/finances/reconciliation')({
  component: ReconciliationPage,
})

type ReconciliationTab = 'claims' | 'statement'

/**
 * Reconciliation — the board where the business confirms money arrived.
 *
 * Two things live here and they answer different questions, so they are tabs rather than a
 * single blended screen:
 *
 *  - **M-PESA claims** (the default): the confirmations customers pasted, each shown as the
 *    message it is, each waiting on the owner's decision. This is the operational queue.
 *  - **Statement comparison**: comparing the recorded ledger with a statement the business
 *    downloaded from its own M-PESA account. Verifying a payment never implied this, so it
 *    keeps its own screen.
 */
function ReconciliationPage() {
  const { hasModule, hasPermission } = useDashboardContext()
  const enabled = hasModule(MODULE.financials) && hasPermission('finances.reconcile')
  const [tab, setTab] = useState<ReconciliationTab>('claims')

  if (!enabled) {
    return <ModulePlaceholder navKey="finances-reconciliation" />
  }

  return (
    <div>
      <Tabs
        label="Reconciliation views"
        items={[
          { value: 'claims', label: 'M-PESA claims' },
          { value: 'statement', label: 'Statement comparison' },
        ]}
        value={tab}
        onValueChange={(next) => setTab(next as ReconciliationTab)}
      />
      <div className="mt-[1.1rem]">
        {tab === 'claims' ? <ClaimsBoard /> : <StatementReconciliation />}
      </div>
    </div>
  )
}

/**
 * M-Pesa statement reconciliation.
 *
 * Verifying a payment says the owner accepts the money arrived. It says nothing about whether the money
 * appears on the business's actual M-Pesa statement. This screen answers the second question: it imports
 * the statement the business downloaded from its own M-Pesa account and compares it with the ledger.
 *
 * There is no direct Safaricom integration, and the screen never implies one — the file always comes
 * from the business.
 */
function StatementReconciliation() {
  const { hasModule, hasPermission } = useDashboardContext()
  const enabled = hasModule(MODULE.financials) && hasPermission('finances.reconcile')

  const workspace = useReconciliation(enabled)
  const { importStatement, match } = useReconciliationActions()
  const decisions = useTransactionDecisions()

  const fileInput = useRef<HTMLInputElement>(null)
  const [busyLine, setBusyLine] = useState<string | null>(null)
  const [matchTarget, setMatchTarget] = useState<MpesaStatementLine | null>(null)
  const [flagTarget, setFlagTarget] = useState<{ id: string; reference: string } | null>(null)

  if (!enabled) {
    return <ModulePlaceholder navKey="finances-reconciliation" />
  }

  const data = workspace.data

  const pickFile = async (file: File | undefined) => {
    if (!file) return

    try {
      const content = await file.text()
      const result = await importStatement.mutateAsync({ fileName: file.name, content })
      toast.success(
        `Imported ${result.import?.lineCount ?? 0} line(s): ${result.matchedLines} matched, ${result.unmatchedLines} not in Punched, ${result.discrepancyLines} discrepant.`,
      )
    } catch (failure) {
      toast.error(errorMessage(failure, 'The statement could not be imported.'))
    } finally {
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  const decideLine = async (
    line: MpesaStatementLine,
    status: 'matched' | 'discrepancy' | 'excluded',
    transactionId?: string | null,
    note?: string,
  ) => {
    setBusyLine(line.id)

    try {
      await match.mutateAsync({
        lineId: line.id,
        transactionId: transactionId ?? null,
        status,
        note: note ?? null,
      })
      toast.success(`${line.receiptNumber} marked as ${status}.`)
      setMatchTarget(null)
    } catch (failure) {
      toast.error(errorMessage(failure, 'The line could not be updated.'))
    } finally {
      setBusyLine(null)
    }
  }

  const confirmFlag = async () => {
    if (!flagTarget) return

    try {
      await decisions.reconcile.mutateAsync({
        id: flagTarget.id,
        status: 'discrepancy',
        note: 'Recorded in Punched but not present in the imported M-Pesa statement.',
      })
      toast.success(`${flagTarget.reference} flagged as a discrepancy.`)
      setFlagTarget(null)
    } catch (failure) {
      toast.error(errorMessage(failure, 'The transaction could not be flagged.'))
    }
  }

  return (
    <>
      <PageHeader
        title="Reconciliation"
        description="Compare what Punched recorded with the M-Pesa statement you downloaded from your own account."
        actions={
          <Button
            variant="primary"
            disabled={importStatement.isPending}
            onClick={() => fileInput.current?.click()}
          >
            {importStatement.isPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Upload className="size-4" aria-hidden="true" />
            )}
            Import statement
          </Button>
        }
      />

      <input
        ref={fileInput}
        type="file"
        accept=".csv,text/csv,text/plain"
        className="sr-only"
        aria-label="M-Pesa statement CSV"
        onChange={(event) => void pickFile(event.target.files?.[0])}
      />

      <Alert tone="info" title="No Safaricom connection is used">
        Punched never claims a direct link to your M-Pesa account. Export the statement from your M-Pesa
        portal and import the CSV here. Re-importing the same file is refused, so its lines cannot be
        duplicated.
      </Alert>

      {workspace.isError ? (
        <div className="mt-4">
          <Alert tone="danger">
            {errorMessage(workspace.error, 'The reconciliation workspace could not be loaded.')}
          </Alert>
        </div>
      ) : null}

      {workspace.isLoading && !data ? (
        <div className="mt-4 grid gap-[0.5rem]">
          <Skeleton className="h-[6rem]" />
          <Skeleton className="h-[10rem]" />
        </div>
      ) : null}

      {data ? <ReconciliationSummary data={data} /> : null}

      {data ? (
        <StatementLines
          lines={data.lines}
          busyLine={busyLine}
          matchTarget={matchTarget}
          onOpenMatch={setMatchTarget}
          onCloseMatch={() => setMatchTarget(null)}
          onMatch={(line, transactionId) =>
            void decideLine(line, 'matched', transactionId, 'Matched manually.')
          }
          onDiscrepancy={(line) => void decideLine(line, 'discrepancy', null, 'Amount or reference disagrees.')}
          onExclude={(line) => void decideLine(line, 'excluded', null, 'Excluded from reconciliation.')}
        />
      ) : null}

      {data ? <MissingFromStatement data={data} onFlag={setFlagTarget} /> : null}

      {data && data.imports.length > 0 ? <ImportHistory data={data} /> : null}

      <ConfirmDialog
        open={flagTarget != null}
        title="Flag as a discrepancy?"
        description={
          flagTarget
            ? `${flagTarget.reference} is recorded in Punched but does not appear in the imported statement. Flagging it keeps the money counted, and records that the statement disagrees.`
            : undefined
        }
        confirmLabel="Flag discrepancy"
        onConfirm={() => void confirmFlag()}
        onCancel={() => setFlagTarget(null)}
      />
    </>
  )
}

/** The headline counts for the latest import. */
function ReconciliationSummary({ data }: { data: ReconciliationWorkspace }) {
  return (
    <>
      <div className="mt-4">
        <MetricGrid
          items={[
            { value: `${data.matchedLines}`, label: 'Matched lines' },
            { value: `${data.unmatchedLines}`, label: 'In M-Pesa, not in Punched' },
            { value: `${data.discrepancyLines}`, label: 'Discrepancies' },
            { value: `${data.transactionsMissingFromStatementCount}`, label: 'In Punched, not in statement' },
          ]}
        />
      </div>

      <p className="mt-[0.5rem] text-meta text-muted">
        {data.import
          ? `${data.import.fileName} · imported ${formatDateTime(data.import.importedAt)} · ${data.lineTotal} line(s)`
          : 'Nothing imported yet. Import a statement to compare it with your records.'}
        {data.unreconciledTransactionCount > 0
          ? ` · ${data.unreconciledTransactionCount} of your transactions have not been reconciled yet.`
          : ''}
      </p>

      {data.import?.notes ? (
        <p className="mt-[0.3rem] text-caption text-warning-ink">Importer note: {data.import.notes}</p>
      ) : null}
    </>
  )
}

/**
 * The imported statement, line by line, with the decision each line needs.
 *
 * A verified payment stays unreconciled until it is compared here: confirming a pasted message is not the
 * same act as checking it against the bank.
 */
function StatementLines({
  lines,
  busyLine,
  matchTarget,
  onOpenMatch,
  onCloseMatch,
  onMatch,
  onDiscrepancy,
  onExclude,
}: {
  lines: MpesaStatementLine[]
  busyLine: string | null
  matchTarget: MpesaStatementLine | null
  onOpenMatch: (line: MpesaStatementLine) => void
  onCloseMatch: () => void
  onMatch: (line: MpesaStatementLine, transactionId: string) => void
  onDiscrepancy: (line: MpesaStatementLine) => void
  onExclude: (line: MpesaStatementLine) => void
}) {
  return (
    <Card className="mt-5 overflow-hidden">
      <div className="border-b border-line px-[0.8rem] py-[0.7rem]">
        <h2 className="text-label font-semibold">Statement lines</h2>
        <p className="text-caption text-muted">
          Each line is matched by M-Pesa receipt code first, then by amount and date. Unmatched money is
          money that arrived in M-Pesa but was never recorded here.
        </p>
      </div>

      {lines.length === 0 ? (
        <EmptyState
          title="No statement lines yet"
          description="Import the CSV from your M-Pesa portal to see its lines compared with your records."
        />
      ) : (
        <ul className="divide-y divide-line">
          {lines.map((line) => (
            <li key={line.id} className="px-[0.8rem] py-[0.6rem]">
              <div className="flex flex-wrap items-center justify-between gap-[0.5rem]">
                <div className="min-w-0">
                  <p className="text-meta font-medium">
                    {line.receiptNumber} · {money(line.amount)}
                  </p>
                  <p className="text-caption text-muted">
                    {line.transactionAt ? `${formatDateTime(line.transactionAt)} · ` : ''}
                    {line.payerName ?? 'Unknown payer'}
                    {line.accountReference ? ` · ref ${line.accountReference}` : ''}
                  </p>
                  {line.narrative ? (
                    <p className="truncate text-caption text-muted">{line.narrative}</p>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-[0.5rem]">
                  {line.isDuplicateInFile ? <Badge tone="warning">Duplicate in file</Badge> : null}
                  <ReconciliationBadge status={line.status} />
                  {line.amountVariance != null && line.amountVariance !== 0 ? (
                    <Badge tone="danger">Variance {money(Math.abs(line.amountVariance))}</Badge>
                  ) : null}
                  {line.punchedReference ? <Badge tone="info">Punched {line.punchedReference}</Badge> : null}
                  {busyLine === line.id ? (
                    <Loader2 className="size-4 animate-spin text-muted" aria-hidden="true" />
                  ) : null}
                </div>
              </div>

              {line.note ? <p className="mt-[0.3rem] text-caption text-muted">{line.note}</p> : null}

              {matchTarget?.id === line.id ? (
                <MatchPicker
                  line={line}
                  busy={busyLine === line.id}
                  onCancel={onCloseMatch}
                  onConfirm={(transactionId) => onMatch(line, transactionId)}
                />
              ) : (
                <div className="mt-[0.5rem] flex flex-wrap gap-[0.4rem]">
                  {line.status !== 'matched' ? (
                    <Button
                      size="sm"
                      variant="primary"
                      disabled={busyLine === line.id}
                      onClick={() => onOpenMatch(line)}
                    >
                      <Scale className="size-3.5" aria-hidden="true" />
                      Match to a transaction
                    </Button>
                  ) : null}
                  {line.status !== 'discrepancy' ? (
                    <Button size="sm" disabled={busyLine === line.id} onClick={() => onDiscrepancy(line)}>
                      Flag as discrepancy
                    </Button>
                  ) : null}
                  {line.status !== 'excluded' ? (
                    <Button size="sm" disabled={busyLine === line.id} onClick={() => onExclude(line)}>
                      Exclude
                    </Button>
                  ) : null}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}


/**
 * Manual match: choose which Punched transaction a statement line belongs to.
 *
 * Only transactions the statement does not already account for are offered — matching a line to a
 * transaction already matched elsewhere would reconcile one payment twice.
 */
function MatchPicker({
  line,
  busy,
  onCancel,
  onConfirm,
}: {
  line: MpesaStatementLine
  busy: boolean
  onCancel: () => void
  onConfirm: (transactionId: string) => void
}) {
  const workspace = useReconciliation()
  const candidates = workspace.data?.transactionsMissingFromStatement ?? []
  const [selected, setSelected] = useState(candidates[0]?.id ?? '')

  return (
    <div className="mt-[0.6rem] rounded-md bg-sunken p-[0.6rem]">
      <p className="text-caption text-muted">
        Which transaction of yours does {line.receiptNumber} for {money(line.amount)} correspond to?
      </p>

      {candidates.length === 0 ? (
        <p className="mt-[0.4rem] text-caption text-warning-ink">
          Every recorded transaction is already accounted for by the statement. Record the money first, then
          match it here.
        </p>
      ) : (
        <div className="mt-[0.4rem] flex flex-wrap items-end gap-[0.5rem]">
          <label className="flex min-w-[14rem] flex-1 flex-col gap-[0.2rem] text-caption text-muted">
            Transaction
            <select
              className="select h-control-sm min-h-0 text-meta"
              value={selected}
              onChange={(event) => setSelected(event.target.value)}
            >
              {candidates.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.reference} · {money(candidate.amount)} · {formatDate(candidate.transactionDate)}
                </option>
              ))}
            </select>
          </label>

          <Button size="sm" variant="primary" disabled={busy || !selected} onClick={() => onConfirm(selected)}>
            {busy ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : null}
            Confirm match
          </Button>
        </div>
      )}

      <div className="mt-[0.5rem]">
        <Button size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  )
}


/**
 * The other side of the comparison: money Punched recorded that the statement does not show.
 *
 * Nothing is changed automatically. Flagging one records a disagreement against that transaction — the
 * money stays counted, because it may be a Till payment the exported statement did not cover.
 */
function MissingFromStatement({
  data,
  onFlag,
}: {
  data: ReconciliationWorkspace
  onFlag: (target: { id: string; reference: string }) => void
}) {
  const rows = data.transactionsMissingFromStatement

  return (
    <Card className="mt-5 overflow-hidden">
      <div className="border-b border-line px-[0.8rem] py-[0.7rem]">
        <h2 className="text-label font-semibold">Recorded here, missing from the statement</h2>
        <p className="text-caption text-muted">
          Money Punched recorded that the imported statement does not contain. It may be a Till payment the
          export did not cover, or a claim that never reached the account — flag it if you cannot explain it.
        </p>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="Nothing outstanding"
          description={
            data.import
              ? 'Every transaction in the period is accounted for by the imported statement.'
              : 'Import a statement to compare it with your transactions.'
          }
        />
      ) : (
        <ul className="divide-y divide-line">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-[0.5rem] px-[0.8rem] py-[0.6rem]"
            >
              <div className="min-w-0">
                <p className="text-meta font-medium">
                  {row.reference} · {money(row.amount)}
                </p>
                <p className="text-caption text-muted">
                  {formatDate(row.transactionDate)} · {row.paymentMethod}
                  {row.externalReference ? ` · ${row.externalReference}` : ''}
                  {row.customerName ? ` · ${row.customerName}` : ''}
                  {row.description ? ` · ${row.description}` : ''}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-[0.5rem]">
                <ReconciliationBadge status="unreconciled" />
                <Button size="sm" onClick={() => onFlag({ id: row.id, reference: row.reference })}>
                  Flag discrepancy
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

/** The business's own import history, so a statement that was uploaded before is recognisable. */
function ImportHistory({ data }: { data: ReconciliationWorkspace }) {
  return (
    <Card className="mt-5 overflow-hidden">
      <div className="border-b border-line px-[0.8rem] py-[0.7rem]">
        <h2 className="text-label font-semibold">Import history</h2>
        <p className="text-caption text-muted">
          Every statement file imported for this business, newest first.
        </p>
      </div>

      <ul className="divide-y divide-line">
        {data.imports.map((batch) => (
          <li
            key={batch.id}
            className="flex flex-wrap items-center justify-between gap-[0.5rem] px-[0.8rem] py-[0.6rem]"
          >
            <div className="min-w-0">
              <p className="truncate text-meta font-medium">{batch.fileName}</p>
              <p className="text-caption text-muted">
                {formatDateTime(batch.importedAt)} · {batch.lineCount} line(s)
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-[0.4rem]">
              <Badge tone="success">{batch.matchedCount} matched</Badge>
              <Badge tone="warning">{batch.unmatchedCount} unmatched</Badge>
              <Badge tone="danger">{batch.discrepancyCount} discrepant</Badge>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  )
}

