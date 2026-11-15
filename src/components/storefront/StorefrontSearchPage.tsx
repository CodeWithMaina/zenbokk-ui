import { useEffect, useMemo, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { isModuleUnavailable } from '../../lib/api/client'
import type { StorefrontSearchResult } from '../../lib/api/types'
import { formatDuration, money } from '../../lib/format'
import { useStorefront } from '../../lib/storefront'
import { resolveServiceNames } from '../../lib/storefront/search'
import {
  useStorefrontServices,
  useStorefrontTeam,
} from '../../lib/storefront/use-storefront-catalog'
import { useStorefrontSearch } from '../../lib/storefront/use-storefront-public'
import { useStartBooking } from '../../lib/storefront/use-start-booking'
import { storefrontHref } from '../../lib/tenant'
import { Button } from '../ui/button'
import { ResponsiveImage } from '../ui/responsive-image'
import { SearchField } from '../ui/search-field'
import { StorefrontServiceCard } from './StorefrontServiceCard'
import { StorefrontTeamCard } from './StorefrontTeamCard'
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
 * The page is useful before a single keystroke: it opens on the business's own
 * catalogue (and its roster, when the business has staff) so a visitor can see
 * what is offered and start filtering immediately. Typing switches to the
 * server-side search (`GET /v1/businesses/{id}/search`), debounced, paged and
 * cached per (business, query, scope, page); an empty query never issues one.
 *
 * Staff is a business-internal module with no customer capability, so the roster
 * endpoint is the authoritative source of whether teams exist here. When it
 * answers `MODULE_DISABLED` the page behaves as though the team does not exist:
 * no roster request is repeated, no team chip, no team section and no `team`
 * search scope — and until the answer arrives, no team UI is shown at all.
 */
export function StorefrontSearchPage() {
  const { businessId, canonicalSlug, can } = useStorefront()
  const [query, setQuery] = useState('')
  const [scope, setScope] = useState<Scope>('all')
  const [page, setPage] = useState(1)
  const startBooking = useStartBooking()

  const debouncedQuery = useDebouncedValue(query)
  const hasQuery = debouncedQuery.trim().length > 0

  // Initial discovery sources. Both are cached under the business id, so the
  // services grid and the team board re-use exactly what those pages fetched.
  const services = useStorefrontServices(businessId, can('services'))
  const team = useStorefrontTeam(businessId, [])

  // Staff availability, from the canonical entitlement source (the roster
  // endpoint). Pending is treated as "not yet known": team UI is withheld so it
  // can never flash in and then disappear.
  const staffState: 'loading' | 'enabled' | 'disabled' =
    team.isError && isModuleUnavailable(team.error)
      ? 'disabled'
      : team.isSuccess
        ? 'enabled'
        : 'loading'
  const staffEnabled = staffState === 'enabled'

  const scopeOptions: Scope[] = staffEnabled ? ['all', 'services', 'team'] : ['all', 'services']
  const effectiveScope: Scope = scope === 'team' && !staffEnabled ? 'all' : scope

  // A new search always starts at page one. Adjusted during render rather than
  // in an effect (React's documented "reset state when an input changes"
  // pattern), so there is no extra render pass and no cascading effect.
  const searchKey = `${debouncedQuery}\u0000${effectiveScope}`
  const [lastSearchKey, setLastSearchKey] = useState(searchKey)
  if (lastSearchKey !== searchKey) {
    setLastSearchKey(searchKey)
    setPage(1)
  }

  const results = useStorefrontSearch(businessId, {
    query: debouncedQuery,
    type: effectiveScope,
    page,
    pageSize: PAGE_SIZE,
  })

  const catalogue = services.services
  const members = staffEnabled ? (team.data ?? []) : []

  const serviceNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const service of catalogue) map.set(service.id, service.name)
    return map
  }, [catalogue])

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

  const showInitialServices = effectiveScope !== 'team' && can('services')
  const showInitialTeam = effectiveScope !== 'services' && staffEnabled
  const servicesHasContent =
    showInitialServices && (services.isPending || services.isError || catalogue.length > 0)
  const teamHasContent = showInitialTeam && (team.isPending || members.length > 0)
  const showNothing = !servicesHasContent && !teamHasContent

  function book(serviceId: string) {
    startBooking({ serviceIds: [serviceId] })
  }

  return (
    <div className="sf-container py-[clamp(1.5rem,4vw,3rem)]">
      <div className="sf-head">
        <div>
          <p className="sf-eyebrow">Find</p>
          <h1 className="sf-heading">Search</h1>
          <p className="sf-lead">
            Browse what this business offers
            {staffEnabled ? ' — services, and the people who offer them' : ''}, ready to explore.
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
          {scopeOptions.map((option) => (
            <button
              key={option}
              type="button"
              className="sf-chip"
              aria-pressed={effectiveScope === option}
              onClick={() => setScope(option)}
            >
              {option === 'all' ? 'All' : option === 'services' ? 'Services' : 'Team'}
            </button>
          ))}
        </div>
      </div>

      {hasQuery && effectiveScope !== 'team' && categories.length > 0 ? (
        <div className="sf-chips mt-[0.6rem]" role="group" aria-label="Browse a category">
          {categories.slice(0, 8).map((category) => (
            <button
              key={category}
              type="button"
              className="sf-chip"
              onClick={() => setQuery(category)}
            >
              {category}
            </button>
          ))}
        </div>
      ) : null}

      <div className="mt-[1.2rem]" aria-live="polite">
        {!hasQuery ? (
          showNothing ? (
            <StorefrontEmptyState
              title="Nothing to browse yet"
              description="This business hasn’t published its services or team here yet. Please check back soon."
            />
          ) : (
            <>

              {showInitialServices ? (
                <section className="mb-[1.8rem]">
                  <div className="sf-head">
                    <p className="sf-eyebrow">Services</p>
                    {!services.isPending && !services.isError && catalogue.length > 0 ? (
                      <a href={storefrontHref(canonicalSlug, '/services')} className="link">
                        See all
                      </a>
                    ) : null}
                  </div>
                  {services.isPending ? (
                    <StorefrontSkeletonGrid variant="services" count={4} />
                  ) : services.isError ? (
                    <StorefrontErrorState
                      title="The service menu didn’t load"
                      description="Refresh the page to try again."
                      onRetry={() => void services.refetch()}
                    />
                  ) : (
                    <div className="sf-grid-services">
                      {catalogue.slice(0, 8).map((service, index) => (
                        <StorefrontServiceCard
                          key={service.id}
                          service={service}
                          index={index}
                          detailHref={storefrontHref(canonicalSlug, `/services/${service.id}`)}
                          onBook={() => book(service.id)}
                        />
                      ))}
                    </div>
                  )}
                </section>
              ) : null}

              {showInitialTeam ? (
                <section>
                  <div className="sf-head">
                    <p className="sf-eyebrow">Team</p>
                    {!team.isPending && members.length > 0 ? (
                      <a href={storefrontHref(canonicalSlug, '/team')} className="link">
                        See all
                      </a>
                    ) : null}
                  </div>
                  {team.isPending ? (
                    <StorefrontSkeletonGrid variant="team" count={4} />
                  ) : (
                    <div className="sf-board">
                      {members.slice(0, 8).map((member, index) => (
                        <StorefrontTeamCard
                          key={member.userId}
                          member={member}
                          index={index}
                          serviceNames={resolveServiceNames(member.serviceIds, serviceNameById)}
                          detailHref={storefrontHref(canonicalSlug, `/team/${member.userId}`)}
                        />
                      ))}
                    </div>
                  )}
                </section>
              ) : null}
            </>
          )
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
