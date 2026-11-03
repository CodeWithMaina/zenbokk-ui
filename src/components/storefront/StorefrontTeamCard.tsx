import { getInitials } from '../../lib/format'
import type { EligibleStaff } from '../../lib/api/types'
import { ResponsiveImage } from '../ui/responsive-image'

export type StorefrontTeamCardProps = {
  member: EligibleStaff
  /** Names of the services this member performs, already resolved. */
  serviceNames: string[]
  detailHref: string
  index?: number
}

/**
 * One member of the roster.
 *
 * The design's tile is a monogram that lifts on hover to reveal the detail
 * panel. The portrait is used when the business has uploaded one (the API
 * returns an avatar URL), and the monogram is the honest fallback — it is drawn
 * from the person's real initials, not a placeholder image.
 *
 * The overlay is hover/focus only. On a coarse pointer there is no hover, so the
 * CSS hides it and the tile carries name + title inline; the detail page holds
 * the rest.
 */
export function StorefrontTeamCard({
  member,
  serviceNames,
  detailHref,
  index = 0,
}: StorefrontTeamCardProps) {
  return (
    <a
      href={detailHref}
      className="sf-tile sf-rise"
      style={{ '--sf-i': index } as React.CSSProperties}
      aria-label={
        member.positionName ? `${member.fullName}, ${member.positionName}` : member.fullName
      }
    >
      {member.avatarUrl ? (
        <ResponsiveImage
          src={member.avatarUrl}
          alt=""
          sizes="(min-width: 56rem) 18rem, 50vw"
          loading="lazy"
          className="sf-tile-photo"
        />
      ) : (
        <span className="sf-tile-mono" aria-hidden="true">
          {getInitials(member.fullName)}
        </span>
      )}

      <span className="sf-tile-name">
        <b>{member.fullName}</b>
        <span>{member.positionName ?? 'Specialist'}</span>
      </span>

      <span className="sf-tile-over">
        <b>{member.fullName}</b>
        {serviceNames.length > 0 ? (
          <span className="sf-tile-tags">
            {serviceNames.slice(0, 4).map((name) => (
              <em key={name}>{name}</em>
            ))}
          </span>
        ) : null}
        <small>
          {[
            serviceNames.length > 0
              ? `Offers ${serviceNames.length} service${serviceNames.length === 1 ? '' : 's'}`
              : 'Ask the studio what they offer',
            // Experience appears only when the business stated it, and only when
            // it is a real number — "0 years" would read as a mistake.
            member.yearsOfExperience !== null && member.yearsOfExperience > 0
              ? `${member.yearsOfExperience} year${member.yearsOfExperience === 1 ? '' : 's'} of experience`
              : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </small>
      </span>
    </a>
  )
}
