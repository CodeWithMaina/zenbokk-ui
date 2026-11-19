import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { Plus, RefreshCw, Scissors } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ServiceFilterChips,
  ServiceFilterDrawer,
  ServiceFilters,
  ServiceGrid,
  ServiceGridSkeleton,
  ServiceToolbar,
} from '../components/services'
import { Alert } from '../components/ui/alert'
import { Button } from '../components/ui/button'
import { EmptyState } from '../components/ui/empty-state'
import { PageHeader } from '../components/ui/page-header'
import { PaginationBar } from '../components/ui/pagination-bar'
import { Tabs } from '../components/ui/tabs'
import { errorMessage } from '../lib/api/client'
import { useDashboardContext } from '../lib/dashboard/dashboard-context'
import { formatNumber, pluralize } from '../lib/format'
import { useDebouncedValue } from '../lib/hooks/use-debounced-value'
import {
  SERVICE_STATUSES,
  SERVICE_STATUS_TABS,
  SORT_OPTIONS,
  appliedServiceFilters,
  countActiveFilters,
  useServiceCounts,
  useServices,
} from '../lib/services'
import type {
  ServiceFilters as ServiceFilterState,
  ServiceSort,
  ServiceStatus,
} from '../lib/services'

/**
 * Every list control lives in the URL, so a refresh, a shared link or a
 * back-navigation keeps the tab, the search term, the refinements, the sort and
 * the page. `status` is the Active/Paused/Archived tab — one status, because a
 * service only ever has one lifecycle state.
 */
type ServicesSearch = {
  q?: string
  status?: ServiceStatus
  min?: number
  max?: number
  dur?: string
  show?: 'all' | 'visible' | 'hidden'
  sort?: ServiceSort
  page?: number
  size?: number
}

const PAGE_SIZES = [8, 12, 24, 48] as const
const VISIBILITY_VALUES = ['all', 'visible', 'hidden'] as const
const DEFAULT_TAB: ServiceStatus = 'active'

/** The refinements the panel owns; the tab and the search term are separate. */
const EMPTY_REFINEMENTS: ServiceFilterState = {
  durations: [],
  minPrice: null,
  maxPrice: null,
  visibility: 'all',
  sort: 'newest',
}

function parseNumber(value: unknown): number | undefined {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined
}

function validateSearch(search: Record<string, unknown>): ServicesSearch {
  const sortIds = SORT_OPTIONS.map((option) => option.id) as string[]
  const page = Number(search.page)
  const size = Number(search.size)
  const status = String(search.status ?? '')
    .split(',')
    .map((value) => value.trim())
    .find((value) => (SERVICE_STATUSES as readonly string[]).includes(value)) as ServiceStatus | undefined

  return {
    q: typeof search.q === 'string' && search.q.trim() ? search.q : undefined,
    status: status ?? DEFAULT_TAB,
    min: parseNumber(search.min),
    max: parseNumber(search.max),
    dur: typeof search.dur === 'string' && search.dur.trim() ? search.dur : undefined,
    show: (VISIBILITY_VALUES as readonly string[]).includes(String(search.show))
      ? (search.show as ServicesSearch['show'])
      : 'all',
    sort: sortIds.includes(String(search.sort)) ? (search.sort as ServiceSort) : 'newest',
    page: Number.isFinite(page) && page > 0 ? Math.floor(page) : 1,
    size: (PAGE_SIZES as readonly number[]).includes(size) ? size : 12,
  }
}

export const Route = createFileRoute('/dashboard/services/')({
  validateSearch,
  component: ServicesPage,
})

function ServicesPage() {
  const navigate = useNavigate({ from: Route.fullPath })
  const search = Route.useSearch()
  const { canSee, hasPermission } = useDashboardContext()
  const canManage = hasPermission('serviceCatalog.manage')
  const entitled = canSee('services')

  const [filtersOpen, setFiltersOpen] = useState(false)
  const [term, setTerm] = useState(search.q ?? '')
  const debouncedTerm = useDebouncedValue(term, 300)

  const tab: ServiceStatus = search.status ?? DEFAULT_TAB
  const page = search.page ?? 1
  const size = search.size ?? 12

  // The URL is the single source of truth for the *applied* refinements; the search
  // field and the drawer's draft are local, so typing or dragging cannot move the
  // results before Apply.
  const filters: ServiceFilterState = useMemo(
    () => ({
      statuses: [tab],
      durations: search.dur?.split(',').filter(Boolean) ?? [],
      minPrice: search.min ?? null,
      maxPrice: search.max ?? null,
      visibility: search.show ?? 'all',
      sort: search.sort ?? 'newest',
      search: search.q,
    }),
    [search.dur, search.max, search.min, search.q, search.show, search.sort, tab],
  )
  const appliedRefinements = countActiveFilters(filters)

  const [draft, setDraft] = useState<ServiceFilterState>(filters)

  const patchSearch = useCallback(
    (patch: Partial<ServicesSearch>) => {
      void navigate({
        // Undefined means "remove this key": merging `{ ...previous, min: undefined }`
        // would leave the old value in the URL, which is what kept a cleared price
        // range applied.
        search: (previous) => {
          const next: Record<string, unknown> = { ...previous }
          for (const [key, value] of Object.entries(patch)) {
            if (value === undefined) delete next[key]
            else next[key] = value
          }
          return next
        },
        replace: true,
      })
    },
    [navigate],
  )

  // Opening always reflects what is applied, never a discarded draft.
  const openFilters = () => {
    setDraft(filters)
    setFiltersOpen(true)
  }

  // Closing discards: Escape, the scrim, the close button and Cancel all land here.
  const closeFilters = () => {
    setDraft(filters)
    setFiltersOpen(false)
  }

  const applyDraft = () => {
    patchSearch({
      dur: draft.durations && draft.durations.length > 0 ? draft.durations.join(',') : undefined,
      min: draft.minPrice ?? undefined,
      max: draft.maxPrice ?? undefined,
      show: draft.visibility ?? 'all',
      sort: draft.sort ?? 'newest',
      page: 1,
    })
    setFiltersOpen(false)
  }

  // Clear all resets the panel's refinements only — the Active/Paused/Archived tab
  // is where the owner is, not a filter they accidentally chose.
  const clearDraft = () => setDraft({ ...EMPTY_REFINEMENTS })

  // Debounced search is pushed into the URL, so the server query (and the
  // shareable link) always match what the owner has typed. The comparison makes
  // this idempotent: it runs at most once per debounce tick.
  const effectiveTerm = debouncedTerm.trim()
  useEffect(() => {
    if (effectiveTerm === (search.q ?? '')) return
    patchSearch({ q: effectiveTerm || undefined, page: 1 })
  }, [effectiveTerm, patchSearch, search.q])

  const services = useServices(filters, page, size, entitled)
  const counts = useServiceCounts(entitled)

  const rows = services.data?.items ?? []
  const totalCount = services.data?.totalCount ?? 0
  const pageCount = services.data?.totalPages ?? 1
  const chips = appliedServiceFilters(filters)
  const hasQuery = Boolean(filters.search) || chips.length > 0
  const draftCount = countActiveFilters(draft)
  const draftPending =
    draftCount !== appliedRefinements ||
    (draft.minPrice ?? null) !== (filters.minPrice ?? null) ||
    (draft.maxPrice ?? null) !== (filters.maxPrice ?? null) ||
    (draft.sort ?? 'newest') !== (filters.sort ?? 'newest') ||
    (draft.visibility ?? 'all') !== (filters.visibility ?? 'all') ||
    (draft.durations ?? []).join(',') !== (filters.durations ?? []).join(',')

  const priceBounds =
    counts.data && counts.data.minPrice !== null && counts.data.maxPrice !== null
      ? { min: counts.data.minPrice, max: counts.data.maxPrice }
      : undefined

  const clearAppliedRefinements = () => {
    setTerm('')
    patchSearch({
      q: undefined,
      min: undefined,
      max: undefined,
      dur: undefined,
      show: 'all',
      sort: 'newest',
      page: 1,
    })
  }

  if (!entitled) {
    return (
      <div>
        <PageHeader
          title="Services"
          description="This module is not available in your workspace."
        />
        <Alert tone="info" title="Services isn’t part of your current plan">
          Your workspace is not entitled to the “serviceCatalog” module, so this screen stays
          hidden.{' '}
          <Link to="/dashboard/settings" className="link font-semibold">
            Review your plan and modules
          </Link>
        </Alert>
      </div>
    )
  }

  const tabLabel = SERVICE_STATUS_TABS.find((entry) => entry.value === tab)?.label ?? 'Active'

  return (
    <div>
      <PageHeader
        title="Services"
        description={
          counts.data
            ? `${formatNumber(counts.data.active)} active · ${formatNumber(counts.data.paused)} paused · ${formatNumber(counts.data.archived)} archived`
            : 'Everything you offer, with its photos, price and duration.'
        }
        actions={
          canManage ? (
            <Link to="/dashboard/services/new" className="btn btn-primary no-underline">
              <Plus className="size-4" aria-hidden="true" />
              New service
            </Link>
          ) : null
        }
      />

      <Tabs
        label="Service status"
        value={tab}
        onValueChange={(value) => {
          // Switching tabs changes which services are listed; it never changes a
          // service's status. The page resets so the new tab starts at page 1.
          patchSearch({ status: value as ServiceStatus, page: 1 })
        }}
        className="mb-[0.9rem]"
        items={SERVICE_STATUS_TABS.map((entry) => ({
          value: entry.value,
          label: entry.label,
          badge: counts.data ? counts.data[entry.value] : undefined,
        }))}
      />

      <div className="flex items-start">
        <div className="min-w-0 flex-1">
          <ServiceToolbar
            search={term}
            onSearchChange={(value) => {
              setTerm(value)
              if (value === '') patchSearch({ q: undefined, page: 1 })
            }}
            activeFilterCount={appliedRefinements}
            filtersOpen={filtersOpen}
            onToggleFilters={() => (filtersOpen ? closeFilters() : openFilters())}
            filtersPanelId="service-filters"
            searching={services.isFetching}
            className="mb-[0.4rem]"
          />

          <ServiceFilterChips
            filters={filters}
            onFiltersChange={(next) =>
              patchSearch({
                min: next.minPrice ?? undefined,
                max: next.maxPrice ?? undefined,
                dur: next.durations && next.durations.length > 0 ? next.durations.join(',') : undefined,
                show: next.visibility ?? 'all',
                page: 1,
              })
            }
            onClearAll={clearAppliedRefinements}
            summary={
              services.data
                ? `${formatNumber(rows.length)} of ${pluralize(totalCount, 'service')}`
                : undefined
            }
            className="my-[0.2rem] mb-[0.9rem]"
          />


          {services.isPending ? (
            <ServiceGridSkeleton count={Math.min(size, 6)} />
          ) : services.isError ? (
            <Alert tone="danger" title="Services could not be loaded">
              <p>{errorMessage(services.error)}</p>
              <Button
                size="sm"
                className="mt-[0.6rem]"
                onClick={() => void services.refetch()}
                disabled={services.isFetching}
              >
                <RefreshCw className="size-3.5" aria-hidden="true" />
                Try again
              </Button>
            </Alert>
          ) : (
            <>
              <ServiceGrid
                services={rows}
                onOpen={(service) =>
                  void navigate({
                    to: '/dashboard/services/$serviceId',
                    params: { serviceId: service.id },
                    // Carrying the tab across is what makes going back land on the
                    // list the owner left rather than on the default Active tab.
                    search: { status: tab },
                  })
                }
                empty={
                  <EmptyState
                    icon={<Scissors className="size-5" />}
                    title={
                      hasQuery
                        ? `No ${tabLabel.toLowerCase()} services match your filters`
                        : emptyTitle(tab)
                    }
                    description={
                      hasQuery
                        ? 'Try a different search term, or clear the refinements to see everything.'
                        : emptyDescription(tab)
                    }
                    action={
                      hasQuery ? (
                        <Button onClick={clearAppliedRefinements}>Clear search and filters</Button>
                      ) : tab === 'active' && canManage ? (
                        <Link to="/dashboard/services/new" className="btn btn-primary no-underline">
                          New service
                        </Link>
                      ) : null
                    }
                  />
                }
              />

              {pageCount > 1 ? (
                <div className="mt-[1.1rem]">
                  <PaginationBar
                    page={page}
                    pageCount={pageCount}
                    onPageChange={(nextPage) => patchSearch({ page: nextPage })}
                    pageSize={size}
                    pageSizeOptions={PAGE_SIZES}
                    onPageSizeChange={(nextSize) => patchSearch({ size: nextSize, page: 1 })}
                  />
                </div>
              ) : null}
            </>
          )}
        </div>

        <ServiceFilterDrawer
          panelId="service-filters"
          open={filtersOpen}
          onClose={closeFilters}
          onApply={applyDraft}
          onClearAll={clearDraft}
          appliedCount={appliedRefinements}
          draftCount={draftCount}
          applyLabel={
            draftPending || !services.data
              ? 'Apply filters'
              : `Show ${pluralize(totalCount, 'service')}`
          }
        >
          <ServiceFilters filters={draft} onFiltersChange={setDraft} priceBounds={priceBounds} />
        </ServiceFilterDrawer>
      </div>
    </div>
  )
}

function emptyTitle(tab: ServiceStatus): string {
  if (tab === 'paused') return 'No paused services'
  if (tab === 'archived') return 'Nothing archived'
  return 'No active services yet'
}

function emptyDescription(tab: ServiceStatus): string {
  if (tab === 'paused') {
    return 'A paused service stays in your catalogue but cannot be booked. Resume it to put it back on the storefront.'
  }
  if (tab === 'archived') {
    return 'Archived services are hidden everywhere. Restore one to bring it back into your catalogue.'
  }
  return 'Add your first service so clients can see what you offer and book it.'
}

