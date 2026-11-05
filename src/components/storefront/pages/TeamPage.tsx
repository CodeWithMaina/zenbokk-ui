import { useMemo, useState } from 'react'
import { storefrontHref } from '../../../lib/tenant'
import { isModuleUnavailable } from '../../../lib/api/client'
import { useStorefront } from '../../../lib/storefront'
import { matchesQuery, resolveServiceNames, serviceCategories } from '../../../lib/storefront/search'
import { useStartBooking } from '../../../lib/storefront/use-start-booking'
import {
  useStorefrontServices,
  useStorefrontTeam,
} from '../../../lib/storefront/use-storefront-catalog'
import { StorefrontFilters } from '../StorefrontFilters'
import { StorefrontPage } from '../StorefrontPage'
import { StorefrontTeamCard } from '../StorefrontTeamCard'
import {
  StorefrontEmptyState,
  StorefrontErrorState,
  StorefrontSkeletonGrid,
} from '../StorefrontStates'

/**
 * The roster.
 *
 * Takes no props: it reads the tenant from context and does its own navigation,
 * so both address shapes render this one component unchanged.
 *
 * What a customer may see of a staff member is decided by the backend, not here:
 * `GET /v1/services/{businessId}/staff` returns only members the business has
 * marked public *and* bookable, and it carries no internal metrics. This page
 * adds nothing to that set — it only groups and labels what arrives.
 *
 * The filter chips are the members' job titles, which are the only grouping the
 * business has actually declared. A business that has set no titles gets no
 * chips rather than invented ones.
 */
export function TeamPage() {
  const { businessId, canonicalSlug, can } = useStorefront()
  const [query, setQuery] = useState('')
  const [role, setRole] = useState<string | null>(null)
  const startBooking = useStartBooking()

  // The roster has no entry in the owner's landing-page configuration (the
  // section vocabulary is services/loyalty/booking/reviews/gallery/about/
  // contact/businessinfo), so its heading is the platform's, not an override.
  const team = useStorefrontTeam(businessId)
  const services = useStorefrontServices(businessId, can('services'))

  const serviceNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const service of services.services) map.set(service.id, service.name)
    return map
  }, [services.services])

  const members = useMemo(() => team.data ?? [], [team.data])

  const roles = useMemo(
    () => serviceCategories(members.map((member) => member.positionName)),
    [members],
  )

  const visible = useMemo(
    () =>
      members.filter((member) => {
        if (role && member.positionName !== role) return false
        return matchesQuery(
          query,
          member.fullName,
          member.positionName,
          ...resolveServiceNames(member.serviceIds, serviceNameById),
        )
      }),
    [members, role, query, serviceNameById],
  )

  // A withdrawn module is a decision, not a fault: the platform (or the
  // business) has switched the roster off, so say what is missing rather than
  // offering a retry that can only fail the same way.
  if (team.isError && isModuleUnavailable(team.error)) {
    return (
      <StorefrontPage eyebrow="Who we are" title="The team">
        <StorefrontEmptyState
          title="The team isn’t listed"
          description="This business doesn’t publish its team here. Call the studio and they’ll tell you who is in."
        />
      </StorefrontPage>
    )
  }

  if (team.isError) {
    return (
      <StorefrontPage eyebrow="Who we are" title="The team">
        <StorefrontErrorState
          title="The team didn’t load"
          description="Refresh the page to try again."
          onRetry={() => void team.refetch()}
        />
      </StorefrontPage>
    )
  }

  return (
    <StorefrontPage
      eyebrow="Who we are"
      title="The team"
      description="Choose your specialist, or let the studio pick the first person free."
    >
      {team.isPending ? (
        <StorefrontSkeletonGrid variant="team" count={4} />
      ) : members.length === 0 ? (
        <StorefrontEmptyState
          title="No one listed yet"
          description="This business keeps its team off the page. Call the studio and they’ll tell you who is in."
        />
      ) : (
        <>
          <StorefrontFilters
            placeholder="Search the team"
            search={query}
            onSearchChange={setQuery}
            options={roles}
            active={role}
            onActiveChange={setRole}
            label="Job titles"
          />

          {visible.length === 0 ? (
            <StorefrontEmptyState
              title="No one matches that"
              description="Try a different name or speciality."
              action={
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    setQuery('')
                    setRole(null)
                  }}
                >
                  Clear search and filters
                </button>
              }
            />
          ) : (
            <div className="sf-board">
              {visible.map((member, index) => (
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
        </>
      )}

      {members.length > 0 && can('appointments') ? (
        <div className="mt-[1.4rem]">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => startBooking({ staffId: members[0].userId })}
          >
            Book with {members[0].fullName.split(' ')[0]}
          </button>
        </div>
      ) : null}
    </StorefrontPage>
  )
}
