import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { ArrowDownLeft, ArrowUpRight, Filter, Plus, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '../ui/page-header'
import { Button } from '../ui/button'
import { SearchField } from '../ui/search-field'
import { EmptyState } from '../ui/empty-state'
import { Alert } from '../ui/alert'
import { Card } from '../ui/card'
import { Chip, ChipGroup } from '../ui/chip'
import { FilterDrawer, FilterSummary } from '../ui/filter-drawer'
import { StatStrip } from '../ui/stat-tile'
import { PaginationBar } from '../ui/pagination-bar'
import { SelectionBar } from '../ui/selection-bar'
import { BulkActionBar } from '../ui/bulk-action-bar'
import { MethodPill } from './pills'
import type { MenuItem } from '../ui/menu'
import { FinanceTable, FinanceTableSkeleton, type FinanceColumn } from './table'
import {
  useCashbook,
  useFinancialOverview,
  useRecordIncome,
  useExpenseCategories,
  useExpenseActions,
  type CashbookEntry,
  type FinancialPaymentMethod,
} from '../../lib/finances/api'
import { useDashboardContext } from '../../lib/dashboard/dashboard-context'
import { MODULE } from '../../lib/entitlements'
import { errorMessage } from '../../lib/api/client'
import { money, financeDateTime } from '../../lib/format'
import { financeMethodLabel } from '../../lib/finances/status'
import { downloadCsv } from '../../lib/finances/csv'
import { useDebouncedValue, syncUrlParam, presetRange } from '../../lib/finances/use-debounced-value'
import { RecordIncomeSheet, type RecordIncomeSource } from './record-income-sheet'
import { RecordExpenseSheet } from './record-expense-sheet'
import { VoidExpenseDialog } from './void-expense-dialog'

function parseSearch() {
  const params = Object.fromEntries(new URLSearchParams(window.location.search))
  const page = Math.max(1, Number(params.page) || 1)
  const pageSize = [10, 25, 50].includes(Number(params.pageSize)) ? Number(params.pageSize) : 10
  return {
    type: params.type === 'in' || params.type === 'out' ? params.type : 'all',
    method: typeof params.method === 'string' ? params.method : 'all',
    voided: params.voided === '1' ? '1' : '0',
    search: typeof params.search === 'string' ? params.search : '',
    from: params.from || undefined,
    to: params.to || undefined,
    page,
    pageSize,
  }
}

const METHOD_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'cash', label: 'Cash' },
  { value: 'mpesa_till', label: 'M-Pesa' },
  { value: 'bank_transfer', label: 'Bank' },
  { value: 'card', label: 'Card' },
  { value: 'other', label: 'Other' },
] as const

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
  const page = parsed.page
  const pageSize = parsed.pageSize

  const [filterOpen, setFilterOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [incomeOpen, setIncomeOpen] = useState(false)
  const [expenseOpen, setExpenseOpen] = useState(false)
  const [voidOpen, setVoidOpen] = useState(false)
  const [voidId, setVoidId] = useState<string | null>(null)
  const [voidReason, setVoidReason] = useState('')
  const [searchInput, setSearchInput] = useState(parsed.search)
  const [preset, setPreset] = useState('all')
  const debouncedSearch = useDebouncedValue(searchInput, 300)

  useEffect(() => {
    const current = new URLSearchParams(window.location.search).get('search') ?? ''
    if (current !== debouncedSearch) syncUrlParam('search', debouncedSearch)
  }, [debouncedSearch])

  const cashbook = useCashbook(
    {
      direction: typeFilter === 'in' ? 'incoming' : typeFilter === 'out' ? 'outgoing' : undefined,
      paymentMethod: methodFilter === 'all' ? undefined : methodFilter,
      search: debouncedSearch || undefined,
      from: fromFilter,
      to: toFilter,
      includeVoided: voidedFilter === '1',
      page,
      pageSize,
    },
    enabled,
  )
  const overview = useFinancialOverview('last_30_days', fromFilter, toFilter, enabled)
  const categories = useExpenseCategories(enabled)
  const recordIncome = useRecordIncome()
  const { create: createExpense, voidExpense } = useExpenseActions()

  const data = cashbook.data
  const rows: CashbookEntry[] = data?.entries ?? []
  const totalCount = data?.totalCount ?? 0
  const totalPages = data?.totalPages ?? Math.max(1, Math.ceil(totalCount / pageSize))
  const isLoading = cashbook.isPending
  const isError = cashbook.isError
  const error = cashbook.error
  const categoryList = useMemo(() => categories.data ?? [], [categories.data])
  const totals = overview.data?.totals

  const selectedCount = selectedIds.size
  const selectedTotal = rows.reduce((sum, r) => (selectedIds.has(r.id) ? sum + r.amount : sum), 0)

  const activeFilters = useMemo(() => {
    const chips: { id: string; label: string; onRemove: () => void }[] = []
    if (typeFilter !== 'all') chips.push({ id: 'type', label: `Entry: ${typeFilter === 'in' ? 'Income' : 'Expenses'}`, onRemove: () => setFilter('type', 'all') })
    if (methodFilter !== 'all') chips.push({ id: 'method', label: `Method: ${financeMethodLabel(methodFilter)}`, onRemove: () => setFilter('method', 'all') })
    if (voidedFilter === '1') chips.push({ id: 'voided', label: 'Voided: Show', onRemove: () => setFilter('voided', '0') })
    if (fromFilter || toFilter) chips.push({ id: 'date', label: 'Date range', onRemove: () => applyPreset('all') })
    if (debouncedSearch) chips.push({ id: 'search', label: `Search: "${debouncedSearch}"`, onRemove: () => setSearchInput('') })
    return chips
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter, methodFilter, voidedFilter, fromFilter, toFilter, debouncedSearch])

  const updateUrl = (mutate: (url: URL) => void) => {
    const url = new URL(window.location.href)
    mutate(url)
    window.history.replaceState({}, '', url.toString())
    setSelectedIds(new Set())
  }

  const handlePageChange = (nextPage: number) => updateUrl((url) => url.searchParams.set('page', String(nextPage)))
  const handlePageSizeChange = (nextSize: number) => updateUrl((url) => { url.searchParams.set('pageSize', String(nextSize)); url.searchParams.set('page', '1') })

  const toggleRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  const togglePageSelect = (selectAll: boolean) => setSelectedIds(selectAll ? new Set(rows.map((r) => r.id)) : new Set())

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
      for (const key of ['type', 'method', 'voided', 'search', 'from', 'to', 'page']) url.searchParams.delete(key)
    })
    setFilterOpen(false)
  }
  const handleSaveIncome = async (input: {
    amount: number
    source: RecordIncomeSource
    paymentMethod: FinancialPaymentMethod
    transactionReference?: string
    description: string
    transactionDate?: string
  }) => {
    await recordIncome.mutateAsync({
      amount: input.amount,
      source: input.source,
      paymentMethod: input.paymentMethod,
      transactionReference: input.transactionReference ?? null,
      description: input.description,
      transactionDate: input.transactionDate,
    })
    toast.success('Income recorded')
  }

  const handleSaveExpense = async (input: {
    amount: number
    category: string
    paymentMethod: FinancialPaymentMethod
    description: string
    transactionDate?: string
  }) => {
    await createExpense.mutateAsync({
      amount: input.amount,
      category: input.category,
      paymentMethod: input.paymentMethod,
      description: input.description,
      transactionDate: input.transactionDate,
    })
    toast.success('Expense recorded')
  }

  const handleVoidExpense = async (id: string) => {
    if (!voidReason.trim()) return
    try {
      await voidExpense.mutateAsync({ id, reason: voidReason })
      toast.success('Expense voided')
      setVoidOpen(false)
      setVoidReason('')
      setVoidId(null)
    } catch (err) {
      toast.error(errorMessage(err, 'Could not void the expense. Please try again.'))
    }
  }

  const exportCsv = () => {
    const selected = rows.filter((r) => selectedIds.has(r.id))
    const list = selected.length > 0 ? selected : rows
    if (list.length === 0) {
      toast.info('Nothing to export yet')
      return
    }
    downloadCsv('cashbook.csv', [
      ['Date', 'Reference', 'Description', 'Customer', 'Method', 'Direction', 'Amount (KES)', 'Running balance'],
      ...list.map((r) => [
        financeDateTime(r.date),
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
  }

  const rowMenuItems = (row: CashbookEntry): readonly MenuItem[] => {
    const items: MenuItem[] = [
      { label: 'Copy reference', onSelect: () => void navigator.clipboard.writeText(row.reference) },
      { label: 'Copy amount', onSelect: () => void navigator.clipboard.writeText(String(row.amount)) },
    ]
    if (row.type === 'expense' && !row.isVoided && canManageExpenses) {
      items.push({
        separatorBefore: true,
        label: 'Void expense',
        destructive: true,
        onSelect: () => {
          setVoidId(row.id)
          setVoidReason('')
          setVoidOpen(true)
        },
      })
    }
    // An M-Pesa row recorded by the owner is a CLAIM until someone confirms it. The
    // cashbook itself only ever lists recognised movements (see the API), so those rows
    // are decided in Reconciliation / through the ledger decision endpoints rather than
    // from this register.
    return items
  }

  const voidEntry = rows.find((r) => r.id === voidId) ?? null
  const voidExpenseInfo = voidEntry
    ? {
        description: voidEntry.description,
        reference: voidEntry.reference,
        amount: voidEntry.amount,
        categoryLabel: null as string | null,
        isVoided: voidEntry.isVoided,
      }
    : null

  const columns: FinanceColumn<CashbookEntry>[] = [
    {
      id: 'entry',
      header: 'Entry',
      render: (row) => (
        <div className="flex min-w-0 items-center gap-[0.7rem]">
          <span className="grid size-[2.2rem] shrink-0 place-items-center rounded-round bg-sunken text-muted">
            {row.direction === 'incoming' ? <ArrowDownLeft className="size-4" aria-hidden="true" /> : <ArrowUpRight className="size-4" aria-hidden="true" />}
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold tracking-snug">{row.description || row.reference}</p>
            <span className="block truncate text-caption text-muted">
              {row.customerName ? `${row.customerName} \u00b7 ` : ''}{row.reference}{row.isVoided ? ' \u00b7 Voided' : ''}
            </span>
          </div>
        </div>
      ),
    },
    { id: 'method', header: 'Method', hideBelow: 'sm', render: (row) => <MethodPill label={financeMethodLabel(row.paymentMethod)} cash={row.paymentMethod === 'cash'} /> },
    { id: 'date', header: 'Date', hideBelow: 'md', render: (row) => <span className="text-meta text-muted">{financeDateTime(row.date)}</span> },
    {
      id: 'amount',
      header: 'Amount',
      align: 'right',
      render: (row) => (
        <span className={`tabular font-semibold ${row.direction === 'incoming' ? 'text-success-ink' : 'text-danger-ink'}`}>
          {row.direction === 'incoming' ? '+' : '\u2212'}{money(row.amount)}
        </span>
      ),
    },
    { id: 'balance', header: 'Balance', hideBelow: 'lg', align: 'right', render: (row) => <span className="tabular text-meta text-muted">{money(row.runningBalance)}</span> },
  ]

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
        description="Every shilling in and out \u2014 the business\u2019s own books."
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

      <StatStrip
        items={[
          { value: money(data?.netCashMovement ?? 0), label: 'Net cash movement' },
          { value: money(data?.totalInflows ?? 0), label: 'Income' },
          { value: money(data?.totalOutflows ?? 0), label: 'Expenses' },
          { value: money(totals?.pendingVerification ?? 0), label: 'Awaiting verification' },
          { value: money(totals?.outstandingBalances ?? 0), label: 'Outstanding' },
        ]}
      />

      {overview.data && overview.data.paymentMethodBreakdown.length > 0 ? (
        <Card className="mb-4 p-[1.1rem]">
          <h2 className="text-heading font-bold tracking-snug">Income by method</h2>
          <ul className="mt-3 space-y-2">
            {overview.data.paymentMethodBreakdown.map((item) => (
              <li key={item.key} className="flex items-center justify-between gap-4 text-meta">
                <span className="text-muted">{item.label}</span>
                <span className="tabular font-semibold">{money(item.amount)}</span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <div className="mb-4 flex flex-wrap items-center gap-[0.6rem]">
        <SearchField className="min-w-[12rem] flex-1" label="Search cashbook" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
        <Button variant="ghost" onClick={() => setFilterOpen(true)}>
          <Filter className="size-4" aria-hidden="true" />
          Filters{activeFilters.length > 0 ? ` (${activeFilters.length})` : ''}
        </Button>
      </div>

      <FilterSummary filters={activeFilters} onClearAll={resetFilters} summary={`${rows.length} result${rows.length === 1 ? '' : 's'}`} className="mb-3" />

      {isError ? (
        <Alert tone="danger" title="Cashbook could not be loaded" className="mb-4">
          <p>{errorMessage(error, 'Something went wrong. Please try again.')}</p>
          <Button size="sm" className="mt-2" onClick={() => cashbook.refetch()}>Try again</Button>
        </Alert>
      ) : null}

      {isLoading ? (
        <FinanceTableSkeleton rows={6} />
      ) : (
        <FinanceTable
          rows={rows}
          rowId={(r) => r.id}
          columns={columns}
          selected={selectedIds}
          onToggleRow={toggleRow}
          onTogglePage={togglePageSelect}
          rowMenuItems={rowMenuItems}
          isVoided={(r) => r.isVoided}
          onOpen={(row) => {
            if (row.sourcePaymentId) {
              void navigate({ to: '/dashboard/finances/payments/$paymentId', params: { paymentId: row.sourcePaymentId } })
            }
          }}
          isOpenable={(row) => Boolean(row.sourcePaymentId)}
          ariaLabel="Cashbook entries"
          empty={emptyState}
        />
      )}

      <PaginationBar page={page} pageCount={totalPages} onPageChange={handlePageChange} pageSize={pageSize} onPageSizeChange={handlePageSizeChange} className="mt-4" />

      <SelectionBar
        selectedCount={selectedCount}
        itemLabel="selected"
        onClear={() => setSelectedIds(new Set())}
        className="mt-4"
        actions={<Button size="sm" variant="ghost" onClick={exportCsv}>Export CSV</Button>}
      />
      <BulkActionBar
        selectedCount={selectedCount}
        itemLabel={`selected \u00b7 ${money(selectedTotal)}`}
        onClear={() => setSelectedIds(new Set())}
        actions={<Button size="sm" variant="ghost" className="text-on-inverse hover:bg-on-inverse/10" onClick={exportCsv}>Export CSV</Button>}
      />

      <FilterDrawer
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        title="Filter cashbook"
        description="Narrow the book by entry, method, voided state or date."
        onReset={resetFilters}
        applyLabel={`Show ${rows.length} result${rows.length === 1 ? '' : 's'}`}
        onApply={() => setFilterOpen(false)}
      >
        <div className="space-y-[1.1rem]">
          <div>
            <p className="mb-[0.5rem] text-label font-semibold">Entry</p>
            <ChipGroup label="Entry">
              {[['all', 'All'], ['in', 'Income'], ['out', 'Expenses']].map(([value, label]) => (
                <Chip key={value} pressed={typeFilter === value} onPressedChange={() => setFilter('type', value)}>{label}</Chip>
              ))}
            </ChipGroup>
          </div>
          <div>
            <p className="mb-[0.5rem] text-label font-semibold">Method</p>
            <ChipGroup label="Method">
              {METHOD_OPTIONS.map((o) => (
                <Chip key={o.value} pressed={methodFilter === o.value} onPressedChange={() => setFilter('method', o.value)}>{o.label}</Chip>
              ))}
            </ChipGroup>
          </div>
          <div>
            <p className="mb-[0.5rem] text-label font-semibold">Voided entries</p>
            <ChipGroup label="Voided entries">
              {[['0', 'Hide'], ['1', 'Show']].map(([value, label]) => (
                <Chip key={value} pressed={voidedFilter === value} onPressedChange={() => setFilter('voided', value)}>{label}</Chip>
              ))}
            </ChipGroup>
          </div>
          <div>
            <p className="mb-[0.5rem] text-label font-semibold">Date</p>
            <ChipGroup label="Date">
              {[['all', 'All time'], ['today', 'Today'], ['7d', 'Last 7 days'], ['30d', 'Last 30 days']].map(([value, label]) => (
                <Chip key={value} pressed={preset === value} onPressedChange={() => applyPreset(value)}>{label}</Chip>
              ))}
            </ChipGroup>
            <div className="mt-[0.6rem] flex items-center gap-[0.5rem]">
              <input type="date" value={fromFilter ?? ''} onChange={(e) => applyDate('from', e.target.value)} className="input" aria-label="From" />
              <span className="text-meta text-muted">to</span>
              <input type="date" value={toFilter ?? ''} onChange={(e) => applyDate('to', e.target.value)} className="input" aria-label="To" />
            </div>
          </div>
        </div>
      </FilterDrawer>

      <RecordIncomeSheet open={incomeOpen} onClose={() => setIncomeOpen(false)} onSave={handleSaveIncome} />
      <RecordExpenseSheet open={expenseOpen} onClose={() => setExpenseOpen(false)} categories={categoryList} onSave={handleSaveExpense} />
      <VoidExpenseDialog
        open={voidOpen}
        onClose={() => setVoidOpen(false)}
        expenseId={voidId}
        expense={voidExpenseInfo}
        reason={voidReason}
        onReasonChange={setVoidReason}
        onVoid={handleVoidExpense}
        pending={voidExpense.isPending}
      />

    </div>
  )
}
