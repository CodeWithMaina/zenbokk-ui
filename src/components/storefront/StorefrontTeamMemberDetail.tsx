import { ArrowLeft, ArrowRight, CalendarPlus, Phone } from 'lucide-react'
import { formatDuration, getInitials, money } from '../../lib/format'
import { isModuleUnavailable } from '../../lib/api/client'
import { useStorefront } from '../../lib/storefront'
import { resolveServiceNames } from '../../lib/storefront/search'
import {
  useStorefrontServices,
  useStorefrontTeam,
} from '../../lib/storefront/use-storefront-catalog'
import { storefrontHref } from '../../lib/tenant'
import { ResponsiveImage } from '../ui/responsive-image'
import { StorefrontTeamCard } from './StorefrontTeamCard'
import {
  StorefrontEmptyState,
  StorefrontErrorState,
  StorefrontSkeletonGrid,
} from './StorefrontStates'

export type StorefrontTeamMemberDetailProps = {
  staffUserId: string
  /** Opens the wizard with this member chosen. */
  onBookWith: (staffUserId: string) => void
  /** Adds or removes a service from the lineup. */
  onToggleService: (serviceId: string) => void
  isInLineup: (serviceId: string) => boolean
}

/** `0` → "New to the trade"; `1` → "1 year"; `n` → "n years". */
function experienceLabel(years: number): string {
  if (years <= 0) return 'New to the trade'
  return years === 1 ? '1 year' : `${years} years`
}

/**
 * One member of the roster.
 *
 * Everything on this page is data the business has published about them: their
 * name, the title it assigned them, the portrait it uploaded, the contact number
 * it chose to share, the services it assigned them, and — when it has written
 * them — their biography, specialities and stated years of experience.
 *
 * A section with nothing behind it is omitted rather than filled in. The
 * business owns this text, so the platform shows exactly what was written and
 * never drafts a paragraph or a number on its behalf.
 *
 * Their services come from the same public eligibility endpoint the booking
 * wizard uses, so the two can never disagree about who can do what.
 */
export function StorefrontTeamMemberDetail({
  staffUserId,
  onBookWith,
  onToggleService,
  isInLineup,
}: StorefrontTeamMemberDetailProps) {
  const { businessId, canonicalSlug, can } = useStorefront()

  const team = useStorefrontTeam(businessId)
  const services = useStorefrontServices(businessId, can('services'))

  const member = (team.data ?? []).find((entry) => entry.userId === staffUserId) ?? null
  const others = (team.data ?? []).filter((entry) => entry.userId !== staffUserId)

  const offered = member
    ? services.services.filter((service) => member.serviceIds.includes(service.id))
    : []

  const firstName = member ? member.fullName.split(' ')[0] : ''

  // Specialities are free text the business wrote, split on commas. Blank
  // entries are dropped, so a stray comma can never render an empty chip.
  const specialities = (member?.specialities ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0)

  // The roster is withdrawn (the platform or the business switched the staff
  // module off), so this profile is simply not published — not broken.
  if (team.isError && isModuleUnavailable(team.error)) {
    return (
      <div className="sf-container py-[clamp(2rem,5vw,3.5rem)]">
        <StorefrontEmptyState
          title="We can’t find that person"
          description="They may no longer be listed on this business’s page."
          action={
            <a href={storefrontHref(canonicalSlug, '/team')} className="btn btn-ghost no-underline">
              Back to the team
            </a>
          }
        />
      </div>
    )
  }

  if (team.isError) {
    return (
      <div className="sf-container py-[clamp(2rem,5vw,3.5rem)]">
        <StorefrontErrorState
          title="We couldn’t open that profile"
          description="Refresh the page to try again."
          onRetry={() => void team.refetch()}
        />
      </div>
    )
  }

  if (team.isPending) {
    return (
      <div className="sf-container py-[clamp(2rem,5vw,3.5rem)]">
        <StorefrontSkeletonGrid variant="team" count={2} />
      </div>
    )
  }

  if (!member) {
    return (
      <div className="sf-container py-[clamp(2rem,5vw,3.5rem)]">
        <StorefrontEmptyState
          title="We can’t find that person"
          description="They may no longer be listed on this business’s page."
          action={
            <a
              href={storefrontHref(canonicalSlug, '/team')}
              className="btn btn-ghost no-underline"
            >
              See the whole team
            </a>
          }
        />
      </div>
    )
  }

  return (
    <div className="sf-container py-[clamp(1.5rem,4vw,3rem)]">
      <a href={storefrontHref(canonicalSlug, '/team')} className="sf-back">
        <ArrowLeft className="size-[1rem]" aria-hidden="true" />
        The whole team
      </a>

      <div className="sf-detail">
        <div className="sf-frame sf-rise" style={{ aspectRatio: '4 / 5' }}>
          {member.avatarUrl ? (
            <ResponsiveImage
              src={member.avatarUrl}
              alt={member.fullName}
              sizes="(min-width: 45rem) 42vw, 100vw"
              loading="eager"
              className="size-full object-cover"
            />
          ) : (
            <span
              aria-hidden="true"
              className="grid size-full place-items-center bg-[linear-gradient(150deg,var(--surface-sunken),var(--hover))]"
            >
              <span className="sf-heading text-[clamp(4rem,16vw,9rem)] text-subtle">
                {getInitials(member.fullName)}
              </span>
            </span>
          )}
        </div>

        <div className="sf-rise" style={{ '--sf-i': 2 } as React.CSSProperties}>
          <p className="sf-eyebrow">{member.positionName ?? 'Specialist'}</p>
          <h1 className="sf-heading">{member.fullName}</h1>

          <dl className="sf-facts">
            <div>
              <dt>Title</dt>
              <dd>{member.positionName ?? '—'}</dd>
            </div>
            <div>
              <dt>Services</dt>
              <dd>{offered.length > 0 ? offered.length : '—'}</dd>
            </div>
            {/* Experience is shown only when the business stated it: a dash here
                would suggest a value exists but is unknown. */}
            {member.yearsOfExperience !== null ? (
              <div>
                <dt>Experience</dt>
                <dd>{experienceLabel(member.yearsOfExperience)}</dd>
              </div>
            ) : null}
            <div>
              <dt>Contact</dt>
              <dd>{member.phoneNumber ?? 'Via the studio'}</dd>
            </div>
          </dl>

          {member.bio ? (
            <div className="mb-[1.4rem]">
              <p className="sf-eyebrow">About {firstName}</p>
              <p className="mt-[0.3rem] text-meta text-muted">{member.bio}</p>
            </div>
          ) : null}

          {specialities.length > 0 ? (
            <div className="mb-[1.4rem]">
              <p className="sf-eyebrow">Specialities</p>
              <ul className="mt-[0.4rem] flex list-none flex-wrap gap-[0.4rem] p-0">
                {specialities.map((speciality) => (
                  <li key={speciality} className="sf-chip">
                    {speciality}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {can('appointments') ? (
            <div className="mb-[1.4rem] flex flex-wrap gap-[0.6rem]">
              <button
                type="button"
                className="btn btn-primary btn-xl"
                onClick={() => onBookWith(member.userId)}
              >
                <CalendarPlus className="size-[0.95rem]" aria-hidden="true" />
                Book with {firstName}
              </button>
              {member.phoneNumber ? (
                <a href={`tel:${member.phoneNumber}`} className="btn btn-ghost btn-xl no-underline">
                  <Phone className="size-[0.95rem]" aria-hidden="true" />
                  Call
                </a>
              ) : null}
            </div>
          ) : null}

          <p className="sf-eyebrow">Services with {firstName}</p>

          {offered.length === 0 ? (
            <p className="text-meta text-muted">
              The business has not assigned any published services to {member.fullName} yet.
            </p>
          ) : (
            <ul className="m-0 list-none p-0">
              {offered.map((service) => (
                <li
                  key={service.id}
                  className="flex items-center gap-[0.85rem] border-t border-line py-[0.7rem]"
                >
                  <span className="min-w-0 flex-1">
                    <a
                      href={storefrontHref(canonicalSlug, `/services/${service.id}`)}
                      className="no-underline"
                    >
                      <b className="font-semibold">{service.name}</b>
                    </a>
                    <span className="block text-meta text-muted">
                      {formatDuration(service.durationMinutes)} · {money(service.price)}
                    </span>
                  </span>
                  {can('appointments') ? (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      aria-pressed={isInLineup(service.id)}
                      onClick={() => onToggleService(service.id)}
                    >
                      {isInLineup(service.id) ? 'Added' : 'Add'}
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {others.length > 0 ? (
        <section className="sf-band">
          <div className="sf-head">
            <h2 className="sf-heading">Meet the rest</h2>
            <a href={storefrontHref(canonicalSlug, '/team')} className="link no-underline">
              See everyone
              <ArrowRight className="ml-[0.3rem] inline size-[0.85rem]" aria-hidden="true" />
            </a>
          </div>
          <div className="sf-board">
            {others.map((entry, index) => (
              <StorefrontTeamCard
                key={entry.userId}
                member={entry}
                index={index}
                serviceNames={resolveServiceNames(
                  entry.serviceIds,
                  new Map(services.services.map((service) => [service.id, service.name])),
                )}
                detailHref={storefrontHref(canonicalSlug, `/team/${entry.userId}`)}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}
