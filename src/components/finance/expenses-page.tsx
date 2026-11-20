import { useEffect, useMemo, useState } from 'react'
import { Filter, LayoutGrid, Plus, Receipt, Table2 } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '../ui/page-header'
import { Button } from '../ui/button'
import { SearchField } from '../ui/search-field'
import { EmptyState } from '../ui/empty-state'
import { Alert } from '../ui/alert'
import { Badge } from '../ui/badge'
import { Chip, ChipGroup } from '../ui/chip'
import { FilterDrawer, FilterSummary } from '../ui/filter-drawer'
import { PaginationBar } from '../ui/pagination-bar'
import { SelectionBar } from '../ui/selection-bar'
import { BulkActionBar } from '../ui/bulk-action-bar'
import { SegmentedControl } from '../ui/segmented-control'
import type { MenuItem } from '../ui/menu'
import { FinanceTable, FinanceTableSkeleton, type FinanceCardData, type FinanceColumn, type FinanceSortGroup } from './table'
import { MethodPill } from './pills'
import { FinanceBreakdownBars, FinanceMetricGrid, type FinanceMetric } from './summary'
import { ExpenseDetailSheet } from './expense-detail-sheet'
import { VoidEntryDialog } from './void-entry-dialog'
import {
  financesApi,
  useExpenses,
  useExpenseCategories,
  useExpenseActions,
  type FinancialFilters,
  type FinancialTransaction,
  type FinancialPaymentMethod,
} from '../../lib/finances/api'
import { useDashboardContext } from '../../lib/dashboard/dashboard-context'
import { MODULE } from '../../lib/entitlements'
import { RecordExpenseSheet } from './record-expense-sheet'
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
    category: typeof params.category === 'string' ? params.category : 'all',
    method: typeof params.method === 'string' ? params.method : 'all',
    search: typeof params.search === 'string' ? params.search : '',
    from: params.from || undefined,
    to: params.to || undefined,
    sort: parseFinanceSort(params.sort),
    view: (params.view === 'cards' ? 'cards' : 'table') as View,
    page,
    pageSize,
  }
}

async function copyValue(value: string) {
  try {
    if (!navigator.clipboard) throw new Error('Clipboard unavailable')
    await navigator.clipboard.writeText(value)
    toast.success(`Copied ${value}`)
  } catch {
    toast.error('Copy is not available here')
  }
}

export function ExpensesPage() {
  const { hasModule, hasPermission } = useDashboardContext()
  const enabled = hasModule(MODULE.financials) && hasPermission('finances.view')
  const canManage = hasPermission('finances.manage_expenses')

  const parsed = parseSearch()
  const categoryFilter = parsed.category
  const methodFilter = parsed.method
  const fromFilter = parsed.from
  const toFilter = parsed.to
  const sort: FinanceSort = parsed.sort
  const view: View = parsed.view
  const page = parsed.page
  const pageSize = parsed.pageSize

  const [filterOpen, setFilterOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [recordOpen, setRecordOpen] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [voidTarget, setVoidTarget] = useState<FinancialTransaction | null>(null)
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
  const categories = useExpenseCategories(enabled)
  const expenseFilters: FinancialFilters = {
    category: categoryFilter === 'all' ? undefined : categoryFilter,
    paymentMethod: methodFilter === 'all' ? undefined : methodFilter,
    search: debouncedSearch || undefined,
    from: fromFilter,
    to: toFilter,
    sort: sortParams.sort,
    sortDirection: sortParams.sortDirection,
  }
  const expenses = useExpenses({ ...expenseFilters, page, pageSize }, enabled)
  const { create: createExpense, voidExpense } = useExpenseActions()

  const data = expenses.data
  const rows: FinancialTransaction[] = data?.items ?? []
  const totalCount = data?.totalCount ?? 0
  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize))
  const isLoading = expenses.isPending
  const isError = expenses.isError
  const error = expenses.error
  const categoryList = useMemo(() => categories.data ?? [], [categories.data])
  const detailExpense = rows.find((row) => row.id === detailId) ?? null

  const selectedCount = selectedIds.size
  const selectedTotal = rows.reduce((sum, row) => (selectedIds.has(row.id) ? sum + row.amount : sum), 0)

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
  const togglePageSelect = (selectAll: boolean) => setSelectedIds(selectAll ? new Set(rows.map((row) => row.id)) : new Set())

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
      if (value && value !== 'all') url.searchParams.set(key, value)
      else url.searchParams.delete(key)
      url.searchParams.set('page', '1')
    })
  }
  const resetFilters = () => {
    setPreset('all')
    setSearchInput('')
    updateUrl((url) => {
      for (const key of ['category', 'method', 'search', 'from', 'to', 'sort', 'page']) url.searchParams.delete(key)
    })
    setFilterOpen(false)
  }


  const handleSaveExpense = async (input: {
    amount: number
    category: string
    paymentMethod: FinancialPaymentMethod
    description: string
    payee?: string
    transactionReference?: string
    transactionDate?: string
  }) => {
    await createExpense.mutateAsync({
      amount: input.amount,
      category: input.category,
      paymentMethod: input.paymentMethod,
      description: input.description,
      payee: input.payee ?? null,
      transactionReference: input.transactionReference ?? null,
      transactionDate: input.transactionDate,
    })
    toast.success('Expense recorded · added to cashbook')
  }

  const handleVoid = async () => {
    if (!voidTarget || !voidReason.trim()) return
    try {
      await voidExpense.mutateAsync({ id: voidTarget.id, reason: voidReason })
      toast.success('Expense voided')
      setVoidTarget(null)
      setVoidReason('')
    } catch (err) {
      toast.error(errorMessage(err, 'Could not void the expense. Please try again.'))
    }
  }

  const activeFilters = useMemo(() => {
    const chips: { id: string; label: string; onRemove: () => void }[] = []
    if (categoryFilter !== 'all') {
      const category = categoryList.find((c) => c.key === categoryFilter)
      chips.push({
        id: 'category',
        label: `Category: ${category?.label || categoryFilter}`,
        onRemove: () => setFilter('category', 'all'),
      })
    }
    if (methodFilter !== 'all') {
      chips.push({ id: 'method', label: `Method: ${financeMethodLabel(methodFilter)}`, onRemove: () => setFilter('method', 'all') })
    }
    if (fromFilter || toFilter) chips.push({ id: 'date', label: 'Date range', onRemove: () => applyPreset('all') })
    if (sort !== DEFAULT_FINANCE_SORT) {
      chips.push({ id: 'sort', label: `Sort: ${financeSortLabel(sort)}`, onRemove: () => setSort(DEFAULT_FINANCE_SORT) })
    }
    if (debouncedSearch) chips.push({ id: 'search', label: `Search: "${debouncedSearch}"`, onRemove: () => setSearchInput('') })
    return chips
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryFilter, methodFilter, fromFilter, toFilter, debouncedSearch, sort, categoryList])

  const exportCsv = async () => {
    if (exporting) return
    const selected = rows.filter((row) => selectedIds.has(row.id))
    setExporting(true)
    try {
      // Selected rows export exactly as chosen; otherwise every expense behind the filters.
      const list =
        selected.length > 0
          ? selected
          : await collectFilteredRows((nextPage, nextSize) =>
              financesApi
                .expenses({ ...expenseFilters, page: nextPage, pageSize: nextSize })
                .then((response) => ({ items: response.items, totalCount: response.totalCount })),
            )

      if (list.length === 0) {
        toast.info('Nothing to export yet')
        return
      }

      downloadCsv('expenses.csv', [
        ['Date', 'Reference', 'Description', 'Payee', 'Category', 'Method', 'Amount (KES)'],
        ...list.map((row) => [
          `${financeDate(row.transactionDate)} ${financeTime(row.transactionDate)}`,
          row.reference,
          row.description ?? '',
          row.customerName ?? '',
          row.categoryLabel ?? row.category ?? '',
          financeMethodLabel(row.paymentMethod),
          row.amount,
        ]),
      ])
      toast.success(`Exported ${list.length} row${list.length === 1 ? '' : 's'}`)
    } catch (err) {
      toast.error(errorMessage(err, 'Could not prepare the export. Please try again.'))
    } finally {
      setExporting(false)
    }
  }

  const rowMenuItems = (row: FinancialTransaction): readonly MenuItem[] => {
    const items: MenuItem[] = [{ label: 'View expense details', onSelect: () => setDetailId(row.id) }]
    items.push({ label: 'Copy reference', onSelect: () => void copyValue(row.reference) })
    if (!row.isVoided && canManage) {
      items.push({
        separatorBefore: true,
        label: 'Void expense',
        destructive: true,
        onSelect: () => {
          setVoidTarget(row)
          setVoidReason('')
        },
      })
    }
    return items
  }


  const columns: FinanceColumn<FinancialTransaction>[] = [
    {
      id: 'expense',
      header: 'Expense',
      sortGroup: 'name',
      render: (row) => (
        <div className="flex min-w-0 items-center gap-[0.7rem]">
          <span className="grid size-[2.2rem] shrink-0 place-items-center rounded-round bg-avatar-3 text-avatar-3-ink">
            <Receipt className="size-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold tracking-snug">{row.description || row.reference}</p>
            <span className="block truncate text-caption text-muted">
              {row.customerName || '—'} · {row.reference}
            </span>
          </div>
        </div>
      ),
    },
    {
      id: 'category',
      header: 'Category',
      hideBelow: 'sm',
      render: (row) => <Badge tone="neutral">{row.categoryLabel || row.category || '—'}</Badge>,
    },
    {
      id: 'method',
      header: 'Paid via',
      hideBelow: 'md',
      render: (row) => <MethodPill label={financeMethodLabel(row.paymentMethod)} cash={row.paymentMethod === 'cash'} />,
    },
    {
      id: 'date',
      header: 'Date',
      hideBelow: 'lg',
      sortGroup: 'date',
      render: (row) => (
        <span className="block text-label">
          {financeDate(row.transactionDate)}
          <span className="block text-caption text-muted">{financeTime(row.transactionDate)}</span>
        </span>
      ),
    },
    {
      id: 'amount',
      header: 'Amount',
      align: 'right',
      sortGroup: 'amount',
      render: (row) => <span className="tabular font-semibold whitespace-nowrap text-danger-ink">−{money(row.amount)}</span>,
    },
  ]

  const card = (row: FinancialTransaction): FinanceCardData => ({
    tone: row.isVoided ? 'neutral' : 'danger',
    leading: (
      <span className="grid size-[2.2rem] shrink-0 place-items-center rounded-round bg-avatar-3 text-avatar-3-ink">
        <Receipt className="size-4" aria-hidden="true" />
      </span>
    ),
    title: row.description || row.reference,
    subtitle: `${row.customerName || 'No payee'}${row.isVoided ? ' · Voided' : ''}`,
    amount: money(row.amount),
    fields: [
      { label: 'Category', value: row.categoryLabel || row.category || '—' },
      { label: 'Paid via', value: financeMethodLabel(row.paymentMethod) },
    ],
    footer: (
      <>
        <span className="font-mono text-caption text-muted">{row.reference}</span>
        <span className="text-caption text-muted">
          {financeDate(row.transactionDate)}, {financeTime(row.transactionDate)}
        </span>
      </>
    ),
  })

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

  const breakdown = data?.categoryBreakdown ?? []
  const topCategory = breakdown[0]

  const metrics: FinanceMetric[] = [
    { key: 'spent', label: 'Total spent', value: money(data?.expenseTotal ?? 0), hint: 'Matching the filters above' },
    {
      key: 'entries',
      label: 'Entries',
      value: String(data?.expenseCount ?? 0),
      hint: `${money(data?.currentMonthExpenseTotal ?? 0)} this month`,
    },
    {
      key: 'top',
      label: 'Top category',
      value: topCategory ? topCategory.label : '—',
      hint: topCategory ? money(topCategory.amount) : 'Nothing recorded',
    },
  ]

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

      <FinanceMetricGrid metrics={metrics} className="mb-[0.8rem] min-[40rem]:grid-cols-3" />

      <FinanceBreakdownBars
        title="Spending by category"
        items={breakdown.map((item) => ({ key: item.key, label: item.label, amount: item.amount }))}
        formatAmount={(amount) => money(amount)}
        emptyLabel="No expenses match the current filters."
      />

      <div className="mb-4 flex flex-wrap items-center gap-[0.6rem]">
        <SearchField
          className="min-w-[12rem] flex-1"
          label="Search expenses"
          placeholder="Search description, payee or reference"
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
        <Alert tone="danger" title="Expenses could not be loaded" className="mb-4">
          <p>{errorMessage(error, 'Something went wrong. Please try again.')}</p>
          <Button size="sm" className="mt-2" onClick={() => expenses.refetch()}>
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
                : `${totalCount} expense${totalCount === 1 ? '' : 's'} · select expenses to export`
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
            rowId={(row) => row.id}
            columns={columns}
            selected={selectedIds}
            onToggleRow={toggleRow}
            onTogglePage={togglePageSelect}
            rowMenuItems={rowMenuItems}
            onOpen={(row) => setDetailId(row.id)}
            isVoided={(row) => row.isVoided}
            ariaLabel="Expenses"
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
        itemLabel={`expenses selected · ${money(selectedTotal)}`}
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
        description="Narrow the register by category, method or date."
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
            <p className="mb-[0.5rem] text-label font-semibold">Category</p>
            <ChipGroup label="Category">
              <Chip pressed={categoryFilter === 'all'} onPressedChange={() => setFilter('category', 'all')}>
                All
              </Chip>
              {categoryList.map((category) => (
                <Chip
                  key={category.key}
                  pressed={categoryFilter === category.key}
                  onPressedChange={() => setFilter('category', category.key)}
                >
                  {category.label}
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

      <ExpenseDetailSheet
        open={detailId !== null}
        onClose={() => setDetailId(null)}
        expense={detailExpense}
        canVoid={canManage}
        onVoid={() => {
          if (!detailExpense) return
          setVoidTarget(detailExpense)
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
        kind="expense"
        reason={voidReason}
        onReasonChange={setVoidReason}
        onConfirm={() => void handleVoid()}
        pending={voidExpense.isPending}
      />

      <RecordExpenseSheet
        open={recordOpen}
        onClose={() => setRecordOpen(false)}
        categories={categoryList}
        onSave={handleSaveExpense}
      />
    </div>
  )
}

