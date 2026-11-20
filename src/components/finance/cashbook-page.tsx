import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Filter, LayoutGrid, Plus, Table2, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '../ui/page-header'
import { Button } from '../ui/button'
import { SearchField } from '../ui/search-field'
import { EmptyState } from '../ui/empty-state'
import { Alert } from '../ui/alert'
import { Chip, ChipGroup } from '../ui/chip'
import { FilterDrawer, FilterSummary } from '../ui/filter-drawer'
import { PaginationBar } from '../ui/pagination-bar'
import { SelectionBar } from '../ui/selection-bar'
import { BulkActionBar } from '../ui/bulk-action-bar'
import { SegmentedControl } from '../ui/segmented-control'
import type { MenuItem } from '../ui/menu'
import { FinanceTable, FinanceTableSkeleton, type FinanceCardData, type FinanceColumn, type FinanceSortGroup } from './table'
import { MethodPill } from './pills'
import { FinanceBreakdownBars, FinanceStats, FinanceSummaryPanel, type FinanceMetric } from './summary'
import { CashbookEntrySheet } from './cashbook-entry-sheet'
import { VoidEntryDialog } from './void-entry-dialog'
import {
  financesApi,
  useCashbook,
  useExpenseActions,
  useExpenseCategories,
  useFinancialOverview,
  useRecordIncome,
  type CashbookEntry,
  type FinancialFilters,
  type FinancialPaymentMethod,
} from '../../lib/finances/api'
import { useDashboardContext } from '../../lib/dashboard/dashboard-context'
import { MODULE } from '../../lib/entitlements'
import { errorMessage } from '../../lib/api/client'
import { money } from '../../lib/format'
import { financeDate, financeTime } from '../../lib/finances/format'
import { financeMethodLabel } from '../../lib/finances/status'
import { downloadCsv } from '../../lib/finances/csv'
import { collectFilteredRows } from '../../lib/finances/export'
import { presetRange, syncUrlParam, useDebouncedValue } from '../../lib/finances/use-debounced-value'
import {
  DEFAULT_FINANCE_SORT,
  FINANCE_SORT_OPTIONS,
  financeSortLabel,
  ledgerSortParams,
  parseFinanceSort,
  toggleFinanceSort,
  type FinanceSort,
} from '../../lib/finances/sort'
import { RecordIncomeSheet, type RecordIncomeSource } from './record-income-sheet'
import { RecordExpenseSheet } from './record-expense-sheet'

type EntryFilter = 'all' | 'in' | 'out'
type View = 'table' | 'cards'

const METHOD_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'cash', label: 'Cash' },
  { value: 'mpesa_till', label: 'M-Pesa' },
  { value: 'bank_transfer', label: 'Bank' },
  { value: 'card', label: 'Card' },
  { value: 'other', label: 'Other' },
] as const

function parseSearch() {
  const params = Object.fromEntries(new URLSearchParams(window.location.search))
  const page = Math.max(1, Number(params.page) || 1)
  const pageSize = [10, 25, 50].includes(Number(params.pageSize)) ? Number(params.pageSize) : 10
  return {
    type: (params.type === 'in' || params.type === 'out' ? params.type : 'all') as EntryFilter,
    method: typeof params.method === 'string' ? params.method : 'all',
    voided: params.voided === '1' ? '1' : '0',
    search: typeof params.search === 'string' ? params.search : '',
    from: params.from || undefined,
    to: params.to || undefined,
    sort: parseFinanceSort(params.sort),
    view: (params.view === 'cards' ? 'cards' : 'table') as View,
    page,
    pageSize,
  }
}

async function copyValue(value: string, label: string) {
  try {
    if (!navigator.clipboard) throw new Error('Clipboard unavailable')
    await navigator.clipboard.writeText(value)
    toast.success(`Copied ${label} ${value}`)
  } catch {
    toast.error('Copy is not available here')
  }
}


export function CashbookPage() {
  const { hasModule, hasPermission } = useDashboardContext()
  const enabled = hasModule(MODULE.financials) && hasPermission('finances.view')
  const canRecordIncome = hasPermission('finances.record_income')
  const canManageExpenses = hasPermission('finances.manage_expenses')
  const navigate = useNavigate()

  const parsed = parseSearch()
  const typeFilter = parsed.type
  const methodFilter = parsed.method
  const voidedFilter = parsed.voided
  const fromFilter = parsed.from
  const toFilter = parsed.to
  const sort: FinanceSort = parsed.sort
  const view: View = parsed.view
  const page = parsed.page
  const pageSize = parsed.pageSize

  const [filterOpen, setFilterOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [incomeOpen, setIncomeOpen] = useState(false)
  const [expenseOpen, setExpenseOpen] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [voidTarget, setVoidTarget] = useState<CashbookEntry | null>(null)
  const [voidReason, setVoidReason] = useState('')
  const [searchInput, setSearchInput] = useState(parsed.search)
  const [preset, setPreset] = useState('all')
  const [exporting, setExporting] = useState(false)
  const debouncedSearch = useDebouncedValue(searchInput, 300)

  useEffect(() => {
    const current = new URLSearchParams(window.location.search).get('search') ?? ''
    if (current !== debouncedSearch) syncUrlParam('search', debouncedSearch)
  }, [debouncedSearch])

  const sortParams = ledgerSortParams(sort)

  const cashbookFilters: FinancialFilters = {
    direction: typeFilter === 'in' ? 'incoming' : typeFilter === 'out' ? 'outgoing' : undefined,
    paymentMethod: methodFilter === 'all' ? undefined : methodFilter,
    search: debouncedSearch || undefined,
    from: fromFilter,
    to: toFilter,
    includeVoided: voidedFilter === '1',
    sort: sortParams.sort,
    sortDirection: sortParams.sortDirection,
  }

  const cashbook = useCashbook({ ...cashbookFilters, page, pageSize }, enabled)
  // Outstanding balances are a live snapshot of what live appointments still owe, so the overview
  // is the right source for them — never a period sum.
  const overview = useFinancialOverview('last_30_days', fromFilter, toFilter, enabled)
  const categories = useExpenseCategories(enabled)
  const recordIncome = useRecordIncome()
  const { create: createExpense, voidExpense, voidIncome } = useExpenseActions()

  const data = cashbook.data
  const rows: CashbookEntry[] = data?.entries ?? []
  const totalCount = data?.totalCount ?? 0
  const pageCount = data?.totalPages ?? Math.max(1, Math.ceil(totalCount / pageSize))
  const isLoading = cashbook.isPending
  const isError = cashbook.isError
  const error = cashbook.error
  const categoryList = useMemo(() => categories.data ?? [], [categories.data])
  const totals = overview.data?.totals

  const selectedCount = selectedIds.size
  const selectedTotal = rows.reduce((sum, r) => (selectedIds.has(r.id) ? sum + r.amount : sum), 0)
  const selectedEntry = rows.find((r) => r.id === detailId) ?? null

  const updateUrl = (mutate: (url: URL) => void) => {
    const url = new URL(window.location.href)
    mutate(url)
    window.history.replaceState({}, '', url.toString())
    setSelectedIds(new Set())
  }

  const handlePageChange = (nextPage: number) => updateUrl((url) => url.searchParams.set('page', String(nextPage)))
  const handlePageSizeChange = (nextSize: number) =>
    updateUrl((url) => {
      url.searchParams.set('pageSize', String(nextSize))
      url.searchParams.set('page', '1')
    })

  const toggleRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  const togglePageSelect = (selectAll: boolean) => setSelectedIds(selectAll ? new Set(rows.map((r) => r.id)) : new Set())

  const setSort = (next: FinanceSort) =>
    updateUrl((url) => {
      if (next === DEFAULT_FINANCE_SORT) url.searchParams.delete('sort')
      else url.searchParams.set('sort', next)
      url.searchParams.set('page', '1')
    })

  const sortByGroup = (group: FinanceSortGroup) => {
    const target: FinanceSort =
      group === 'date'
        ? sort === 'date-d'
          ? 'date-a'
          : 'date-d'
        : group === 'amount'
          ? sort === 'amt-d'
            ? 'amt-a'
            : 'amt-d'
          : 'name-a'
    setSort(toggleFinanceSort(sort, target))
  }

  const setView = (next: View) =>
    updateUrl((url) => {
      if (next === 'table') url.searchParams.delete('view')
      else url.searchParams.set('view', next)
    })

  const applyPreset = (value: string) => {
    setPreset(value)
    const range = presetRange(value)
    updateUrl((url) => {
      if (range.from) url.searchParams.set('from', range.from)
      else url.searchParams.delete('from')
      if (range.to) url.searchParams.set('to', range.to)
      else url.searchParams.delete('to')
      url.searchParams.set('page', '1')
    })
  }
  const applyDate = (key: 'from' | 'to', value: string) => {
    setPreset('custom')
    updateUrl((url) => {
      if (value) url.searchParams.set(key, value)
      else url.searchParams.delete(key)
      url.searchParams.set('page', '1')
    })
  }
  const setFilter = (key: string, value: string) => {
    updateUrl((url) => {
      if (value && value !== 'all' && value !== '0') url.searchParams.set(key, value)
      else url.searchParams.delete(key)
      url.searchParams.set('page', '1')
    })
  }
  const resetFilters = () => {
    setPreset('all')
    setSearchInput('')
    updateUrl((url) => {
      for (const key of ['type', 'method', 'voided', 'search', 'from', 'to', 'sort', 'page']) url.searchParams.delete(key)
    })
    setFilterOpen(false)
  }


  const activeFilters = useMemo(() => {
    const chips: { id: string; label: string; onRemove: () => void }[] = []
    if (typeFilter !== 'all') {
      chips.push({
        id: 'type',
        label: `Entry: ${typeFilter === 'in' ? 'Income' : 'Expenses'}`,
        onRemove: () => setFilter('type', 'all'),
      })
    }
    if (methodFilter !== 'all') {
      chips.push({ id: 'method', label: `Method: ${financeMethodLabel(methodFilter)}`, onRemove: () => setFilter('method', 'all') })
    }
    if (voidedFilter === '1') chips.push({ id: 'voided', label: 'Voided: Show', onRemove: () => setFilter('voided', '0') })
    if (fromFilter || toFilter) chips.push({ id: 'date', label: 'Date range', onRemove: () => applyPreset('all') })
    if (sort !== DEFAULT_FINANCE_SORT) {
      chips.push({ id: 'sort', label: `Sort: ${financeSortLabel(sort)}`, onRemove: () => setSort(DEFAULT_FINANCE_SORT) })
    }
    if (debouncedSearch) {
      chips.push({ id: 'search', label: `Search: "${debouncedSearch}"`, onRemove: () => setSearchInput('') })
    }
    return chips
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter, methodFilter, voidedFilter, fromFilter, toFilter, debouncedSearch, sort])

  const handleSaveIncome = async (input: {
    amount: number
    source: RecordIncomeSource
    paymentMethod: FinancialPaymentMethod
    transactionReference?: string
    description: string
    customerName?: string
    transactionDate?: string
  }) => {
    await recordIncome.mutateAsync({
      amount: input.amount,
      source: input.source,
      paymentMethod: input.paymentMethod,
      transactionReference: input.transactionReference ?? null,
      description: input.description,
      customerName: input.customerName ?? null,
      transactionDate: input.transactionDate,
    })
    toast.success('Income recorded')
  }

  const handleSaveExpense = async (input: {
    amount: number
    category: string
    paymentMethod: FinancialPaymentMethod
    description: string
    payee?: string
    transactionDate?: string
  }) => {
    await createExpense.mutateAsync({
      amount: input.amount,
      category: input.category,
      paymentMethod: input.paymentMethod,
      description: input.description,
      payee: input.payee ?? null,
      transactionDate: input.transactionDate,
    })
    toast.success('Expense recorded · added to cashbook')
  }

  /** Only rows with a truthful void path: expenses, and income no payment produced. */
  const canVoidEntry = (row: CashbookEntry) =>
    !row.isVoided &&
    ((row.type === 'expense' && canManageExpenses) || (row.type === 'income' && !row.sourcePaymentId && canRecordIncome))

  const handleVoid = async () => {
    if (!voidTarget || !voidReason.trim()) return
    try {
      if (voidTarget.type === 'expense') await voidExpense.mutateAsync({ id: voidTarget.id, reason: voidReason })
      else await voidIncome.mutateAsync({ id: voidTarget.id, reason: voidReason })
      toast.success('Entry voided')
      setVoidTarget(null)
      setVoidReason('')
    } catch (err) {
      toast.error(errorMessage(err, 'Could not void the entry. Please try again.'))
    }
  }

  const openPayment = (paymentId: string) => {
    navigate({ to: '/dashboard/finances/payments/$paymentId', params: { paymentId } })
  }

  const exportCsv = async () => {
    if (exporting) return
    const selected = rows.filter((r) => selectedIds.has(r.id))
    setExporting(true)
    try {
      // Selected rows export exactly as chosen; otherwise every row behind the current filters.
      const list =
        selected.length > 0
          ? selected
          : await collectFilteredRows((nextPage, nextSize) =>
              financesApi
                .cashbook({ ...cashbookFilters, page: nextPage, pageSize: nextSize })
                .then((response) => ({ items: response.entries, totalCount: response.totalCount })),
            )

      if (list.length === 0) {
        toast.info('Nothing to export yet')
        return
      }

      downloadCsv('cashbook.csv', [
        ['Date', 'Reference', 'Description', 'Customer', 'Method', 'Direction', 'Amount (KES)', 'Running balance'],
        ...list.map((r) => [
          `${financeDate(r.date)} ${financeTime(r.date)}`,
          r.reference,
          r.description ?? '',
          r.customerName ?? '',
          financeMethodLabel(r.paymentMethod),
          r.direction === 'incoming' ? 'Income' : 'Expense',
          r.amount,
          r.runningBalance,
        ]),
      ])
      toast.success(`Exported ${list.length} row${list.length === 1 ? '' : 's'}`)
    } catch (err) {
      toast.error(errorMessage(err, 'Could not prepare the export. Please try again.'))
    } finally {
      setExporting(false)
    }
  }

  const rowMenuItems = (row: CashbookEntry): readonly MenuItem[] => {
    const items: MenuItem[] = []
    if (row.sourcePaymentId) {
      items.push({ label: 'Open payment', onSelect: () => openPayment(row.sourcePaymentId as string) })
    }
    items.push({ label: 'View entry details', onSelect: () => setDetailId(row.id) })
    items.push({ label: 'Copy reference', onSelect: () => void copyValue(row.reference, 'reference') })
    if (canVoidEntry(row)) {
      items.push({
        separatorBefore: true,
        label: 'Void entry',
        destructive: true,
        onSelect: () => {
          setVoidTarget(row)
          setVoidReason('')
        },
      })
    }
    return items
  }


  const columns: FinanceColumn<CashbookEntry>[] = [
    {
      id: 'entry',
      header: 'Entry',
      sortGroup: 'name',
      render: (row) => (
        <div className="flex min-w-0 items-center gap-[0.7rem]">
          <span
            className={`grid size-[2.2rem] shrink-0 place-items-center rounded-round text-[0.95rem] font-semibold ${
              row.direction === 'incoming' ? 'bg-success-soft text-success-ink' : 'bg-avatar-3 text-avatar-3-ink'
            }`}
            aria-hidden="true"
          >
            {row.direction === 'incoming' ? '+' : '−'}
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold tracking-snug">{row.description || row.reference}</p>
            <span className="block truncate text-caption text-muted">
              {row.customerName ? `${row.customerName} · ` : ''}
              {row.reference}
              {row.isVoided ? ' · Voided' : ''}
            </span>
          </div>
        </div>
      ),
    },
    {
      id: 'method',
      header: 'Method',
      hideBelow: 'sm',
      render: (row) => <MethodPill label={financeMethodLabel(row.paymentMethod)} cash={row.paymentMethod === 'cash'} />,
    },
    {
      id: 'date',
      header: 'Date',
      hideBelow: 'md',
      sortGroup: 'date',
      render: (row) => (
        <span className="block text-label">
          {financeDate(row.date)}
          <span className="block text-caption text-muted">{financeTime(row.date)}</span>
        </span>
      ),
    },
    {
      id: 'amount',
      header: 'Amount',
      align: 'right',
      sortGroup: 'amount',
      render: (row) => (
        <span
          className={`tabular font-semibold whitespace-nowrap ${row.direction === 'incoming' ? 'text-success-ink' : 'text-danger-ink'}`}
        >
          {row.direction === 'incoming' ? '+' : '−'}
          {money(row.amount)}
        </span>
      ),
    },
    {
      id: 'balance',
      header: 'Balance',
      hideBelow: 'lg',
      align: 'right',
      render: (row) => <span className="tabular text-meta">{money(row.runningBalance)}</span>,
    },
  ]

  const card = (row: CashbookEntry): FinanceCardData => ({
    tone: row.isVoided ? 'neutral' : row.direction === 'incoming' ? 'ok' : 'danger',
    leading: (
      <span
        className={`grid size-[2.2rem] shrink-0 place-items-center rounded-round text-[0.95rem] font-semibold ${
          row.direction === 'incoming' ? 'bg-success-soft text-success-ink' : 'bg-avatar-3 text-avatar-3-ink'
        }`}
        aria-hidden="true"
      >
        {row.direction === 'incoming' ? '+' : '−'}
      </span>
    ),
    title: row.description || row.reference,
    subtitle: `${row.customerName || 'Business'}${row.isVoided ? ' · Voided' : ''}`,
    amount: `${row.direction === 'incoming' ? '+' : '−'}${money(row.amount)}`,
    amountHint: row.direction === 'incoming' ? 'in' : 'out',
    fields: [
      { label: 'Reference', value: <span className="font-mono">{row.reference}</span> },
      { label: 'Balance after', value: <span className="tabular">{money(row.runningBalance)}</span> },
    ],
    footer: (
      <>
        <MethodPill label={financeMethodLabel(row.paymentMethod)} cash={row.paymentMethod === 'cash'} />
        <span className="text-caption text-muted">
          {financeDate(row.date)}, {financeTime(row.date)}
        </span>
      </>
    ),
  })

  const emptyState = (
    <EmptyState
      icon={<Wallet className="size-5" />}
      title="No cashbook entries"
      description="Record income or an expense to start your cashbook."
      action={
        canRecordIncome ? (
          <Button variant="primary" onClick={() => setIncomeOpen(true)}>
            <Plus className="size-4" aria-hidden="true" />
            Record income
          </Button>
        ) : null
      }
    />
  )

  const flows = data?.windowInflows ?? 0
  const outflows = data?.windowOutflows ?? 0
  const awaiting = totals?.paymentsAwaitingVerification ?? 0
  const awaitingCount = totals?.pendingVerificationCount ?? 0
  const viewNet = (data?.totalInflows ?? 0) - (data?.totalOutflows ?? 0)

  const metrics: FinanceMetric[] = [
    { key: 'income', label: 'Verified income', value: money(flows), hint: `Refunds ${money(data?.refunds ?? 0)}` },
    {
      key: 'expenses',
      label: 'Outflows',
      value: money(outflows),
      hint: 'Expenses + refunds',
    },
    {
      key: 'awaiting',
      label: 'Awaiting verification',
      value: money(awaiting),
      hint: `${awaitingCount} M-Pesa claim${awaitingCount === 1 ? '' : 's'}`,
      hot: awaitingCount > 0,
      onClick: () => navigate({ to: '/dashboard/finances/payments', search: { tab: 'claims' } as never }),
      actionLabel: awaitingCount > 0 ? 'Review claims' : undefined,
    },
    {
      key: 'outstanding',
      label: 'Outstanding balances',
      value: money(totals?.outstandingBalances ?? 0),
      hint: `${totals?.outstandingAppointmentCount ?? 0} appointments`,
    },
  ]

  if (!enabled) {
    return (
      <div>
        <PageHeader title="Cashbook" description="Every shilling in and out — the business's own books." />
        <EmptyState
          title="Finance is not available"
          description="This business's plan does not include the financials module, or your role cannot view finances."
        />
      </div>
    )
  }


  return (
    <div>
      <PageHeader
        title="Cashbook"
        description="Every shilling in and out — the business's own books."
        actions={
          <>
            {canRecordIncome ? (
              <Button variant="ghost" onClick={() => setIncomeOpen(true)}>
                <Plus className="size-4" aria-hidden="true" />
                Record income
              </Button>
            ) : null}
            {canManageExpenses ? (
              <Button variant="primary" onClick={() => setExpenseOpen(true)}>
                <Plus className="size-4" aria-hidden="true" />
                Record expense
              </Button>
            ) : null}
          </>
        }
      />

      <FinanceStats
        panel={
          <FinanceSummaryPanel
            label="Net cash movement"
            amount={data?.windowNetCashMovement ?? 0}
            badge={`${data?.entryCount ?? 0} entr${(data?.entryCount ?? 0) === 1 ? 'y' : 'ies'}`}
            segments={[
              { key: 'income', label: 'Income', value: flows, tone: 'accent' },
              { key: 'expenses', label: 'Outflows', value: outflows, tone: 'gold' },
            ]}
            legend={[
              { key: 'income', label: 'Income', value: money(flows), tone: 'accent' },
              { key: 'expenses', label: 'Outflows', value: money(outflows), tone: 'gold' },
            ]}
          />
        }
        metrics={metrics}
      />

      <FinanceBreakdownBars
        title="Income by method"
        items={(data?.paymentMethodBreakdown ?? []).map((item) => ({ key: item.key, label: item.label, amount: item.amount }))}
        formatAmount={(amount) => money(amount)}
        emptyLabel="No verified income has been recorded in this window yet."
      />

      <div className="mb-4 flex flex-wrap items-center gap-[0.6rem]">
        <SearchField
          className="min-w-[12rem] flex-1"
          label="Search cashbook"
          placeholder="Search description, customer or reference"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
        />
        <Button variant="ghost" onClick={() => setFilterOpen(true)} aria-label="Filters and sorting">
          <Filter className="size-4" aria-hidden="true" />
          Filters
          {activeFilters.length > 0 ? (
            <span className="ml-[0.1rem] inline-flex h-[1.25rem] min-w-[1.25rem] items-center justify-center rounded-pill bg-inverse px-[0.3rem] text-caption font-semibold text-on-inverse">
              {activeFilters.length}
            </span>
          ) : null}
        </Button>
        <SegmentedControl
          label="Layout"
          value={view}
          onValueChange={(next) => setView(next as View)}
          options={[
            {
              value: 'table',
              label: (
                <>
                  <Table2 className="size-4" aria-hidden="true" />
                  <span className="sr-only">Table view</span>
                </>
              ),
            },
            {
              value: 'cards',
              label: (
                <>
                  <LayoutGrid className="size-4" aria-hidden="true" />
                  <span className="sr-only">Card view</span>
                </>
              ),
            },
          ]}
          className="max-[34rem]:hidden"
        />
      </div>

      <FilterSummary filters={activeFilters} onClearAll={resetFilters} className="mb-3" />

      {isError ? (
        <Alert tone="danger" title="The cashbook could not be loaded" className="mb-4">
          <p>{errorMessage(error, 'Something went wrong. Please try again.')}</p>
          <Button size="sm" className="mt-2" onClick={() => cashbook.refetch()}>
            Try again
          </Button>
        </Alert>
      ) : null}

      {isLoading ? (
        <FinanceTableSkeleton rows={6} />
      ) : (
        <>
          <SelectionBar
            selectedCount={selectedCount}
            itemLabel={
              selectedCount > 0
                ? `selected · ${money(selectedTotal)}`
                : `${totalCount} entr${totalCount === 1 ? 'y' : 'ies'} · net ${money(viewNet)} in this view`
            }
            onClear={selectedCount > 0 ? () => setSelectedIds(new Set()) : undefined}
            actions={
              selectedCount === 0 ? (
                <Button size="sm" variant="ghost" onClick={() => void exportCsv()} disabled={exporting}>
                  {exporting ? 'Preparing…' : 'Export CSV'}
                </Button>
              ) : null
            }
            className="mb-[0.4rem]"
          />

          <FinanceTable
            rows={rows}
            rowId={(r) => r.id}
            columns={columns}
            selected={selectedIds}
            onToggleRow={toggleRow}
            onTogglePage={togglePageSelect}
            rowMenuItems={rowMenuItems}
            onOpen={(row) => (row.sourcePaymentId ? openPayment(row.sourcePaymentId) : setDetailId(row.id))}
            isVoided={(r) => r.isVoided}
            ariaLabel="Cashbook entries"
            empty={emptyState}
            card={card}
            view={view}
            sortGroup={sort.startsWith('date') ? 'date' : sort.startsWith('amt') ? 'amount' : 'name'}
            sortDirection={sort.endsWith('-a') ? 'asc' : 'desc'}
            onSortGroup={sortByGroup}
          />
        </>
      )}

      <PaginationBar
        page={page}
        pageCount={pageCount}
        onPageChange={handlePageChange}
        pageSize={pageSize}
        onPageSizeChange={handlePageSizeChange}
        className="mt-4"
      />

      <BulkActionBar
        selectedCount={selectedCount}
        itemLabel={`selected · ${money(selectedTotal)}`}
        onClear={() => setSelectedIds(new Set())}
        actions={
          <Button
            size="sm"
            variant="ghost"
            className="text-on-inverse hover:bg-on-inverse/10"
            onClick={() => void exportCsv()}
            disabled={exporting}
          >
            {exporting ? 'Preparing…' : 'Export CSV'}
          </Button>
        }
      />


      <FilterDrawer
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        title="Filters and sorting"
        description="Narrow the book by entry, method, voided state or date."
        onReset={resetFilters}
        applyLabel={`Show ${totalCount} result${totalCount === 1 ? '' : 's'}`}
        onApply={() => setFilterOpen(false)}
      >
        <div className="space-y-[1.1rem]">
          <div>
            <p className="mb-[0.5rem] text-label font-semibold">Sort by</p>
            <ChipGroup label="Sort by">
              {FINANCE_SORT_OPTIONS.map((option) => (
                <Chip key={option.value} pressed={sort === option.value} onPressedChange={() => setSort(option.value)}>
                  {option.label}
                </Chip>
              ))}
            </ChipGroup>
          </div>
          <div>
            <p className="mb-[0.5rem] text-label font-semibold">Entry</p>
            <ChipGroup label="Entry">
              {[
                ['all', 'All'],
                ['in', 'Income'],
                ['out', 'Expenses'],
              ].map(([value, label]) => (
                <Chip key={value} pressed={typeFilter === value} onPressedChange={() => setFilter('type', value)}>
                  {label}
                </Chip>
              ))}
            </ChipGroup>
          </div>
          <div>
            <p className="mb-[0.5rem] text-label font-semibold">Method</p>
            <ChipGroup label="Method">
              {METHOD_OPTIONS.map((option) => (
                <Chip
                  key={option.value}
                  pressed={methodFilter === option.value}
                  onPressedChange={() => setFilter('method', option.value)}
                >
                  {option.label}
                </Chip>
              ))}
            </ChipGroup>
          </div>
          <div>
            <p className="mb-[0.5rem] text-label font-semibold">Voided entries</p>
            <ChipGroup label="Voided entries">
              {[
                ['0', 'Hide'],
                ['1', 'Show'],
              ].map(([value, label]) => (
                <Chip key={value} pressed={voidedFilter === value} onPressedChange={() => setFilter('voided', value)}>
                  {label}
                </Chip>
              ))}
            </ChipGroup>
            <p className="mt-[0.4rem] text-caption text-subtle">
              Voided entries never count towards totals or the running balance, whether they are shown or not.
            </p>
          </div>
          <div>
            <p className="mb-[0.5rem] text-label font-semibold">Date</p>
            <ChipGroup label="Date">
              {[
                ['all', 'All time'],
                ['today', 'Today'],
                ['7d', 'Last 7 days'],
                ['30d', 'Last 30 days'],
              ].map(([value, label]) => (
                <Chip key={value} pressed={preset === value} onPressedChange={() => applyPreset(value)}>
                  {label}
                </Chip>
              ))}
            </ChipGroup>
            <div className="mt-[0.6rem] flex items-center gap-[0.5rem]">
              <input
                type="date"
                value={fromFilter ?? ''}
                onChange={(event) => applyDate('from', event.target.value)}
                className="input"
                aria-label="From"
              />
              <span className="text-meta text-muted">to</span>
              <input
                type="date"
                value={toFilter ?? ''}
                onChange={(event) => applyDate('to', event.target.value)}
                className="input"
                aria-label="To"
              />
            </div>
          </div>
        </div>
      </FilterDrawer>

      <CashbookEntrySheet
        open={detailId !== null}
        onClose={() => setDetailId(null)}
        entry={selectedEntry}
        onOpenPayment={openPayment}
        canVoid={selectedEntry ? canVoidEntry(selectedEntry) : false}
        onVoid={() => {
          if (!selectedEntry) return
          setVoidTarget(selectedEntry)
          setVoidReason('')
          setDetailId(null)
        }}
      />

      <VoidEntryDialog
        open={voidTarget !== null}
        onClose={() => {
          setVoidTarget(null)
          setVoidReason('')
        }}
        subject={
          voidTarget
            ? { description: voidTarget.description, reference: voidTarget.reference, amount: voidTarget.amount }
            : null
        }
        kind={voidTarget?.type === 'expense' ? 'expense' : 'income'}
        reason={voidReason}
        onReasonChange={setVoidReason}
        onConfirm={() => void handleVoid()}
        pending={voidExpense.isPending || voidIncome.isPending}
      />

      <RecordIncomeSheet open={incomeOpen} onClose={() => setIncomeOpen(false)} onSave={handleSaveIncome} />
      <RecordExpenseSheet
        open={expenseOpen}
        onClose={() => setExpenseOpen(false)}
        categories={categoryList}
        onSave={handleSaveExpense}
      />
    </div>
  )
}

