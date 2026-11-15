import { createFileRoute, Link } from '@tanstack/react-router'
import { BarChart3, Plus, Receipt } from 'lucide-react'
import { useMemo, useState } from 'react'
import { AddIncomeDialog } from '../components/finances/AddIncomeDialog'
import { FinanceFilterBar } from '../components/finances/FinanceFilterBar'
import { FinanceTable, cellClass, type FinanceColumn } from '../components/finances/FinanceTable'
import { PeriodPicker } from '../components/finances/PeriodPicker'
import { RecordExpenseDialog } from '../components/finances/RecordExpenseDialog'
import { ModulePlaceholder } from '../components/shell/ModulePlaceholder'
import { Alert } from '../components/ui/alert'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Checkbox } from '../components/ui/checkbox'
import { EmptyState } from '../components/ui/empty-state'
import { MetricTile } from '../components/ui/metric-tile'
import { PageHeader } from '../components/ui/page-header'
import { PaginationBar } from '../components/ui/pagination-bar'
import { Tabs } from '../components/ui/tabs'
import { errorMessage } from '../lib/api/client'
import { useDashboardContext } from '../lib/dashboard/dashboard-context'
import { MODULE } from '../lib/entitlements'
import { useCashbook, useExpenseCategories, useFinancialOverview } from '../lib/finances/api'
import type { CashbookEntry } from '../lib/finances/api'
import { DEFAULT_PERIOD, periodLabel } from '../lib/finances/period'
import {
  PAYMENT_METHOD_OPTIONS,
  paymentMethodLabel,
  sourceLabel,
  transactionTypeLabel,
} from '../lib/finances/labels'
import { formatDate, money } from '../lib/format'

export const Route = createFileRoute('/dashboard/finances/cashbook')({
  component: CashbookPage,
})

const PAGE_SIZE = 25

type DirectionLens = 'all' | 'incoming' | 'outgoing'

type Filters = {
  source: string
  category: string
  paymentMethod: string
  recordedBy: string
  customer: string
  minAmount: string
  maxAmount: string
  includeVoided: boolean
}

const EMPTY_FILTERS: Filters = {
  source: '',
  category: '',
  paymentMethod: '',
  recordedBy: '',
  customer: '',
  minAmount: '',
  maxAmount: '',
  includeVoided: false,
}

/** All / Money in / Money out — the direction axis, straight from the server's classification. */
const DIRECTION_TABS: readonly { value: DirectionLens; label: string }[] = [
  { value: 'all', label: 'All entries' },
  { value: 'incoming', label: 'Money in' },
  { value: 'outgoing', label: 'Money out' },
]

/**
 * The Cashbook — the business's consolidated financial book.
 *
 * One table, both directions: verified appointment payments, walk-ins, product sales and manual
 * income on the Money In side; expenses, transport, supplier payments and refunds on the Money Out
 * side. Separate tables for "payments" and "expenses" is exactly what this screen exists to avoid —
 * the question it answers is "what happened to my money?", and that question does not divide along
 * Money in / Money out.
 *
 * module boundaries.
 *
 * Two rules it holds to:
 *  - **Direction is the server's**, not the client's reading of a type name. A refund is money out
 *    even though it reverses money in, and every row says so in words as well as in its column.
 *  - **Pending and rejected claims are absent.** A pasted M-Pesa message nobody has verified is not
 *    a movement; it is a claim, and it lives in Reconciliation.
 */
function CashbookPage() {
  const { hasModule, hasPermission } = useDashboardContext()
  const [period, setPeriod] = useState({ period: DEFAULT_PERIOD as string, from: '', to: '' })
  const [lens, setLens] = useState<DirectionLens>('all')
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [search, setSearch] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(PAGE_SIZE)
  const [incomeOpen, setIncomeOpen] = useState(false)
  const [expenseOpen, setExpenseOpen] = useState(false)

  const enabled = hasModule(MODULE.financials)

  const query = useMemo(
    () => ({
      from: period.from ? new Date(period.from).toISOString() : undefined,
      to: period.to ? new Date(`${period.to}T23:59:59.999`).toISOString() : undefined,
      direction: lens === 'all' ? undefined : lens,
      source: filters.source || undefined,
      category: filters.category || undefined,
      paymentMethod: filters.paymentMethod || undefined,
      recordedBy: filters.recordedBy.trim() || undefined,
      customer: filters.customer.trim() || undefined,
      minAmount: filters.minAmount ? Number(filters.minAmount) : undefined,
      maxAmount: filters.maxAmount ? Number(filters.maxAmount) : undefined,
      includeVoided: filters.includeVoided,
      search: search.trim() || undefined,
      page,
      pageSize: size,
    }),
    [period, lens, filters, search, page, size],
  )

  const overview = useFinancialOverview(period.period, period.from || null, period.to || null, enabled)
  const categories = useExpenseCategories(enabled && drawerOpen)
  const book = useCashbook(query, enabled)

  const update = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    setPage(1)
    setFilters((current) => ({ ...current, [key]: value }))
  }

  const activeCount =
    (lens !== 'all' ? 1 : 0) +
    Object.entries(filters).filter(([, value]) => value !== '' && value !== false).length

  const clearAll = () => {
    setPage(1)
    setSearch('')
    setLens('all')
    setFilters(EMPTY_FILTERS)
  }

  if (!enabled) {
    return <ModulePlaceholder navKey="finances-cashbook" />
  }

  const data = book.data
  const pageCount = data?.totalPages ?? 1
  const canRecordIncome = hasPermission('finances.record_income')
  const canManageExpenses = hasPermission('finances.manage_expenses')
  const canSeeAnalytics = hasPermission('finances.analytics.view')

  const columns: readonly FinanceColumn[] = [
    { key: 'date', label: 'Date' },
    { key: 'description', label: 'Movement' },
    { key: 'in', label: 'Money in', align: 'right' },
    { key: 'out', label: 'Money out', align: 'right' },
    { key: 'method', label: 'Method', className: cellClass('md') },
    { key: 'payee', label: 'Customer / payee', className: cellClass('lg') },
    { key: 'source', label: 'Source', className: cellClass('xl') },
    { key: 'type', label: 'Type', className: cellClass('xl') },
    { key: 'recordedBy', label: 'Recorded by', className: cellClass('xl') },
    { key: 'balance', label: 'Running net', align: 'right', className: cellClass('lg') },
    { key: 'actions', label: '', align: 'right' },
  ]

  // The applied filters, as removable chips. A hidden filter is a filter that makes the figures
  // look wrong, so the active ones are always visible next to the table.
  const chips = [
    lens !== 'all'
      ? {
          id: 'direction',
          label: lens === 'incoming' ? 'Money in' : 'Money out',
          onRemove: () => {
            setPage(1)
            setLens('all')
          },
        }
      : null,
    filters.source
      ? { id: 'source', label: sourceLabel(filters.source), onRemove: () => update('source', '') }
      : null,
    filters.category
      ? {
          id: 'category',
          label:
            categories.data?.find((option) => option.key === filters.category)?.label ??
            filters.category,
          onRemove: () => update('category', ''),
        }
      : null,
    filters.paymentMethod
      ? {
          id: 'method',
          label: paymentMethodLabel(filters.paymentMethod),
          onRemove: () => update('paymentMethod', ''),
        }
      : null,
    filters.recordedBy
      ? {
          id: 'recordedBy',
          label: `Recorded by ${filters.recordedBy}`,
          onRemove: () => update('recordedBy', ''),
        }
      : null,
    filters.customer
      ? { id: 'customer', label: `Payee ${filters.customer}`, onRemove: () => update('customer', '') }
      : null,
    filters.minAmount
      ? { id: 'min', label: `At least ${money(Number(filters.minAmount))}`, onRemove: () => update('minAmount', '') }
      : null,
    filters.maxAmount
      ? { id: 'max', label: `At most ${money(Number(filters.maxAmount))}`, onRemove: () => update('maxAmount', '') }
      : null,
    filters.includeVoided
      ? { id: 'voided', label: 'Including voided', onRemove: () => update('includeVoided', false) }
      : null,
  ].filter((chip): chip is { id: string; label: string; onRemove: () => void } => chip !== null)

  return (
    <>
      <PageHeader
        title="Cashbook"
        description="Every movement the business recorded — money in and money out — in one book."
        actions={
          <div className="flex flex-wrap gap-[0.5rem]">
            {canRecordIncome ? (
              <Button onClick={() => setIncomeOpen(true)}>
                <Plus className="size-4" aria-hidden="true" />
                Record income
              </Button>
            ) : null}
            {canManageExpenses ? (
              <Button onClick={() => setExpenseOpen(true)}>
                <Receipt className="size-4" aria-hidden="true" />
                Record expense
              </Button>
            ) : null}
            {canSeeAnalytics ? (
              <Link to="/dashboard/finances/analytics" className="btn btn-sm">
                <BarChart3 className="size-4" aria-hidden="true" />
                Analytics
              </Link>
            ) : null}
          </div>
        }
      />

      {overview.isError ? (
        <Alert tone="danger" title="The financial summary could not be loaded" className="mb-4">
          <p>{errorMessage(overview.error)}</p>
          <Button
            className="mt-[0.6rem]"
            size="sm"
            onClick={() => void overview.refetch()}
            disabled={overview.isFetching}
          >
            Try again
          </Button>
        </Alert>
      ) : null}

      <div className="grid grid-cols-[repeat(auto-fit,minmax(9rem,1fr))] gap-[0.7rem]">
        <MetricTile value={data ? money(data.totalInflows) : '—'} label="Money in" />
        <MetricTile value={data ? money(data.totalOutflows) : '—'} label="Money out" />
        <MetricTile value={data ? money(data.netCashMovement) : '—'} label="Net recorded movement" />
        <MetricTile value={data ? `${data.totalCount}` : '—'} label="Movements" />
      </div>

      <p className="mt-[0.5rem] text-caption text-muted">
        {data ? `${periodLabel(data.period)} · ` : ''}
        Net movement is what you recorded in minus what you recorded out — it is <b>not</b> the
        balance of a bank or M-Pesa account. “Running net” carries the same figure down the list,
        starting at zero at the start of the period.
        {overview.data && overview.data.totals.pendingVerification > 0
          ? ` Pending claims (${money(overview.data.totals.pendingVerification)}) are NOT in this book — they are waiting for a decision in Reconciliation.`
          : ''}
      </p>

      <div className="mt-4">
        <Tabs
          label="Filter the book by direction"
          items={DIRECTION_TABS}
          value={lens}
          onValueChange={(value) => {
            setPage(1)
            setLens(value)
          }}
        />
      </div>

      <FinanceFilterBar
        className="mt-[0.8rem]"
        search={search}
        onSearchChange={(value) => {
          setPage(1)
          setSearch(value)
        }}
        searchPlaceholder="Reference, description or M-Pesa code"
        activeCount={activeCount}
        drawerOpen={drawerOpen}
        onDrawerOpenChange={setDrawerOpen}
        onClear={clearAll}
        chips={chips}
        resultSummary={
          data
            ? `${data.totalCount} movement(s)${data.totalCount > 0 ? ` · page ${data.page} of ${pageCount}` : ''}`
            : undefined
        }
        drawerTitle="Filter the cashbook"
        drawerDescription="Date range, source, type, method, amount and who recorded it — all applied on the server."
      >
        <div className="grid gap-[0.9rem]">
          <PeriodPicker
            period={period.period}
            from={period.from}
            to={period.to}
            onChange={(next) => {
              setPage(1)
              setPeriod(next)
            }}
          />

          <label className="flex flex-col gap-[0.2rem] text-caption text-muted">
            Source
            <select className="select" value={filters.source} onChange={(event) => update('source', event.target.value)}>
              <option value="">Any source</option>
              <option value="punched_booking">Punched appointment</option>
              <option value="walk_in">Walk-in</option>
              <option value="product_sale">Product sale</option>
              <option value="manual_income">Recorded manually</option>
              <option value="other">Other</option>
            </select>
          </label>

          <label className="flex flex-col gap-[0.2rem] text-caption text-muted">
            Type / category
            <select className="select" value={filters.category} onChange={(event) => update('category', event.target.value)}>
              <option value="">Any category</option>
              {(categories.data ?? []).map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-[0.2rem] text-caption text-muted">
            Payment method
            <select
              className="select"
              value={filters.paymentMethod}
              onChange={(event) => update('paymentMethod', event.target.value)}
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
            Customer or payee
            <input
              className="input"
              value={filters.customer}
              placeholder="Name on the receipt or the expense"
              onChange={(event) => update('customer', event.target.value)}
            />
          </label>

          <label className="flex flex-col gap-[0.2rem] text-caption text-muted">
            Recorded by
            <input
              className="input"
              value={filters.recordedBy}
              placeholder="Name of whoever entered it"
              onChange={(event) => update('recordedBy', event.target.value)}
            />
          </label>

          <div className="grid grid-cols-2 gap-[0.8rem]">
            <label className="flex flex-col gap-[0.2rem] text-caption text-muted">
              At least (KES)
              <input
                className="input"
                type="number"
                min="0"
                inputMode="decimal"
                value={filters.minAmount}
                onChange={(event) => update('minAmount', event.target.value)}
              />
            </label>
            <label className="flex flex-col gap-[0.2rem] text-caption text-muted">
              At most (KES)
              <input
                className="input"
                type="number"
                min="0"
                inputMode="decimal"
                value={filters.maxAmount}
                onChange={(event) => update('maxAmount', event.target.value)}
              />
            </label>
          </div>

          <Checkbox
            checked={filters.includeVoided}
            onCheckedChange={(checked) => update('includeVoided', checked)}
            label="Show voided entries (they never count towards the totals)"
          />
        </div>
      </FinanceFilterBar>

      <FinanceTable
        className="mt-[0.8rem]"
        label="Cashbook entries"
        columns={columns}
        rows={data?.entries ?? []}
        rowKey={(entry) => entry.id}
        loading={book.isFetching && !data}
        error={book.isError ? book.error : undefined}
        onRetry={() => void book.refetch()}
        rowClassName={(entry) => (entry.isVoided ? 'opacity-60' : undefined)}
        empty={
          <EmptyState
            title="Nothing recorded in this period"
            description="Verified payments, recorded income, expenses and refunds all appear here. Pending M-Pesa claims stay in Reconciliation until you decide on them."
          />
        }
        renderRow={(entry) => <CashbookCells entry={entry} />}
      />

      {data && data.totalCount > 0 ? (
        <div className="mt-[0.8rem]">
          <PaginationBar
            page={page}
            pageCount={pageCount}
            onPageChange={setPage}
            pageSize={size}
            onPageSizeChange={(next) => {
              setPage(1)
              setSize(next)
            }}
          />
        </div>
      ) : null}

      <AddIncomeDialog open={incomeOpen} onClose={() => setIncomeOpen(false)} />
      <RecordExpenseDialog open={expenseOpen} expense={null} onClose={() => setExpenseOpen(false)} />
    </>
  )
}
/**
 * One row of the book.
 *
 * The direction is stated three times over — which column the money landed in, a word next to the
 * description, and the sign on the figure — because that is the single fact an owner scans a
 * cashbook for, and a colour alone is not accessible.
 */
function CashbookCells({ entry }: { entry: CashbookEntry }) {
  const incoming = entry.direction === 'incoming'
  const isExpense = entry.type === 'expense'

  return (
    <>
      <td className="whitespace-nowrap text-meta text-muted">{formatDate(entry.date)}</td>

      <td>
        <div className="flex min-w-0 flex-col gap-[0.15rem]">
          {isExpense ? (
            <Link
              to="/dashboard/finances/expenses/$expenseId"
              params={{ expenseId: entry.id }}
              className="truncate font-semibold tracking-snug hover:underline focus-visible:shadow-ring focus-visible:outline-none"
            >
              {entry.description ?? 'Expense'}
            </Link>
          ) : (
            <Link
              to="/dashboard/finances/transactions/$transactionId"
              params={{ transactionId: entry.id }}
              className="truncate font-semibold tracking-snug hover:underline focus-visible:shadow-ring focus-visible:outline-none"
            >
              {entry.description ?? transactionTypeLabel(entry.type)}
            </Link>
          )}

          <span className="flex flex-wrap items-center gap-[0.35rem] text-caption text-muted">
            <Badge tone={incoming ? 'success' : 'warning'}>
              {incoming ? 'Money in' : 'Money out'}
            </Badge>
            <span className="font-mono">{entry.reference}</span>
            {entry.isVoided ? <Badge tone="neutral">Voided</Badge> : null}
          </span>
        </div>
      </td>

      <td className="text-right tabular text-meta font-semibold">
        {incoming ? money(entry.amount) : <span className="text-subtle">—</span>}
      </td>

      <td className="text-right tabular text-meta font-semibold text-danger-ink">
        {incoming ? <span className="text-subtle">—</span> : money(entry.amount)}
      </td>

      <td className={cellClass('md')}>{paymentMethodLabel(entry.paymentMethod)}</td>
      <td className={cellClass('lg')}>{entry.customerName ?? '—'}</td>
      <td className={cellClass('xl')}>{sourceLabel(entry.source)}</td>
      <td className={cellClass('xl')}>{transactionTypeLabel(entry.type)}</td>
      <td className={cellClass('xl')}>{entry.recordedByName ?? 'Punched'}</td>
      <td className={cellClass('lg', 'right') + ' tabular'}>{money(entry.runningBalance)}</td>

      <td className="text-right">
        <Link
          to={isExpense ? '/dashboard/finances/expenses/$expenseId' : '/dashboard/finances/transactions/$transactionId'}
          params={isExpense ? { expenseId: entry.id } : { transactionId: entry.id }}
          className="link text-meta"
        >
          Open
        </Link>
      </td>
    </>
  )
}
