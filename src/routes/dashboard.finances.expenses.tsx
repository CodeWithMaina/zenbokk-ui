import { createFileRoute } from '@tanstack/react-router'
import { Loader2, Pencil, Plus, Receipt, Undo2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { RecordExpenseDialog } from '../components/finances/RecordExpenseDialog'
import { VoidExpenseDialog } from '../components/finances/VoidExpenseDialog'
import { ModulePlaceholder } from '../components/shell/ModulePlaceholder'
import { Alert } from '../components/ui/alert'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { EmptyState } from '../components/ui/empty-state'
import { MetricGrid } from '../components/ui/metric-tile'
import { PageHeader } from '../components/ui/page-header'
import { PaginationBar } from '../components/ui/pagination-bar'
import { SearchField } from '../components/ui/search-field'
import { Skeleton } from '../components/ui/skeleton'
import { errorMessage } from '../lib/api/client'
import { useDashboardContext } from '../lib/dashboard/dashboard-context'
import { MODULE } from '../lib/entitlements'
import {
  useExpenseCategories,
  useExpenses,
  useFinancialAuditTrail,
  type FinancialFilters,
  type FinancialTransaction,
} from '../lib/finances/api'
import { PAYMENT_METHOD_OPTIONS, paymentMethodLabel } from '../lib/finances/labels'
import { formatDate, formatDateTime, money } from '../lib/format'

export const Route = createFileRoute('/dashboard/finances/expenses')({
  component: ExpensesPage,
})

const PAGE_SIZE = 25

type Filters = {
  search: string
  category: string
  paymentMethod: string
  from: string
  to: string
}

const EMPTY_FILTERS: Filters = {
  search: '',
  category: '',
  paymentMethod: '',
  from: '',
  to: '',
}

/**
 * Expenses: the money the business spent.
 *
 * Expenses are independent financial records — they never originate from an appointment or a
 * payment claim — and they are the only thing in Punched that produces an outflow without a
 * customer being involved. Every one of them lands in the Cashbook as Money Out.
 *
 * Two rules the screen makes visible rather than merely enforcing:
 *
 *  - **Nothing is deleted.** An expense is corrected through an audited edit, or voided with a
 *    reason. A voided row stays in the register, greyed, and stops counting.
 *  - **The headline figures do not move when a filter is applied.** "Total recorded" and "this
 *    month" come from the server's whole-book sums, not from whichever page is on screen.
 */

function ExpensesPage() {
  const { hasModule, hasPermission } = useDashboardContext()
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [page, setPage] = useState(1)
  const [expenseOpen, setExpenseOpen] = useState(false)
  const [editing, setEditing] = useState<FinancialTransaction | null>(null)
  const [voidTarget, setVoidTarget] = useState<FinancialTransaction | null>(null)

  const enabled = hasModule(MODULE.financials)
  const query: FinancialFilters = useMemo(
    () => ({
      search: filters.search || undefined,
      category: filters.category || undefined,
      paymentMethod: filters.paymentMethod || undefined,
      from: filters.from ? new Date(filters.from).toISOString() : undefined,
      to: filters.to ? new Date(`${filters.to}T23:59:59.999`).toISOString() : undefined,
      page,
      pageSize: PAGE_SIZE,
      sort: 'date',
      direction: 'desc',
    }),
    [filters, page],
  )

  const categories = useExpenseCategories(enabled)
  const expenses = useExpenses(query, enabled)
  const canManage = hasPermission('finances.manage_expenses')

  if (!enabled) {
    return <ModulePlaceholder navKey="finances-expenses" />
  }

  const data = expenses.data
  const pageCount = data ? Math.max(1, Math.ceil(data.totalCount / (data.pageSize || PAGE_SIZE))) : 1
  const filtered = Object.values(filters).some((value) => value !== '')

  return (
    <>
      <PageHeader
        title="Expenses"
        description="Money the business spent — rent, stock, transport, utilities and the rest. Each one is Money Out in the Cashbook."
        actions={
          canManage ? (
            <Button
              variant="primary"
              onClick={() => {
                setEditing(null)
                setExpenseOpen(true)
              }}
            >
              <Plus className="size-4" aria-hidden="true" />
              Record expense
            </Button>
          ) : null
        }
      />

      {expenses.isError ? (
        <Alert tone="danger" title="The expenses could not be loaded" className="mb-4">
          <p>{errorMessage(expenses.error)}</p>
        </Alert>
      ) : null}

      <MetricGrid
        items={[
          {
            value: data ? money(data.expenseTotal) : '—',
            label: filtered ? 'Total (this filter)' : 'Total recorded',
          },
          {
            value: data ? money(data.currentMonthExpenseTotal) : '—',
            label: 'This month',
          },
          {
            value: data ? `${data.totalCount}` : '—',
            label: 'Expenses recorded',
          },
        ]}
      />


      <Card className="mt-4 p-[0.9rem]">
        <div className="flex flex-wrap items-end gap-[0.6rem]">
          <SearchField
            value={filters.search}
            onChange={(event) => {
              setPage(1)
              setFilters((current) => ({ ...current, search: event.target.value }))
            }}
            placeholder="Search description or reference"
            label="Search expenses"
            className="min-w-[14rem] flex-1"
          />

          <label className="flex flex-col gap-[0.2rem] text-caption text-muted">
            Category
            <select
              className="select h-control-sm min-h-0 text-meta"
              value={filters.category}
              onChange={(event) => {
                setPage(1)
                setFilters((current) => ({ ...current, category: event.target.value }))
              }}
            >
              <option value="">All categories</option>
              {(categories.data ?? []).map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-[0.2rem] text-caption text-muted">
            Paid by
            <select
              className="select h-control-sm min-h-0 text-meta"
              value={filters.paymentMethod}
              onChange={(event) => {
                setPage(1)
                setFilters((current) => ({ ...current, paymentMethod: event.target.value }))
              }}
            >
              <option value="">Any method</option>
              {PAYMENT_METHOD_OPTIONS.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-[0.2rem] text-caption text-muted">
            From
            <input
              type="date"
              className="input h-control-sm min-h-0 text-meta"
              value={filters.from}
              onChange={(event) => {
                setPage(1)
                setFilters((current) => ({ ...current, from: event.target.value }))
              }}
            />
          </label>

          <label className="flex flex-col gap-[0.2rem] text-caption text-muted">
            To
            <input
              type="date"
              className="input h-control-sm min-h-0 text-meta"
              value={filters.to}
              onChange={(event) => {
                setPage(1)
                setFilters((current) => ({ ...current, to: event.target.value }))
              }}
            />
          </label>

          {filtered ? (
            <Button
              size="sm"
              onClick={() => {
                setPage(1)
                setFilters(EMPTY_FILTERS)
              }}
            >
              Clear filters
            </Button>
          ) : null}
        </div>
      </Card>

      <Card className="mt-4 overflow-hidden">
        {expenses.isLoading && !data ? (
          <div className="grid gap-[0.5rem] p-[0.8rem]" aria-busy="true">
            <Skeleton className="h-[2.5rem]" />
            <Skeleton className="h-[2.5rem]" />
            <Skeleton className="h-[2.5rem]" />
          </div>
        ) : null}

        {data && data.items.length === 0 ? (
          <EmptyState
            title="No expenses recorded"
            description={
              canManage
                ? 'Record rent, stock, transport or utilities — each one becomes Money Out in your Cashbook.'
                : 'No expenses have been recorded for this business yet.'
            }
          />
        ) : null}

        {data && data.items.length > 0 ? (
          <ul className="divide-y divide-line">
            {data.items.map((entry) => (
              <ExpenseRegisterRow
                key={entry.id}
                entry={entry}
                canManage={canManage}
                onEdit={() => {
                  setEditing(entry)
                  setExpenseOpen(true)
                }}
                onVoid={() => setVoidTarget(entry)}
              />
            ))}
          </ul>
        ) : null}

        {data && data.totalCount > PAGE_SIZE ? (
          <div className="border-t border-line p-[0.6rem]">
            <PaginationBar page={page} pageCount={pageCount} onPageChange={setPage} />
          </div>
        ) : null}
      </Card>

      <RecordExpenseDialog
        open={expenseOpen}
        expense={
          editing
            ? {
                id: editing.id,
                amount: editing.amount,
                category: editing.category,
                paymentMethod: editing.paymentMethod,
                description: editing.description,
                externalReference: editing.externalReference,
                reconciled: editing.reconciledAt != null,
              }
            : null
        }
        onClose={() => {
          setExpenseOpen(false)
          setEditing(null)
        }}
      />

      <VoidExpenseDialog expense={voidTarget} onClose={() => setVoidTarget(null)} />
    </>
  )
}
/**
 * One row of the expense register.
 *
 * The audit history is loaded only when the row is opened, so the register stays cheap — and it
 * shows WHY a figure changed, which is the part of an audit an owner actually needs. A reconciled
 * expense is a settled fact and is not offered for editing; a voided one is still listed, marked,
 * and stops counting.
 */
function ExpenseRegisterRow({
  entry,
  canManage,
  onEdit,
  onVoid,
}: {
  entry: FinancialTransaction
  canManage: boolean
  onEdit: () => void
  onVoid: () => void
}) {
  const [showHistory, setShowHistory] = useState(false)
  const audit = useFinancialAuditTrail(showHistory ? entry.id : null)

  const reconciled = entry.reconciledAt != null
  const editable = canManage && !entry.isVoided && !reconciled

  return (
    <li className="px-[0.8rem] py-[0.65rem]">
      <div className="flex flex-wrap items-start justify-between gap-[0.5rem]">
        <div className="min-w-0">
          <p className="truncate text-meta font-medium">
            {entry.description ?? entry.categoryLabel ?? 'Expense'}
          </p>
          <p className="text-caption text-muted">
            {formatDate(entry.transactionDate)} · {entry.reference}
            {entry.externalReference ? ` · ${entry.externalReference}` : ''}
          </p>
          <p className="text-caption text-muted">
            {entry.categoryLabel ?? 'Uncategorised'} · {paymentMethodLabel(entry.paymentMethod)} ·{' '}
            Recorded by {entry.createdByName ?? 'Punched'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-[0.5rem]">
          {entry.isVoided ? <Badge tone="neutral">Voided</Badge> : null}
          {reconciled ? <Badge tone="info">Reconciled</Badge> : null}
          <span className="tabular text-meta font-semibold text-danger-ink">-{money(entry.amount)}</span>

          <Button size="sm" onClick={() => setShowHistory((current) => !current)}>
            History
          </Button>
          {editable ? (
            <Button size="sm" onClick={onEdit}>
              <Pencil className="size-3.5" aria-hidden="true" />
              Edit
            </Button>
          ) : null}
          {canManage && !entry.isVoided ? (
            <Button size="sm" variant="danger" onClick={onVoid}>
              <Undo2 className="size-3.5" aria-hidden="true" />
              Void
            </Button>
          ) : null}
        </div>
      </div>

      {entry.isVoided && entry.voidReason ? (
        <p className="mt-[0.3rem] text-caption text-muted">
          <Receipt className="mr-[0.2rem] inline size-3" aria-hidden="true" />
          Voided: {entry.voidReason}
        </p>
      ) : null}

      {showHistory ? (
        <div className="mt-[0.5rem] rounded-md bg-sunken p-[0.6rem]">
          {audit.isLoading ? (
            <p className="inline-flex items-center gap-[0.4rem] text-caption text-muted">
              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> Loading history…
            </p>
          ) : null}
          {audit.data && audit.data.length === 0 ? (
            <p className="text-caption text-muted">No changes recorded.</p>
          ) : null}
          {audit.data && audit.data.length > 0 ? (
            <ul className="flex flex-col gap-[0.3rem] text-caption">
              {audit.data.map((log) => (
                <li key={log.id}>
                  <b className="font-semibold">{log.action}</b>
                  {log.actorName ? ` by ${log.actorName}` : ''} · {formatDateTime(log.createdAt)}
                  {log.note ? ` — ${log.note}` : ''}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </li>
  )
}
