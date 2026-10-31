import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { LayoutGrid, List, Plus, RefreshCw, UsersRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  AddClientDrawer,
  BulkMessageDrawer,
  ClientFilters,
  ClientSelectionDock,
  ExportClientsDrawer,
} from '../components/clients'
import { Alert } from '../components/ui/alert'
import { Button, LinkButton } from '../components/ui/button'
import { Checkbox } from '../components/ui/checkbox'
import { ClientGrid } from '../components/ui/client-grid'
import { ClientTable } from '../components/ui/client-table'
import { EmptyState } from '../components/ui/empty-state'
import { PageHeader } from '../components/ui/page-header'
import { PaginationBar } from '../components/ui/pagination-bar'
import { SearchField } from '../components/ui/search-field'
import { SegmentedControl } from '../components/ui/segmented-control'
import { SelectionBar } from '../components/ui/selection-bar'
import { Skeleton } from '../components/ui/skeleton'
import { Toolbar } from '../components/ui/toolbar'
import { errorMessage } from '../lib/api/client'
import type { BusinessCustomer } from '../lib/api/types'
import { CLIENT_STATUS_FILTERS, ROSTER_STATUS } from '../lib/clients'
import type { ClientStatusFilter } from '../lib/clients'
import { toClientSummary } from '../lib/clients/mappers'
import { useClientCounts, useClients } from '../lib/clients/use-clients'
import { useDashboardContext } from '../lib/dashboard/dashboard-context'
import { MODULE } from '../lib/entitlements'
import { formatNumber, pluralize } from '../lib/format'
import { useDebouncedValue } from '../lib/hooks/use-debounced-value'

type ClientView = 'cards' | 'table'

/**
 * Every list control lives in the URL, so a layout switch, a refresh or a
 * shared link keeps the search term, status, layout and page. The keys are
 * optional because the validator below fills in the defaults — that keeps every
 * navigation to this route free of boilerplate.
 */
type ClientsSearch = {
  q?: string
  status?: ClientStatusFilter
  view?: ClientView
  page?: number
  size?: number
}

const PAGE_SIZES = [8, 12, 24, 48] as const

function validateSearch(search: Record<string, unknown>): ClientsSearch {
  const status = (CLIENT_STATUS_FILTERS as readonly string[]).includes(
    String(search.status),
  )
    ? (search.status as ClientStatusFilter)
    : 'all'

  const page = Number(search.page)
  const size = Number(search.size)

  return {
    q: typeof search.q === 'string' && search.q.trim() ? search.q : undefined,
    status,
    view: search.view === 'table' ? 'table' : 'cards',
    page: Number.isFinite(page) && page > 0 ? Math.floor(page) : 1,
    size: (PAGE_SIZES as readonly number[]).includes(size) ? size : 12,
  }
}

export const Route = createFileRoute('/dashboard/customers/')({
  validateSearch,
  component: ClientsPage,
})

/**
 * Which roster `status` value a chip maps to. `all` is the endpoint's
 * "no enrollment-status filter" value; `active` is its default.
 */
function rosterStatus(filter: ClientStatusFilter): string | null {
  if (filter === 'left') return ROSTER_STATUS.left
  if (filter === 'blocked') return ROSTER_STATUS.blocked
  if (filter === 'all') return ROSTER_STATUS.all
  return ROSTER_STATUS.active
}

function ClientsPage() {
  const { hasModule, business } = useDashboardContext()
  const enabled = hasModule(MODULE.customers)

  const search = Route.useSearch()
  const status = search.status ?? 'all'
  const view = search.view ?? 'cards'
  const page = search.page ?? 1
  const size = search.size ?? 12
  const navigate = useNavigate({ from: Route.fullPath })

  const [term, setTerm] = useState(search.q ?? '')
  const debouncedTerm = useDebouncedValue(term, 300)

  const [selected, setSelected] = useState<Map<string, BusinessCustomer>>(new Map())
  const [addOpen, setAddOpen] = useState(false)
  const [messageOpen, setMessageOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)

  // The box is local so typing never lags; the URL carries the committed term.
  useEffect(() => {
    if ((search.q ?? '') === debouncedTerm) return
    void navigate({
      search: (previous) => ({
        ...previous,
        q: debouncedTerm || undefined,
        page: 1,
      }),
      replace: true,
    })
  }, [debouncedTerm, navigate, search.q])

  const roster = useClients(
    {
      search: search.q ?? null,
      status: rosterStatus(status),
      page,
      pageSize: size,
      sortBy: 'recent',
      sortDirection: 'desc',
    },
    enabled,
  )
  const counts = useClientCounts(enabled)

  const rows = roster.data?.items ?? []
  const selectedIds = new Set(selected.keys())
  const allOnPageSelected = rows.length > 0 && rows.every((row) => selectedIds.has(row.userId))
  const someOnPageSelected = rows.some((row) => selectedIds.has(row.userId))
  const filtered = Boolean(search.q || status !== 'all')
  const totalCount = roster.data?.totalCount ?? 0
  const pageCount = roster.data?.totalPages ?? 1
  const rangeStart = totalCount === 0 ? 0 : (page - 1) * size + 1
  const rangeEnd = Math.min(page * size, totalCount)

  const patchSearch = (patch: Partial<ClientsSearch>) => {
    void navigate({ search: (previous) => ({ ...previous, ...patch }), replace: true })
  }

  const toggleRow = (id: string, isSelected: boolean) => {
    const row = rows.find((item) => item.userId === id)
    setSelected((previous) => {
      const next = new Map(previous)
      if (isSelected && row) next.set(id, row)
      else next.delete(id)
      return next
    })
  }

  const togglePage = (isSelected: boolean) => {
    setSelected((previous) => {
      const next = new Map(previous)
      for (const row of rows) {
        if (isSelected) next.set(row.userId, row)
        else next.delete(row.userId)
      }
      return next
    })
  }

  const openClient = (customerId: string) => {
    void navigate({
      to: '/dashboard/customers/$clientId',
      params: { clientId: customerId },
    })
  }

  const summaries = rows.map((row) => toClientSummary(row))
  const selectedRows = Array.from(selected.values())

  const emptyState = (
    <EmptyState
      icon={<UsersRound className="size-5" />}
      title={filtered ? 'No clients match those filters' : 'No clients yet'}
      description={
        filtered
          ? 'Try a different search term or status.'
          : 'Clients appear here as soon as they join your loyalty programme from your storefront.'
      }
      action={
        filtered ? (
          <Button
            onClick={() => {
              setTerm('')
              patchSearch({ q: undefined, status: 'all', page: 1 })
            }}
          >
            Clear filters
          </Button>
        ) : null
      }
    />
  )

  return (
    <div>
      <PageHeader
        title="Clients"
        description={
          counts.data
            ? `${pluralize(counts.data.all, 'client')} · ${formatNumber(counts.data.active)} active`
            : enabled
              ? 'Loading your client roster…'
              : undefined
        }
        actions={
          enabled ? (
            <Button variant="primary" onClick={() => setAddOpen(true)}>
              <Plus className="size-4" aria-hidden="true" />
              Add client
            </Button>
          ) : null
        }
      />

      {!enabled ? (
        <Alert tone="info" title="Client tools aren’t in this plan">
          The clients module unlocks the roster, loyalty history and engagement
          for everyone enrolled with your business. Add it from settings to see
          who is coming back.
        </Alert>
      ) : (
        <>
          <Toolbar className="mb-[0.6rem] flex-wrap gap-[0.6rem]">
            <SearchField
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder="Search name, email or phone"
              label="Search clients"
              className="min-w-[13rem] flex-1"
              autoComplete="off"
            />
            <SegmentedControl
              label="Layout"
              value={view}
              onValueChange={(nextView) => patchSearch({ view: nextView })}
              options={[
                {
                  value: 'cards',
                  label: 'Cards',
                  icon: <LayoutGrid className="size-4" aria-hidden="true" />,
                },
                {
                  value: 'table',
                  label: 'Table',
                  icon: <List className="size-4" aria-hidden="true" />,
                },
              ]}
            />
          </Toolbar>

          <ClientFilters
            value={status}
            onValueChange={(nextStatus) => patchSearch({ status: nextStatus, page: 1 })}
            counts={counts.data}
            className="mb-[0.7rem]"
          />

          <div className="mb-[0.6rem] flex flex-wrap items-center gap-x-[0.7rem] gap-y-[0.4rem]">
            <Checkbox
              checked={allOnPageSelected}
              indeterminate={someOnPageSelected && !allOnPageSelected}
              onCheckedChange={() => togglePage(!allOnPageSelected)}
              label="Select all clients on this page"
            />
            <SelectionBar
              selectedCount={selected.size}
              itemLabel="selected"
              onClear={() => setSelected(new Map())}
              className="mb-0 min-w-0 flex-1"
              actions={
                <>
                  {selected.size > 0 && selected.size < rows.length ? (
                    <LinkButton onClick={() => togglePage(true)}>
                      Select all {rows.length}
                    </LinkButton>
                  ) : null}
                  <span className="tabular">
                    {rangeStart}–{rangeEnd} of {formatNumber(totalCount)}
                  </span>
                </>
              }
            />
          </div>

          {roster.isPending ? (
            view === 'table' ? (
              <div
                className="card flex flex-col gap-[0.6rem]"
                aria-busy="true"
                aria-label="Loading clients"
              >
                {Array.from({ length: 5 }, (_, index) => (
                  <Skeleton key={index} className="h-9" />
                ))}
              </div>
            ) : (
              <div
                className="grid grid-cols-1 gap-[0.7rem] sm:grid-cols-[repeat(auto-fill,minmax(15rem,1fr))]"
                aria-busy="true"
                aria-label="Loading clients"
              >
                {Array.from({ length: 6 }, (_, index) => (
                  <Skeleton key={index} className="h-[6.2rem] rounded-card" />
                ))}
              </div>
            )
          ) : roster.isError ? (
            <Alert tone="danger" title="Clients could not be loaded">
              <p>{errorMessage(roster.error)}</p>
              <Button
                size="sm"
                className="mt-[0.6rem]"
                onClick={() => void roster.refetch()}
                disabled={roster.isFetching}
              >
                <RefreshCw className="size-3.5" aria-hidden="true" />
                Try again
              </Button>
            </Alert>
          ) : (
            <>
              {view === 'cards' ? (
                <ClientGrid
                  clients={summaries}
                  selectedIds={selectedIds}
                  onSelectedChange={toggleRow}
                  onOpen={(client) => openClient(client.id)}
                  empty={emptyState}
                />
              ) : (
                <ClientTable
                  rows={summaries}
                  selectedIds={selectedIds}
                  onSelectedChange={toggleRow}
                  onSelectAll={togglePage}
                  onOpen={(client) => openClient(client.id)}
                  label="Clients"
                  empty={emptyState}
                />
              )}

              {pageCount > 1 ? (
                <div className="mt-[1.1rem]">
                  <PaginationBar
                    page={page}
                    pageCount={pageCount}
                    onPageChange={(nextPage) => patchSearch({ page: nextPage })}
                    pageSize={size}
                    pageSizeOptions={PAGE_SIZES}
                    onPageSizeChange={(nextSize) =>
                      patchSearch({ size: nextSize, page: 1 })
                    }
                  />
                </div>
              ) : null}
            </>
          )}
        </>
      )}

      <ClientSelectionDock
        selectedCount={selected.size}
        onClear={() => setSelected(new Map())}
        onMessage={() => setMessageOpen(true)}
        onExport={() => setExportOpen(true)}
      />

      <AddClientDrawer
        open={addOpen}
        onClose={() => setAddOpen(false)}
        slug={business.slug}
        onOpenClient={openClient}
      />

      <BulkMessageDrawer
        open={messageOpen}
        onClose={() => setMessageOpen(false)}
        recipients={selectedRows.map((row) => ({
          id: row.userId,
          name: row.fullName,
          detail: row.phoneNumber ?? undefined,
        }))}
      />

      <ExportClientsDrawer
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        selectedRows={selectedRows}
        search={search.q ?? ''}
        matchingCount={totalCount}
        onExported={(message) => toast.success(message)}
      />
    </div>
  )
}
