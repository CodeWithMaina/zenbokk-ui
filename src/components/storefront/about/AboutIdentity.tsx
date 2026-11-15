import { MapPin } from 'lucide-react'

/**
 * The About page's location pill — the only identity detail the page keeps.
 *
 * The business name, category and monogram were removed by request, so this is
 * just the location chip (set to the end of its row) and nothing at all when the
 * business has not published a location.
 */
export function AboutIdentity({ location }: { location: string | null }) {
  if (!location) return null

  return (
    <div className="ab-identity">
      <span className="ab-location">
        <MapPin className="ab-location-icon" aria-hidden="true" />
        {location}
      </span>
    </div>
  )
}
