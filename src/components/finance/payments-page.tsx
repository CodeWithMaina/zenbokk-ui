import { useMemo, useState, useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Filter, LayoutGrid, RefreshCw, ShieldCheck, Table2 } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '../ui/page-header'
import { Button } from '../ui/button'
import { SearchField } from '../ui/search-field'
import { EmptyState } from '../ui/empty-state'
import { Alert } from '../ui/alert'
import { Avatar } from '../ui/avatar'
import { Chip, ChipGroup } from '../ui/chip'
import { FilterDrawer, FilterSummary } from '../ui/filter-drawer'
import { PaginationBar } from '../ui/pagination-bar'
import { SelectionBar } from '../ui/selection-bar'
import { BulkActionBar } from '../ui/bulk-action-bar'
import { SegmentedControl } from '../ui/segmented-control'
import { Tabs } from '../ui/tabs'
import type { MenuItem } from '../ui/menu'
import { FinanceTable, FinanceTableSkeleton, type FinanceCardData, type FinanceColumn, type FinanceSortGroup } from './table'
import { PaymentStatusPill, MethodPill, CopyButton } from './pills'
import { FinanceStats, FinanceSummaryPanel, type FinanceMetric } from './summary'
import { usePayments, usePaymentsDashboard, paymentsApi, type Payment, type PaymentListFilters } from '../../lib/payments/api'
import { useDashboardContext } from '../../lib/dashboard/dashboard-context'
import { MODULE } from '../../lib/entitlements'
import { useClaimDecisions, useBulkVerifyClaims } from '../../lib/finances/api'
import { useVerificationBadgeCount } from '../../lib/finances/use-verification-badge'
import { FinanceClaimDialogs } from './claim-dialogs'
import { errorMessage } from '../../lib/api/client'
import { money } from '../../lib/format'
import { displayPhone, financeDate, financeTime } from '../../lib/finances/format'
import { paymentStatusDisplay, paymentTypeLabel, paymentMethodLabel } from '../../lib/finances/status'
import { downloadCsv } from '../../lib/finances/csv'
import { collectFilteredRows } from '../../lib/finances/export'
import { presetRange, syncUrlParam, useDebouncedValue } from '../../lib/finances/use-debounced-value'
import {
  DEFAULT_FINANCE_SORT,
  FINANCE_SORT_OPTIONS,
  financeSortLabel,
  parseFinanceSort,
  toggleFinanceSort,
  type FinanceSort,
} from '../../lib/finances/sort'

type Tab = 'all' | 'claims'
type View = 'table' | 'cards'

const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'paid', label: 'Paid' },
  { value: 'pending', label: 'Pending' },
  { value: 'failed', label: 'Failed' },
] as const

const METHOD_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'mpesa', label: 'M-Pesa' },
  { value: 'cash', label: 'Cash' },
] as const

const TYPE_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'booking_fee', label: 'Booking fee' },
  { value: 'full_payment', label: 'Full payment' },
  { value: 'balance_payment', label: 'Balance payment' },
] as const

/** The wire status each UI filter sends. `claims` is handled by the tab, not by this filter. */
const STATUS_TO_WIRE: Record<string, string> = {
  paid: 'success',
  pending: 'pending',
  failed: 'failed',
}

function parseSearch() {
  const params = Object.fromEntries(new URLSearchParams(window.location.search))
  const page = Math.max(1, Number(params.page) || 1)
  const pageSize = [10, 25, 50].includes(Number(params.pageSize)) ? Number(params.pageSize) : 10
  return {
    tab: (params.tab === 'claims' ? 'claims' : 'all') as Tab,
    status: typeof params.status === 'string' ? params.status : 'all',
    method: typeof params.method === 'string' ? params.method : 'all',
    type: typeof params.type === 'string' ? params.type : 'all',
    from: params.from || undefined,
    to: params.to || undefined,
    search: typeof params.search === 'string' ? params.search : '',
    sort: parseFinanceSort(params.sort),
    view: (params.view === 'cards' ? 'cards' : 'table') as View,
    page,
    pageSize,
  }
}

/** Copy with a toast that says what was copied — a silent copy is indistinguishable from a failure. */
async function copyValue(value: string, label: string) {
  try {
    if (!navigator.clipboard) throw new Error('Clipboard unavailable')
    await navigator.clipboard.writeText(value)
    toast.success(`Copied ${label} ${value}`)
  } catch {
    toast.error('Copy is not available here')
  }
}

export function PaymentsPage() {
  const { hasModule, hasPermission } = useDashboardContext()
  const enabled = hasModule(MODULE.financials) && hasPermission('finances.view')
  const canVerify = hasPermission('finances.verify')
  const navigate = useNavigate()

  const parsed = parseSearch()
  const tab: Tab = parsed.tab
  const statusFilter = parsed.status
  const methodFilter = parsed.method
  const typeFilter = parsed.type
  const fromFilter = parsed.from
  const toFilter = parsed.to
  const sort: FinanceSort = parsed.sort
  const view: View = parsed.view
  const page = parsed.page
  const pageSize = parsed.pageSize

  const [searchTerm, setSearchTerm] = useState(parsed.search)
  const debouncedSearch = useDebouncedValue(searchTerm, 350)
  const [filterOpen, setFilterOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [verifyTarget, setVerifyTarget] = useState<Payment | null>(null)
  const [rejectTarget, setRejectTarget] = useState<Payment | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [preset, setPreset] = useState('all')
  /** Held while a bulk run is in flight, so a second tap cannot re-submit the batch. */
  const [bulkBusy, setBulkBusy] = useState(false)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    const current = new URLSearchParams(window.location.search).get('search') ?? ''
    if (current !== debouncedSearch) syncUrlParam('search', debouncedSearch)
  }, [debouncedSearch])

  const listFilters: PaymentListFilters = {
    // The tab IS the status when it is "Needs verification": the server pages and counts the
    // claim group (submitted, under review, flagged), so pagination is never wrong.
    status: tab === 'claims' ? 'claims' : statusFilter === 'all' ? undefined : STATUS_TO_WIRE[statusFilter],
    method: methodFilter === 'all' ? undefined : methodFilter,
    type: typeFilter === 'all' ? undefined : typeFilter,
    from: fromFilter,
    to: toFilter,
    search: debouncedSearch.trim() || undefined,
    sort,
  }

  const dashboard = usePaymentsDashboard(enabled)
  // The badge's own source: same query, same number as the navigation shows.
  const verificationBadge = useVerificationBadgeCount(enabled)
  const payments = usePayments({ ...listFilters, page, pageSize }, enabled)
  const { verify, reject } = useClaimDecisions()
  const bulkVerify = useBulkVerifyClaims()

  const data = payments.data
  const rows: Payment[] = data?.items ?? []
  const totalCount = data?.totalCount ?? 0
  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize))
  const isLoading = payments.isPending
  const isError = payments.isError
  const error = payments.error
  const claimsAwaiting = verificationBadge.count

  const selectedCount = selectedIds.size
  const selectedTotal = rows.reduce((sum, r) => (selectedIds.has(r.id) ? sum + r.amount : sum), 0)

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
  const setTab = (next: Tab) =>
    updateUrl((url) => {
      if (next === 'all') url.searchParams.delete('tab')
      else url.searchParams.set('tab', next)
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

  /** Clicking a column header orders by that family, reversing on a second click. */
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
    setSearchTerm('')
    updateUrl((url) => {
      for (const key of ['tab', 'status', 'method', 'type', 'search', 'from', 'to', 'sort', 'page']) url.searchParams.delete(key)
    })
    setFilterOpen(false)
  }


  const handleVerify = async (paymentId: string, note: string | null, receivedAmount?: number | null) => {
    try {
      await verify.mutateAsync({ paymentId, note, receivedAmount })
      toast.success('Claim verified · added to cashbook')
      setVerifyTarget(null)
      setSelectedIds(new Set())
    } catch (err) {
      toast.error(errorMessage(err, 'Verification failed. Please try again.'))
    }
  }

  const handleReject = async (id: string, reason: string) => {
    if (!reason.trim()) return
    try {
      await reject.mutateAsync({ paymentId: id, reason })
      toast.success('Claim rejected')
      setRejectTarget(null)
      setRejectionReason('')
      setSelectedIds(new Set())
    } catch (err) {
      toast.error(errorMessage(err, 'Rejection failed. Please try again.'))
    }
  }

  const handleBulkVerify = async () => {
    const claims = rows.filter((r) => paymentStatusDisplay(r.status).group === 'claims' && selectedIds.has(r.id))
    if (claims.length === 0 || bulkBusy) return
    setBulkBusy(true)
    try {
      const result = await bulkVerify.mutateAsync(claims.map((claim) => claim.id))
      if (result.verified > 0) {
        toast.success(
          `Verified ${result.verified} claim${result.verified === 1 ? '' : 's'} · ${money(
            claims.slice(0, result.verified).reduce((sum, claim) => sum + claim.amount, 0),
          )}`,
        )
      }
      // A partial success must never be announced as a clean sweep, or the owner stops
      // looking for the claims that are still open.
      if (result.failures.length > 0) {
        toast.error(
          `${result.failures.length} claim${result.failures.length === 1 ? '' : 's'} could not be verified. ${errorMessage(
            result.failures[0],
            'Please try again.',
          )}`,
        )
      }
    } catch (err) {
      toast.error(errorMessage(err, 'Bulk verification failed. Please try again.'))
    } finally {
      setBulkBusy(false)
      setSelectedIds(new Set())
    }
  }

  const openPayment = (row: Payment) => {
    navigate({ to: '/dashboard/finances/payments/$paymentId', params: { paymentId: row.id } })
  }

  const exportCsv = async () => {
    if (exporting) return
    const selected = rows.filter((r) => selectedIds.has(r.id))
    setExporting(true)
    try {
      // Selected rows are exported exactly as chosen; with nothing selected the WHOLE filtered
      // register is exported, not just the page on screen.
      const list =
        selected.length > 0
          ? selected
          : await collectFilteredRows((nextPage, nextSize) => paymentsApi.list({ ...listFilters, page: nextPage, pageSize: nextSize }))

      if (list.length === 0) {
        toast.info('Nothing to export yet')
        return
      }

      downloadCsv('payments.csv', [
        ['Date', 'Reference', 'Customer', 'Type', 'Method', 'M-Pesa code', 'Phone', 'Amount (KES)', 'Status'],
        ...list.map((r) => [
          financeDate(r.createdAt),
          r.reference,
          r.customerName ?? '',
          paymentTypeLabel(r.type),
          paymentMethodLabel(r.method),
          r.parsedTransactionCode ?? '',
          r.phoneNumber ? displayPhone(r.phoneNumber) : '',
          r.amount,
          paymentStatusDisplay(r.status).label,
        ]),
      ])
      toast.success(`Exported ${list.length} row${list.length === 1 ? '' : 's'}`)
    } catch (err) {
      toast.error(errorMessage(err, 'Could not prepare the export. Please try again.'))
    } finally {
      setExporting(false)
    }
  }

  const rowMenuItems = (row: Payment): readonly MenuItem[] => {
    const items: MenuItem[] = [{ label: 'Open payment', onSelect: () => openPayment(row) }]
    if (row.parsedTransactionCode) {
      items.push({
        label: 'Copy M-Pesa code',
        onSelect: () => void copyValue(row.parsedTransactionCode ?? '', 'M-Pesa code'),
      })
    }
    items.push({ label: 'Copy reference', onSelect: () => void copyValue(row.reference, 'reference') })
    if (paymentStatusDisplay(row.status).group === 'claims' && canVerify) {
      items.push(
        { separatorBefore: true, label: 'Verify claim', onSelect: () => setVerifyTarget(row) },
        { label: 'Reject claim', destructive: true, onSelect: () => setRejectTarget(row) },
      )
    }
    return items
  }

  const activeFilters = useMemo(() => {
    const chips: { id: string; label: string; onRemove: () => void }[] = []
    if (statusFilter !== 'all' && tab !== 'claims') {
      chips.push({
        id: 'status',
        label: `Status: ${paymentStatusDisplay(statusFilter).label}`,
        onRemove: () => setFilter('status', 'all'),
      })
    }
    if (methodFilter !== 'all') {
      chips.push({ id: 'method', label: `Method: ${paymentMethodLabel(methodFilter)}`, onRemove: () => setFilter('method', 'all') })
    }
    if (typeFilter !== 'all') {
      chips.push({ id: 'type', label: `Type: ${paymentTypeLabel(typeFilter)}`, onRemove: () => setFilter('type', 'all') })
    }
    if (fromFilter || toFilter) chips.push({ id: 'date', label: 'Date range', onRemove: () => applyPreset('all') })
    if (sort !== DEFAULT_FINANCE_SORT) {
      chips.push({ id: 'sort', label: `Sort: ${financeSortLabel(sort)}`, onRemove: () => setSort(DEFAULT_FINANCE_SORT) })
    }
    if (searchTerm) {
      chips.push({
        id: 'search',
        label: `Search: "${searchTerm}"`,
        onRemove: () => {
          setSearchTerm('')
          updateUrl((url) => url.searchParams.set('page', '1'))
        },
      })
    }
    return chips
    // The URL helpers are stable; the values below are the filters that matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, methodFilter, typeFilter, fromFilter, toFilter, searchTerm, sort, tab])

  const activeClaim = verifyTarget ?? rejectTarget
  const selectedClaims = rows.filter((r) => selectedIds.has(r.id) && paymentStatusDisplay(r.status).group === 'claims').length


  const columns: FinanceColumn<Payment>[] = [
    {
      id: 'customer',
      header: 'Customer',
      sortGroup: 'name',
      render: (row) => (
        <div className="flex min-w-0 items-center gap-[0.7rem]">
          <Avatar name={row.customerName ?? ''} size="sm" decorative />
          <div className="min-w-0">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                openPayment(row)
              }}
              className="block max-w-full truncate text-left font-semibold tracking-snug hover:underline focus-visible:shadow-ring focus-visible:outline-none"
            >
              {row.customerName || 'Unknown customer'}
            </button>
            <span className="block truncate text-caption text-muted">
              {paymentTypeLabel(row.type)} · {row.reference}
            </span>
          </div>
        </div>
      ),
    },
    {
      id: 'code',
      header: 'M-Pesa code',
      hideBelow: 'sm',
      render: (row) =>
        row.method === 'mpesa' ? (
          row.parsedTransactionCode ? (
            <span className="inline-flex items-center gap-[0.3rem]">
              <span className="truncate font-mono text-meta">{row.parsedTransactionCode}</span>
              <CopyButton value={row.parsedTransactionCode} label="Copy M-Pesa code" />
            </span>
          ) : (
            <span className="text-meta text-subtle">Not received</span>
          )
        ) : (
          <MethodPill label="Cash" cash />
        ),
    },
    {
      id: 'phone',
      header: 'Sent from',
      hideBelow: 'md',
      render: (row) => (
        <span className="text-meta">
          {row.phoneNumber ? displayPhone(row.phoneNumber) : <span className="text-subtle">—</span>}
        </span>
      ),
    },
    {
      id: 'date',
      header: 'Date',
      hideBelow: 'lg',
      sortGroup: 'date',
      render: (row) => (
        <span className="block text-label">
          {financeDate(row.createdAt)}
          <span className="block text-caption text-muted">{financeTime(row.createdAt)}</span>
        </span>
      ),
    },
    { id: 'status', header: 'Status', render: (row) => <PaymentStatusPill status={row.status} /> },
    {
      id: 'amount',
      header: 'Amount',
      align: 'right',
      sortGroup: 'amount',
      render: (row) => <span className="tabular font-semibold whitespace-nowrap">{money(row.amount)}</span>,
    },
  ]

  const card = (row: Payment): FinanceCardData => {
    const group = paymentStatusDisplay(row.status).group
    return {
      tone: group === 'paid' ? 'ok' : group === 'claims' ? 'warning' : group === 'failed' ? 'danger' : 'neutral',
      leading: <Avatar name={row.customerName ?? ''} size="sm" decorative />,
      title: row.customerName || 'Unknown customer',
      subtitle: `${paymentTypeLabel(row.type)} · ${row.reference}`,
      amount: money(row.amount),
      fields: [
        {
          label: 'M-Pesa code',
          value:
            row.method === 'mpesa' ? (
              row.parsedTransactionCode ? (
                <span className="font-mono">{row.parsedTransactionCode}</span>
              ) : (
                <span className="text-subtle">Not received</span>
              )
            ) : (
              'Cash at the salon'
            ),
        },
        { label: 'Sent from', value: row.phoneNumber ? displayPhone(row.phoneNumber) : '—' },
      ],
      footer: (
        <>
          <PaymentStatusPill status={row.status} />
          <span className="text-caption text-muted">
            {financeDate(row.createdAt)}, {financeTime(row.createdAt)}
          </span>
        </>
      ),
    }
  }

  const emptyState =
    tab === 'claims' ? (
      <EmptyState icon={<ShieldCheck className="size-5" />} title="All caught up" description="No claims are waiting for your review." />
    ) : (
      <EmptyState
        icon={<RefreshCw className="size-5" />}
        title="No payments match"
        description="Try a different date range or clear your filters."
        action={
          <Button size="sm" onClick={resetFilters}>
            Clear filters
          </Button>
        }
      />
    )

  const today = dashboard.data
  const cashShare = today?.cashCollectedToday ?? 0
  const mpesaShare = today?.mpesaCollectedToday ?? 0

  const metrics: FinanceMetric[] = [
    {
      key: 'month',
      label: 'This month',
      value: money(today?.monthCollected ?? 0),
      hint: `${today?.monthCount ?? 0} payment${(today?.monthCount ?? 0) === 1 ? '' : 's'}`,
    },
    {
      key: 'pending',
      label: 'Pending',
      value: money(today?.pendingAmount ?? 0),
      hint: `${today?.pendingCount ?? 0} awaiting payment`,
    },
    {
      key: 'failed',
      label: 'Failed',
      value: String(today?.failedCount ?? 0),
      hint: 'Not collected',
    },
    {
      key: 'claims',
      label: 'Needs verification',
      value: claimsAwaiting,
      hint: money(today?.awaitingVerificationAmount ?? 0),
      hot: claimsAwaiting > 0,
      onClick: () => setTab('claims'),
      actionLabel: claimsAwaiting > 0 ? 'Review claims' : undefined,
    },
  ]

  if (!enabled) {
    return (
      <div>
        <PageHeader title="Payments" description="Money collected for appointments" />
        <EmptyState
          title="Finance is not available"
          description="This business's plan does not include the financials module, or your role cannot view finances."
        />
      </div>
    )
  }


  return (
    <div>
      <PageHeader title="Payments" description="Money collected for appointments" />

      <FinanceStats
        panel={
          <FinanceSummaryPanel
            label="Collected today"
            amount={today?.todayCollected ?? 0}
            badge={`${today?.todayCount ?? 0} payment${(today?.todayCount ?? 0) === 1 ? '' : 's'}`}
            segments={[
              { key: 'cash', label: 'Cash', value: cashShare, tone: 'gold' },
              { key: 'mpesa', label: 'M-Pesa', value: mpesaShare, tone: 'accent' },
            ]}
            legend={[
              { key: 'cash', label: 'Cash', value: money(cashShare), tone: 'gold' },
              { key: 'mpesa', label: 'M-Pesa', value: money(mpesaShare), tone: 'accent' },
            ]}
          />
        }
        metrics={metrics}
      />

      <Tabs
        label="Payment views"
        value={tab}
        onValueChange={(value) => setTab(value as Tab)}
        className="mb-[0.9rem]"
        items={[
          { value: 'all', label: 'All payments' },
          { value: 'claims', label: 'Needs verification', badge: claimsAwaiting > 0 ? claimsAwaiting : undefined },
        ]}
      />

      <div className="mb-4 flex flex-wrap items-center gap-[0.6rem]">
        <SearchField
          className="min-w-[12rem] flex-1"
          label="Search payments"
          placeholder="Search name, M-Pesa code, phone or reference"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
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

      {payments.isFetching && !isLoading ? (
        <p className="mb-3 text-caption text-subtle" role="status">
          Updating…
        </p>
      ) : null}

      {isError ? (
        <Alert tone="danger" title="Payments could not be loaded" className="mb-4">
          <p>{errorMessage(error, 'Something went wrong. Please try again.')}</p>
          <Button size="sm" className="mt-2" onClick={() => payments.refetch()}>
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
                : `${totalCount} payment${totalCount === 1 ? '' : 's'} · select payments to export`
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
            onOpen={openPayment}
            ariaLabel="Payments"
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
          <>
            {canVerify && selectedClaims > 0 ? (
              <Button size="sm" variant="primary" onClick={() => void handleBulkVerify()} disabled={bulkBusy}>
                <ShieldCheck className="size-4" aria-hidden="true" />
                {bulkBusy ? 'Verifying…' : `Verify ${selectedClaims} claim${selectedClaims === 1 ? '' : 's'}`}
              </Button>
            ) : null}
            <Button
              size="sm"
              variant="ghost"
              className="text-on-inverse hover:bg-on-inverse/10"
              onClick={() => void exportCsv()}
              disabled={exporting}
            >
              {exporting ? 'Preparing…' : 'Export CSV'}
            </Button>
          </>
        }
      />


      <FilterDrawer
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        title="Filters and sorting"
        description="Narrow the register by status, method, type or date."
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
            <p className="mb-[0.5rem] text-label font-semibold">Status</p>
            <ChipGroup label="Status">
              {STATUS_OPTIONS.map((option) => (
                <Chip
                  key={option.value}
                  pressed={statusFilter === option.value}
                  onPressedChange={() => setFilter('status', option.value)}
                >
                  {option.label}
                </Chip>
              ))}
            </ChipGroup>
            <p className="mt-[0.4rem] text-caption text-subtle">
              “Needs verification” has its own tab, so claims are counted and paged as one queue.
            </p>
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
            <p className="mb-[0.5rem] text-label font-semibold">Type</p>
            <ChipGroup label="Type">
              {TYPE_OPTIONS.map((option) => (
                <Chip
                  key={option.value}
                  pressed={typeFilter === option.value}
                  onPressedChange={() => setFilter('type', option.value)}
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
                onChange={(e) => applyDate('from', e.target.value)}
                className="input"
                aria-label="From"
              />
              <span className="text-meta text-muted">to</span>
              <input
                type="date"
                value={toFilter ?? ''}
                onChange={(e) => applyDate('to', e.target.value)}
                className="input"
                aria-label="To"
              />
            </div>
          </div>
        </div>
      </FilterDrawer>

      <FinanceClaimDialogs
        verifyOpen={verifyTarget !== null}
        verifyPending={verify.isPending}
        onVerifyClose={() => setVerifyTarget(null)}
        onVerify={handleVerify}
        rejectOpen={rejectTarget !== null}
        rejectPending={reject.isPending}
        onRejectClose={() => setRejectTarget(null)}
        onReject={handleReject}
        rejectionReason={rejectionReason}
        onRejectionReasonChange={setRejectionReason}
        claim={
          activeClaim
            ? {
                id: activeClaim.id,
                customerName: activeClaim.customerName,
                amount: activeClaim.amount,
                reference: activeClaim.reference,
                parsedTransactionCode: activeClaim.parsedTransactionCode,
              }
            : null
        }
      />
    </div>
  )
}

