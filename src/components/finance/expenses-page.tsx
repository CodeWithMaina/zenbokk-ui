import { useEffect, useMemo, useState } from 'react'
import { Filter, Plus, Receipt } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '../ui/page-header'
import { Button } from '../ui/button'
import { SearchField } from '../ui/search-field'
import { EmptyState } from '../ui/empty-state'
import { Alert } from '../ui/alert'
import { Badge } from '../ui/badge'
import { Chip, ChipGroup } from '../ui/chip'
import { FilterDrawer, FilterSummary } from '../ui/filter-drawer'
import { StatStrip } from '../ui/stat-tile'
import { PaginationBar } from '../ui/pagination-bar'
import { SelectionBar } from '../ui/selection-bar'
import { BulkActionBar } from '../ui/bulk-action-bar'
import { Avatar } from '../ui/avatar'
import type { MenuItem } from '../ui/menu'
import { FinanceTable, FinanceTableSkeleton, type FinanceColumn } from './table'
import { MethodPill } from './pills'
import {
  useExpenses,
  useExpenseCategories,
  useExpenseActions,
  type FinancialTransaction,
  type FinancialPaymentMethod,
} from '../../lib/finances/api'
import { useDashboardContext } from '../../lib/dashboard/dashboard-context'
import { MODULE } from '../../lib/entitlements'
import { RecordExpenseSheet } from './record-expense-sheet'
import { VoidExpenseDialog } from './void-expense-dialog'
import { errorMessage } from '../../lib/api/client'
import { money, financeDateTime } from '../../lib/format'
import { useDebouncedValue, syncUrlParam, presetRange } from '../../lib/finances/use-debounced-value'
import { downloadCsv } from '../../lib/finances/csv'
import { financeMethodLabel } from '../../lib/finances/status'

function parseSearch() {
  const params = Object.fromEntries(new URLSearchParams(window.location.search))
  const page = Math.max(1, Number(params.page) || 1)
  const pageSize = [10, 25, 50].includes(Number(params.pageSize)) ? Number(params.pageSize) : 10
  return {
    category: typeof params.category === 'string' ? params.category : 'all',
    method: typeof params.method === 'string' ? params.method : 'all',
    sort: typeof params.sort === 'string' ? params.sort : 'date-d',
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

export function ExpensesPage() {
  const { hasModule, hasPermission } = useDashboardContext()
  const enabled = hasModule(MODULE.financials) && hasPermission('finances.view')
  const canManage = hasPermission('finances.manage_expenses')

  const parsed = parseSearch()
  const categoryFilter = parsed.category
  const methodFilter = parsed.method
  const sortFilter = parsed.sort
  const fromFilter = parsed.from
  const toFilter = parsed.to
  const page = parsed.page
  const pageSize = parsed.pageSize

  const [filterOpen, setFilterOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [recordOpen, setRecordOpen] = useState(false)
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

  const categories = useExpenseCategories(enabled)
  const expenses = useExpenses(
    {
      category: categoryFilter === 'all' ? undefined : categoryFilter,
      paymentMethod: methodFilter === 'all' ? undefined : methodFilter,
      search: debouncedSearch || undefined,
      from: fromFilter,
      to: toFilter,
      sort: sortFilter === 'date-a' ? 'date' : sortFilter === 'amt-d' || sortFilter === 'amt-a' ? 'amount' : 'date',
      sortDirection: sortFilter.endsWith('-a') ? 'asc' : 'desc',
      page,
      pageSize,
    },
    enabled,
  )
  const { create: createExpense, voidExpense } = useExpenseActions()

  const data = expenses.data
  const rows: FinancialTransaction[] = data?.items ?? []
  const totalCount = data?.totalCount ?? 0
  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize))
  const isLoading = expenses.isPending
  const isError = expenses.isError
  const error = expenses.error
  const categoryList = useMemo(() => categories.data ?? [], [categories.data])

  const selectedCount = selectedIds.size

  const activeFilters = useMemo(() => {
    const chips: { id: string; label: string; onRemove: () => void }[] = []
    if (categoryFilter !== 'all') {
      const cat = categoryList.find((c) => c.key === categoryFilter)
      chips.push({ id: 'category', label: `Category: ${cat?.label || categoryFilter}`, onRemove: () => setFilter('category', 'all') })
    }
    if (methodFilter !== 'all') chips.push({ id: 'method', label: `Method: ${financeMethodLabel(methodFilter)}`, onRemove: () => setFilter('method', 'all') })
    if (fromFilter || toFilter) chips.push({ id: 'date', label: 'Date range', onRemove: () => applyPreset('all') })
    if (debouncedSearch) chips.push({ id: 'search', label: `Search: "${debouncedSearch}"`, onRemove: () => setSearchInput('') })
    return chips
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryFilter, methodFilter, fromFilter, toFilter, debouncedSearch, categoryList])

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
      if (value && value !== 'all') url.searchParams.set(key, value)
      else url.searchParams.delete(key)
      url.searchParams.set('page', '1')
    })
  }

  const resetFilters = () => {
    setPreset('all')
    setSearchInput('')
    updateUrl((url) => {
      for (const key of ['category', 'method', 'search', 'from', 'to', 'page']) url.searchParams.delete(key)
    })
    setFilterOpen(false)
  }
  const exportCsv = () => {
    const selected = rows.filter((r) => selectedIds.has(r.id))
    const list = selected.length > 0 ? selected : rows
    if (list.length === 0) {
      toast.info('Nothing to export yet')
      return
    }
    downloadCsv('expenses.csv', [
      ['Date', 'Reference', 'Description', 'Category', 'Method', 'Amount (KES)'],
      ...list.map((r) => [
        financeDateTime(r.transactionDate),
        r.reference,
        r.description ?? '',
        r.categoryLabel ?? r.category ?? '',
        financeMethodLabel(r.paymentMethod),
        r.amount,
      ]),
    ])
    toast.success(`Exported ${list.length} row${list.length === 1 ? '' : 's'}`)
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

  const rowMenuItems = (row: FinancialTransaction): readonly MenuItem[] => {
    const items: MenuItem[] = [
      { label: 'Copy reference', onSelect: () => void navigator.clipboard.writeText(row.reference) },
    ]
    if (!row.isVoided && canManage) {
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
    return items
  }

  const voidEntry = rows.find((r) => r.id === voidId) ?? null
  const voidExpenseInfo = voidEntry
    ? {
        description: voidEntry.description,
        reference: voidEntry.reference,
        amount: voidEntry.amount,
        categoryLabel: voidEntry.categoryLabel,
        isVoided: voidEntry.isVoided,
      }
    : null
  const columns: FinanceColumn<FinancialTransaction>[] = [
    {
      id: 'expense',
      header: 'Expense',
      render: (row) => (
        <div className="flex min-w-0 items-center gap-[0.7rem]">
          <Avatar name={row.customerName ?? ''} size="sm" decorative />
          <div className="min-w-0">
            <p className="truncate font-semibold tracking-snug">{row.description || row.reference}</p>
            <span className="block truncate text-caption text-muted">{row.categoryLabel || row.category || '\u2014'}</span>
          </div>
        </div>
      ),
    },
    { id: 'category', header: 'Category', hideBelow: 'sm', render: (row) => <Badge tone="neutral">{row.categoryLabel || row.category || '\u2014'}</Badge> },
    { id: 'method', header: 'Paid via', hideBelow: 'md', render: (row) => <MethodPill label={financeMethodLabel(row.paymentMethod)} cash={row.paymentMethod === 'cash'} /> },
    { id: 'date', header: 'Date', hideBelow: 'lg', render: (row) => <span className="text-meta text-muted">{financeDateTime(row.transactionDate)}</span> },
    { id: 'amount', header: 'Amount', align: 'right', render: (row) => <span className="tabular font-semibold">{money(row.amount)}</span> },
  ]

  const emptyState = (
    <EmptyState
      icon={<Receipt className="size-5" />}
      title="No expenses yet"
      description="Record rent, stock, salaries and other business costs. They flow into your cashbook."
      action={
        canManage ? (
          <Button variant="primary" onClick={() => setRecordOpen(true)}>
            <Plus className="size-4" aria-hidden="true" />
            Record expense
          </Button>
        ) : null
      }
    />
  )

  if (!enabled) {
    return (
      <div>
        <PageHeader title="Expenses" description="Business costs only. Appointment money lives in Payments." />
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
        title="Expenses"
        description="Business costs only. Appointment money lives in Payments."
        actions={
          canManage ? (
            <Button variant="primary" onClick={() => setRecordOpen(true)}>
              <Plus className="size-4" aria-hidden="true" />
              Record expense
            </Button>
          ) : null
        }
      />

      <StatStrip
        items={[
          { value: money(data?.expenseTotal ?? 0), label: 'Total spent' },
          { value: String(totalCount), label: 'Entries' },
          { value: money(data?.currentMonthExpenseTotal ?? 0), label: 'This month' },
        ]}
      />

      <div className="mb-4 flex flex-wrap items-center gap-[0.6rem]">
        <SearchField className="min-w-[12rem] flex-1" label="Search expenses" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
        <Button variant="ghost" onClick={() => setFilterOpen(true)}>
          <Filter className="size-4" aria-hidden="true" />
          Filters{activeFilters.length > 0 ? ` (${activeFilters.length})` : ''}
        </Button>
      </div>

      <FilterSummary filters={activeFilters} onClearAll={resetFilters} summary={`${rows.length} result${rows.length === 1 ? '' : 's'}`} className="mb-3" />

      {isError ? (
        <Alert tone="danger" title="Expenses could not be loaded" className="mb-4">
          <p>{errorMessage(error, 'Something went wrong. Please try again.')}</p>
          <Button size="sm" className="mt-2" onClick={() => expenses.refetch()}>Try again</Button>
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
          ariaLabel="Expenses"
          empty={emptyState}
        />
      )}

      <PaginationBar page={page} pageCount={pageCount} onPageChange={handlePageChange} pageSize={pageSize} onPageSizeChange={handlePageSizeChange} className="mt-4" />

      <SelectionBar
        selectedCount={selectedCount}
        itemLabel="selected"
        onClear={() => setSelectedIds(new Set())}
        className="mt-4"
        actions={<Button size="sm" variant="ghost" onClick={exportCsv}>Export CSV</Button>}
      />
      <BulkActionBar
        selectedCount={selectedCount}
        itemLabel="expenses selected"
        onClear={() => setSelectedIds(new Set())}
        actions={<Button size="sm" variant="ghost" className="text-on-inverse hover:bg-on-inverse/10" onClick={exportCsv}>Export CSV</Button>}
      />

      <FilterDrawer
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        title="Filter expenses"
        description="Narrow the register by category, method or date."
        onReset={resetFilters}
        applyLabel={`Show ${rows.length} result${rows.length === 1 ? '' : 's'}`}
        onApply={() => setFilterOpen(false)}
      >
        <div className="space-y-[1.1rem]">
          <div>
            <p className="mb-[0.5rem] text-label font-semibold">Category</p>
            <ChipGroup label="Category">
              <Chip pressed={categoryFilter === 'all'} onPressedChange={() => setFilter('category', 'all')}>All</Chip>
              {categoryList.map((c) => (
                <Chip key={c.key} pressed={categoryFilter === c.key} onPressedChange={() => setFilter('category', c.key)}>{c.label}</Chip>
              ))}
            </ChipGroup>
          </div>
          <div>
            <p className="mb-[0.5rem] text-label font-semibold">Method</p>
            <ChipGroup label="Method">
              {METHOD_OPTIONS.map((option) => (
                <Chip key={option.value} pressed={methodFilter === option.value} onPressedChange={() => setFilter('method', option.value)}>{option.label}</Chip>
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

      <RecordExpenseSheet open={recordOpen} onClose={() => setRecordOpen(false)} categories={categoryList} onSave={handleSaveExpense} />
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
