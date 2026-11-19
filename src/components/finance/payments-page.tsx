import { useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Filter, RefreshCw, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '../ui/page-header'
import { Button } from '../ui/button'
import { SearchField } from '../ui/search-field'
import { EmptyState } from '../ui/empty-state'
import { Alert } from '../ui/alert'
import { Avatar } from '../ui/avatar'
import { Chip, ChipGroup } from '../ui/chip'
import { FilterDrawer, FilterSummary } from '../ui/filter-drawer'
import { StatStrip } from '../ui/stat-tile'
import { PaginationBar } from '../ui/pagination-bar'
import { SelectionBar } from '../ui/selection-bar'
import { BulkActionBar } from '../ui/bulk-action-bar'
import { Tabs } from '../ui/tabs'
import type { MenuItem } from '../ui/menu'
import { FinanceTable, FinanceTableSkeleton, type FinanceColumn } from './table'
import { PaymentStatusPill, MethodPill, CopyButton } from './pills'
import { usePayments, usePaymentsDashboard, type Payment } from '../../lib/payments/api'
import { useDashboardContext } from '../../lib/dashboard/dashboard-context'
import { MODULE } from '../../lib/entitlements'
import { useClaimDecisions, useBulkVerifyClaims } from '../../lib/finances/api'
import { useVerificationBadgeCount } from '../../lib/finances/use-verification-badge'
import { FinanceClaimDialogs } from './claim-dialogs'
import { errorMessage } from '../../lib/api/client'
import { money, displayPhone, financeDateTime } from '../../lib/format'
import { paymentStatusDisplay, paymentTypeLabel, paymentMethodLabel } from '../../lib/finances/status'
import { downloadCsv } from '../../lib/finances/csv'
import { presetRange, useDebouncedValue } from '../../lib/finances/use-debounced-value'

type Tab = 'all' | 'claims'

const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'paid', label: 'Paid' },
  { value: 'pending', label: 'Pending' },
  { value: 'claims', label: 'Needs verification' },
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
    page,
    pageSize,
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
  const page = parsed.page
  const pageSize = parsed.pageSize

  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearch = useDebouncedValue(searchTerm, 350)
  const [filterOpen, setFilterOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [verifyTarget, setVerifyTarget] = useState<Payment | null>(null)
  const [rejectTarget, setRejectTarget] = useState<Payment | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [preset, setPreset] = useState('all')
  /** Held while a bulk run is in flight, so a second tap cannot re-submit the batch. */
  const [bulkBusy, setBulkBusy] = useState(false)

  const dashboard = usePaymentsDashboard(enabled)
  // The badge's own source: same query, same number as the navigation shows.
  const verificationBadge = useVerificationBadgeCount(enabled)
  const payments = usePayments(
    {
      status: statusFilter === 'all' ? undefined : statusFilter,
      method: methodFilter === 'all' ? undefined : methodFilter,
      type: typeFilter === 'all' ? undefined : typeFilter,
      from: fromFilter,
      to: toFilter,
      search: debouncedSearch.trim() || undefined,
      page,
      pageSize,
    },
    enabled,
  )
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

  // Filtering happens on the server: search is part of the query, so nothing here narrows the page again.
  const claimsRows = tab === 'claims' ? rows.filter((r) => paymentStatusDisplay(r.status).group === 'claims') : rows

  const selectedCount = selectedIds.size
  const selectedTotal = rows.reduce((sum, r) => (selectedIds.has(r.id) ? sum + r.amount : sum), 0)

  const updateUrl = (mutate: (url: URL) => void) => {
    const url = new URL(window.location.href)
    mutate(url)
    window.history.replaceState({}, '', url.toString())
    setSelectedIds(new Set())
  }

  const activeFilters = useMemo(() => {
    const chips: { id: string; label: string; onRemove: () => void }[] = []
    if (statusFilter !== 'all') chips.push({ id: 'status', label: `Status: ${paymentStatusDisplay(statusFilter).label}`, onRemove: () => setFilter('status', 'all') })
    if (methodFilter !== 'all') chips.push({ id: 'method', label: `Method: ${paymentMethodLabel(methodFilter)}`, onRemove: () => setFilter('method', 'all') })
    if (typeFilter !== 'all') chips.push({ id: 'type', label: `Type: ${paymentTypeLabel(typeFilter)}`, onRemove: () => setFilter('type', 'all') })
    if (fromFilter || toFilter) chips.push({ id: 'date', label: 'Date range', onRemove: () => applyPreset('all') })
    if (searchTerm) chips.push({ id: 'search', label: `Search: "${searchTerm}"`, onRemove: () => { setSearchTerm(''); updateUrl((url) => url.searchParams.set('page', '1')) } })
    return chips
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, methodFilter, typeFilter, fromFilter, toFilter, searchTerm])

  const handlePageChange = (nextPage: number) => updateUrl((url) => url.searchParams.set('page', String(nextPage)))
  const handlePageSizeChange = (nextSize: number) => updateUrl((url) => { url.searchParams.set('pageSize', String(nextSize)); url.searchParams.set('page', '1') })
  const setTab = (next: Tab) => updateUrl((url) => { if (next === 'all') url.searchParams.delete('tab'); else url.searchParams.set('tab', next); url.searchParams.set('page', '1') })

  const toggleRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  const togglePageSelect = (selectAll: boolean) => setSelectedIds(selectAll ? new Set(claimsRows.map((r) => r.id)) : new Set())

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
      for (const key of ['tab', 'status', 'method', 'type', 'search', 'from', 'to', 'page']) url.searchParams.delete(key)
    })
    setFilterOpen(false)
  }
  const handleVerify = async (paymentId: string, note: string | null, receivedAmount?: number | null) => {
    try {
      await verify.mutateAsync({ paymentId, note, receivedAmount })
      toast.success('Claim verified \u00b7 added to cashbook')
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
    const claims = claimsRows.filter((r) => paymentStatusDisplay(r.status).group === 'claims' && selectedIds.has(r.id))
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
    } catch (error) {
      toast.error(errorMessage(error, 'Bulk verification failed. Please try again.'))
    } finally {
      setBulkBusy(false)
      setSelectedIds(new Set())
    }
  }

  const openPayment = (row: Payment) => {
    navigate({ to: '/dashboard/finances/payments/$paymentId', params: { paymentId: row.id } })
  }

  const exportCsv = () => {
    const selected = claimsRows.filter((r) => selectedIds.has(r.id))
    const list = selected.length > 0 ? selected : claimsRows
    if (list.length === 0) {
      toast.info('Nothing to export yet')
      return
    }
    downloadCsv('payments.csv', [
      ['Date', 'Reference', 'Customer', 'Type', 'Method', 'M-Pesa code', 'Phone', 'Amount (KES)', 'Status'],
      ...list.map((r) => [
        financeDateTime(r.createdAt),
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
  }

  const rowMenuItems = (row: Payment): readonly MenuItem[] => {
    const items: MenuItem[] = [{ label: 'Open payment', onSelect: () => openPayment(row) }]
    if (row.parsedTransactionCode) {
      items.push({ label: 'Copy M-Pesa code', onSelect: () => void navigator.clipboard.writeText(row.parsedTransactionCode ?? '') })
    }
    items.push({ label: 'Copy reference', onSelect: () => void navigator.clipboard.writeText(row.reference) })
    if (paymentStatusDisplay(row.status).group === 'claims' && canVerify) {
      items.push(
        { separatorBefore: true, label: 'Verify claim', onSelect: () => setVerifyTarget(row) },
        { label: 'Reject claim', destructive: true, onSelect: () => setRejectTarget(row) },
      )
    }
    return items
  }

  const activeClaim = verifyTarget ?? rejectTarget

  const columns: FinanceColumn<Payment>[] = [
    {
      id: 'customer',
      header: 'Customer',
      render: (row) => (
        <div className="flex min-w-0 items-center gap-[0.7rem]">
          <Avatar name={row.customerName ?? ''} size="sm" decorative />
          <div className="min-w-0">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); openPayment(row) }}
              className="block max-w-full truncate text-left font-semibold tracking-snug hover:underline focus-visible:shadow-ring focus-visible:outline-none"
            >
              {row.customerName || 'Unknown customer'}
            </button>
            <span className="block truncate text-caption text-muted">{paymentTypeLabel(row.type)} \u00b7 {row.reference}</span>
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
              <CopyButton value={row.parsedTransactionCode} />
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
      render: (row) => <span className="text-meta text-muted">{row.phoneNumber ? displayPhone(row.phoneNumber) : '\u2014'}</span>,
    },
    {
      id: 'date',
      header: 'Date',
      hideBelow: 'lg',
      render: (row) => <span className="text-meta text-muted">{financeDateTime(row.createdAt)}</span>,
    },
    { id: 'status', header: 'Status', render: (row) => <PaymentStatusPill status={row.status} /> },
    { id: 'amount', header: 'Amount', align: 'right', render: (row) => <span className="tabular font-semibold">{money(row.amount)}</span> },
  ]

  const emptyState =
    tab === 'claims' ? (
      <EmptyState icon={<ShieldCheck className="size-5" />} title="All caught up" description="No claims are waiting for your review." />
    ) : (
      <EmptyState icon={<RefreshCw className="size-5" />} title="No payments match" description="Try a different date range or clear your filters." />
    )
  const selectedClaims = claimsRows.filter((r) => selectedIds.has(r.id) && paymentStatusDisplay(r.status).group === 'claims').length

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

      <StatStrip
        items={[
          { value: money(dashboard.data?.todayCollected ?? 0), label: 'Collected today' },
          { value: money(dashboard.data?.monthCollected ?? 0), label: 'This month' },
          { value: String(dashboard.data?.pendingCount ?? 0), label: 'Pending' },
          { value: String(dashboard.data?.failedCount ?? 0), label: 'Failed' },
          { value: String(claimsAwaiting), label: 'Needs verification' },
        ]}
      />

      <Tabs
        label="Payment views"
        value={tab}
        onValueChange={(value) => setTab(value as Tab)}
        className="mb-4"
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
          onChange={(e) => {
            setSearchTerm(e.target.value)
            updateUrl((url) => url.searchParams.set('page', '1'))
          }}
        />
        <Button variant="ghost" onClick={() => setFilterOpen(true)}>
          <Filter className="size-4" aria-hidden="true" />
          Filters{activeFilters.length > 0 ? ` (${activeFilters.length})` : ''}
        </Button>
      </div>

      {payments.isFetching ? <p className="mb-3 text-caption text-subtle" role="status">Searching...</p> : null}

      <FilterSummary filters={activeFilters} onClearAll={resetFilters} summary={`${claimsRows.length} result${claimsRows.length === 1 ? '' : 's'}`} className="mb-3" />

      {isError ? (
        <Alert tone="danger" title="Payments could not be loaded" className="mb-4">
          <p>{errorMessage(error, 'Something went wrong. Please try again.')}</p>
          <Button size="sm" className="mt-2" onClick={() => payments.refetch()}>Try again</Button>
        </Alert>
      ) : null}

      {isLoading ? (
        <FinanceTableSkeleton rows={6} />
      ) : (
        <FinanceTable
          rows={claimsRows}
          rowId={(r) => r.id}
          columns={columns}
          selected={selectedIds}
          onToggleRow={toggleRow}
          onTogglePage={togglePageSelect}
          rowMenuItems={rowMenuItems}
          onOpen={openPayment}
          ariaLabel="Payments"
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
        itemLabel={`selected \u00b7 ${money(selectedTotal)}`}
        onClear={() => setSelectedIds(new Set())}
        actions={
          <>
            {canVerify && selectedClaims > 0 ? (
              <Button
                size="sm"
                variant="primary"
                onClick={() => void handleBulkVerify()}
                disabled={bulkBusy}
              >
                <ShieldCheck className="size-4" aria-hidden="true" />
                {bulkBusy
                  ? 'Verifying…'
                  : `Verify ${selectedClaims} claim${selectedClaims === 1 ? '' : 's'}`}
              </Button>
            ) : null}
            <Button size="sm" variant="ghost" className="text-on-inverse hover:bg-on-inverse/10" onClick={exportCsv}>Export CSV</Button>
          </>
        }
      />

      <FilterDrawer
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        title="Filter payments"
        description="Narrow the register by status, method, type or date."
        onReset={resetFilters}
        applyLabel={`Show ${claimsRows.length} result${claimsRows.length === 1 ? '' : 's'}`}
        onApply={() => setFilterOpen(false)}
      >
        <div className="space-y-[1.1rem]">
          <div>
            <p className="mb-[0.5rem] text-label font-semibold">Status</p>
            <ChipGroup label="Status">
              {STATUS_OPTIONS.map((o) => (
                <Chip key={o.value} pressed={statusFilter === o.value} onPressedChange={() => setFilter('status', o.value)}>{o.label}</Chip>
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
            <p className="mb-[0.5rem] text-label font-semibold">Type</p>
            <ChipGroup label="Type">
              {TYPE_OPTIONS.map((o) => (
                <Chip key={o.value} pressed={typeFilter === o.value} onPressedChange={() => setFilter('type', o.value)}>{o.label}</Chip>
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
