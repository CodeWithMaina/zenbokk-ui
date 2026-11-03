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
import { errorMessage } from '../lib/api/client'
import { useDashboardContext } from '../lib/dashboard/dashboard-context'
import { formatNumber, pluralize } from '../lib/format'
import { useDebouncedValue } from '../lib/hooks/use-debounced-value'
import {
  SERVICE_STATUSES,
  SORT_OPTIONS,
  appliedServiceFilters,
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
 * back-navigation keeps the search term, the refinements, the sort and the page.
 * The keys are optional because the validator below fills in the defaults.
 */
type ServicesSearch = {
  q?: string
  status?: string
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

function parseNumber(value: unknown): number | undefined {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined
}

function validateSearch(search: Record<string, unknown>): ServicesSearch {
  const sortIds = SORT_OPTIONS.map((option) => option.id) as string[]
  const page = Number(search.page)
  const size = Number(search.size)

  return {
    q: typeof search.q === 'string' && search.q.trim() ? search.q : undefined,
    // Unknown statuses are dropped rather than sent, so a stale link cannot ask
    // the API for a filter it will not honour.
    status: typeof search.status === 'string'
      ? search.status
          .split(',')
          .map((value) => value.trim())
          .filter((value) => (SERVICE_STATUSES as readonly string[]).includes(value))
          .join(',') || undefined
      : undefined,
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

  const page = search.page ?? 1
  const size = search.size ?? 12

  // The URL is the single source of truth for the applied refinements; the
  // search field is local only so typing does not re-render the whole route.
  const filters: ServiceFilterState = useMemo(
    () => ({
      statuses: (search.status?.split(',') ?? []) as ServiceStatus[],
      durations: search.dur?.split(',').filter(Boolean) ?? [],
      minPrice: search.min ?? null,
      maxPrice: search.max ?? null,
      visibility: search.show ?? 'all',
      sort: search.sort ?? 'newest',
      search: search.q,
    }),
    [search.dur, search.max, search.min, search.q, search.show, search.sort, search.status],
  )

  const patchSearch = useCallback(
    (patch: Partial<ServicesSearch>) => {
      void navigate({
        search: (previous) => ({ ...previous, ...patch }),
        replace: true,
      })
    },
    [navigate],
  )

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

  const clearEverything = () => {
    setTerm('')
    void navigate({
      to: '/dashboard/services',
      search: { page: 1 },
      replace: true,
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

  return (
    <div>
      <PageHeader
        title="Services"
        description={
          counts.data
            ? `${formatNumber(counts.data.active)} active · ${formatNumber(counts.data.total)} total`
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
      <div className="flex items-start">
        <div className="min-w-0 flex-1">
          <ServiceToolbar
            search={term}
            onSearchChange={(value) => {
              setTerm(value)
              if (value === '') patchSearch({ q: undefined, page: 1 })
            }}
            activeFilterCount={chips.length}
            filtersOpen={filtersOpen}
            onToggleFilters={() => setFiltersOpen((open) => !open)}
            filtersPanelId="service-filters"
            searching={services.isFetching}
            className="mb-[0.4rem]"
          />

          <ServiceFilterChips
            filters={filters}
            onFiltersChange={(next) =>
              patchSearch({
                status:
                  next.statuses && next.statuses.length > 0 ? next.statuses.join(',') : undefined,
                dur:
                  next.durations && next.durations.length > 0 ? next.durations.join(',') : undefined,
                min: next.minPrice ?? undefined,
                max: next.maxPrice ?? undefined,
                show: next.visibility ?? 'all',
                page: 1,
              })
            }
            onClearAll={clearEverything}
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
                  })
                }
                empty={
                  <EmptyState
                    icon={<Scissors className="size-5" />}
                    title={
                      hasQuery ? 'No services match your search or filters' : 'No services yet'
                    }
                    description={
                      hasQuery
                        ? 'Try a different search term, or clear the refinements to see everything.'
                        : 'Add your first service so clients can see what you offer and book it.'
                    }
                    action={
                      hasQuery ? (
                        <Button onClick={clearEverything}>Clear search and filters</Button>
                      ) : canManage ? (
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
          onClose={() => setFiltersOpen(false)}
          onReset={() =>
            patchSearch({
              status: undefined,
              dur: undefined,
              min: undefined,
              max: undefined,
              show: 'all',
              sort: 'newest',
              page: 1,
            })
          }
          applyLabel={services.data ? `Show ${pluralize(totalCount, 'service')}` : 'Show results'}
        >
          <ServiceFilters
            filters={filters}
            counts={counts.data}
            onFiltersChange={(next) =>
              patchSearch({
                status:
                  next.statuses && next.statuses.length > 0 ? next.statuses.join(',') : undefined,
                dur:
                  next.durations && next.durations.length > 0 ? next.durations.join(',') : undefined,
                min: next.minPrice ?? undefined,
                max: next.maxPrice ?? undefined,
                show: next.visibility ?? 'all',
                sort: next.sort ?? 'newest',
                page: 1,
              })
            }
          />
        </ServiceFilterDrawer>
      </div>
    </div>
  )
}

