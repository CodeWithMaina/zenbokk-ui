import { Clock } from 'lucide-react'
import type { AvailabilitySlot } from '../../../lib/api/types'
import {
  dayExtent,
  emptyDayReason,
  hourBands,
  slotAvailability,
  slotAvailabilityLabel,
} from '../../../lib/booking/slots'
import { cn } from '../../../lib/cn'

export type SlotPickerProps = {
  /** Every starting time the server emitted for the day, including blocked ones. */
  slots: readonly AvailabilitySlot[]
  /** The chosen starting time (UTC), so the control can show its own state. */
  selectedStartUtc: string | null
  onSelect: (slot: AvailabilitySlot) => void
  /** The whole requested duration, used to explain an empty day. */
  totalMinutes: number
  /** Shown beside the opening window so the business timezone is explicit. */
  timeZoneId?: string | null
  /** True while fresh availability is being fetched. */
  busy?: boolean
}

/**
 * The one-hour time picker.
 *
 * Each row is an hour of the business's day (`09:00–10:00`) and the buttons inside it
 * are the starting times the server actually offers. A starting time is only offered
 * when the WHOLE requested booking fits from it, so a three-hour appointment never
 * appears at 09:00 just because the first hour is free — the server decided that, and
 * this component never second-guesses it.
 *
 * Unavailable starting times stay visible (disabled, labelled "Booked" or
 * "Unavailable") because a customer reading the day is better served by knowing the
 * 10:00 is taken than by an hourly row that silently disappears.
 */
export function SlotPicker({
  slots,
  selectedStartUtc,
  onSelect,
  totalMinutes,
  timeZoneId,
  busy = false,
}: SlotPickerProps) {
  const bands = hourBands(slots)
  const extent = dayExtent(slots)
  const availableCount = slots.filter((slot) => slotAvailability(slot) === 'available').length

  if (bands.length === 0) {
    return (
      <p className="mt-[1rem] text-center text-meta text-muted" aria-live="polite">
        {emptyDayReason(slots, totalMinutes)}
      </p>
    )
  }

  return (
    <div className={cn('mt-[0.8rem]', busy && 'is-busy')} aria-busy={busy || undefined}>
      <div className="sf-bands-head">
        <p className="text-caption text-subtle">
          {extent ? `Open ${extent.first}–${extent.last}` : null}
          {extent && timeZoneId ? ` · ${timeZoneId.replace(/_/g, ' ')}` : null}
        </p>
        <p className="text-caption text-subtle tabular" aria-live="polite">
          {availableCount > 0
            ? `${availableCount} start${availableCount === 1 ? '' : 's'} for ${formatDurationLabel(totalMinutes)}`
            : emptyDayReason(slots, totalMinutes)}
        </p>
      </div>

      <ul className="sf-bands" role="list">
        {bands.map((band) => (
          <li key={band.hour} className={cn('sf-band', !band.hasAvailable && 'is-full')}>
            <span className="sf-band-hour" aria-hidden="true">
              <Clock className="size-3.5" />
              <b className="tabular">{band.label}</b>
            </span>

            <div className="sf-band-slots" role="group" aria-label={`Starting times in ${band.label}`}>
              {band.slots.map((slot) => {
                const availability = slotAvailability(slot)
                const isSelected = selectedStartUtc === slot.startAtUtc
                const disabled = availability !== 'available'

                return (
                  <button
                    key={`${slot.startAtUtc}-${slot.staffUserId ?? 'any'}`}
                    type="button"
                    className={cn('sf-slot', `is-${availability}`)}
                    aria-pressed={isSelected}
                    disabled={disabled}
                    title={
                      disabled
                        ? `${slot.localTime} — ${slotAvailabilityLabel(availability)}`
                        : `${slot.localTime} — ${formatDurationLabel(totalMinutes)} from here`
                    }
                    onClick={() => onSelect(slot)}
                  >
                    <span className="sf-slot-time tabular">{slot.localTime}</span>
                    {disabled ? (
                      <span className="sf-slot-state">{slotAvailabilityLabel(availability)}</span>
                    ) : null}
                  </button>
                )
              })}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** `180` → `3 hr`, shared with the summary so the wording matches. */
function formatDurationLabel(minutes: number): string {
  if (minutes <= 0) return 'this booking'
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours === 0) return `${rest} min`
  if (rest === 0) return `${hours} hr`
  return `${hours} hr ${rest} min`
}
