import { useEffect, useMemo, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { formatDuration, money } from '../../lib/format'
import type { StorefrontSearchResult } from '../../lib/api/types'
import { useStorefront } from '../../lib/storefront'
import { useStorefrontSearch } from '../../lib/storefront/use-storefront-public'
import { storefrontHref } from '../../lib/tenant'
import { Button } from '../ui/button'
import { ResponsiveImage } from '../ui/responsive-image'
import { SearchField } from '../ui/search-field'
import {
  StorefrontEmptyState,
  StorefrontErrorState,
  StorefrontSkeletonGrid,
} from './StorefrontStates'

type Scope = 'all' | 'services' | 'team'

const PAGE_SIZE = 12

/** Debounce the typed query so a request is issued per pause, not per keystroke. */
function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])
  return debounced
}

/**
 * One search across everything the business publishes.
 *
 * The matching happens on the server (`GET /v1/businesses/{id}/search`), scoped
 * to this business: published services and publicly visible staff only. The page
 * no longer downloads the whole catalogue and roster to filter them in the
 * browser, so a large business costs the same as a small one.
 *
 * The query is debounced, results are cached per (business, query, scope, page),
 * and paging keeps the previous page on screen while the next loads.
 */
export function StorefrontSearchPage() {
  const { businessId, canonicalSlug } = useStorefront()
  const [query, setQuery] = useState('')
  const [scope, setScope] = useState<Scope>('all')
  const [page, setPage] = useState(1)

  const debouncedQuery = useDebouncedValue(query)
  const hasQuery = debouncedQuery.trim().length > 0

  // A new search always starts at page one. Adjusted during render rather than
  // in an effect (React's documented "reset state when an input changes"
  // pattern), so there is no extra render pass and no cascading effect.
  const searchKey = `${debouncedQuery}\u0000${scope}`
  const [lastSearchKey, setLastSearchKey] = useState(searchKey)
  if (lastSearchKey !== searchKey) {
    setLastSearchKey(searchKey)
    setPage(1)
  }

  const results = useStorefrontSearch(businessId, {
    query: debouncedQuery,
    type: scope,
    page,
    pageSize: PAGE_SIZE,
  })

  const items = results.data?.items ?? []
  const categories = results.data?.categories ?? []
  const totalPages = results.data?.totalPages ?? 0
  const isTyping = query !== debouncedQuery

  const hrefFor = useMemo(
    () => (item: StorefrontSearchResult) =>
      item.type === 'service'
        ? storefrontHref(canonicalSlug, `/services/${item.id}`)
        : storefrontHref(canonicalSlug, `/team/${item.id}`),
    [canonicalSlug],
  )

  return (
    <div className="sf-container py-[clamp(1.5rem,4vw,3rem)]">
      <div className="sf-head">
        <div>
          <p className="sf-eyebrow">Find</p>
          <h1 className="sf-heading">Search</h1>
          <p className="sf-lead">
            Look through everything this business publishes — services and the people who offer
            them.
          </p>
        </div>
      </div>

      <div className="sf-tools">
        <SearchField
          className="sf-search"
          label="Search services and team"
          placeholder="Try “fade”, “nails” or a name"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <div className="sf-chips" role="group" aria-label="Search scope">
          {(['all', 'services', 'team'] as Scope[]).map((option) => (
            <button
              key={option}
              type="button"
              className="sf-chip"
              aria-pressed={scope === option}
              onClick={() => setScope(option)}
            >
              {option === 'all' ? 'All' : option === 'services' ? 'Services' : 'Team'}
            </button>
          ))}
        </div>
      </div>

      {hasQuery && categories.length > 0 ? (
        <div className="sf-chips mt-[0.6rem]" role="group" aria-label="Browse a category">
          {categories.slice(0, 8).map((category) => (
            <button key={category} type="button" className="sf-chip" onClick={() => setQuery(category)}>
              {category}
            </button>
          ))}
        </div>
      ) : null}

      <div className="mt-[1.2rem]" aria-live="polite">
        {!hasQuery ? (
          <StorefrontEmptyState
            title="Start typing to search"
            description="Search by service name, category, specialist or what they do."
          />
        ) : results.isPending || isTyping ? (
          <StorefrontSkeletonGrid variant="list" count={4} />
        ) : results.isError ? (
          <StorefrontErrorState
            title="Search didn’t work"
            description="Please try again in a moment."
            onRetry={() => void results.refetch()}
          />
        ) : items.length === 0 ? (
          <StorefrontEmptyState
            title="No matches"
            description="Try a shorter word, or browse the full service menu instead."
            action={
              <a
                href={storefrontHref(canonicalSlug, '/services')}
                className="btn btn-ghost no-underline"
              >
                Browse services
              </a>
            }
          />
        ) : (
          <>
            <p className="sf-eyebrow mb-[0.5rem]">
              {results.data?.totalCount ?? items.length}{' '}
              {results.data?.totalCount === 1 ? 'result' : 'results'}
            </p>
            <ul className="grid gap-[0.55rem]">
              {items.map((item) => (
                <li key={`${item.type}:${item.id}`}>
                  <a href={hrefFor(item)} className="sf-option no-underline">
                    {item.type === 'service' && item.imageVariants.length > 0 ? (
                      <ResponsiveImage
                        variants={item.imageVariants}
                        alt=""
                        sizes="3.2rem"
                        maxWidth={320}
                        className="sf-option-thumb"
                      />
                    ) : item.type === 'staff' && item.avatarUrl ? (
                      <ResponsiveImage
                        src={item.avatarUrl}
                        alt=""
                        sizes="3.2rem"
                        maxWidth={320}
                        className="sf-option-thumb"
                      />
                    ) : (
                      <span className="sf-option-mono" aria-hidden="true">
                        {item.title.slice(0, 1).toUpperCase()}
                      </span>
                    )}
                    <span className="sf-option-body">
                      <b>{item.title}</b>
                      <span>
                        {item.type === 'staff' ? 'Team · ' : ''}
                        {item.subtitle ?? (item.type === 'staff' ? 'Specialist' : '')}
                        {item.durationMinutes ? ` · ${formatDuration(item.durationMinutes)}` : ''}
                      </span>
                    </span>
                    {item.price != null ? (
                      <span className="sf-option-price">{money(item.price)}</span>
                    ) : null}
                    <ArrowRight className="size-[1.1rem] text-muted" aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ul>

            {totalPages > 1 ? (
              <div className="mt-[1.2rem] flex items-center justify-between gap-[0.6rem]">
                <Button
                  variant="ghost"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  Previous
                </Button>
                <span className="text-caption text-muted">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="ghost"
                  disabled={page >= totalPages}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Next
                </Button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}
