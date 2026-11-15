import { useCallback, useEffect, useState } from 'react'
import {
  APPOINTMENT_SORTS,
  APPOINTMENT_VIEWS,
  CALENDAR_MODES,
  DEFAULT_LIST_SORT,
} from './types'
import type { AppointmentSort, AppointmentView, CalendarMode } from './types'

/**
 * The appointments module's remembered view preferences.
 *
 * <para>A business owner picks how they like to see their day — calendar, table or cards,
 * the calendar's granularity, and the order — and that choice is restored the next time
 * they open the module. Search terms and date ranges are deliberately NOT remembered:
 * they describe the question being asked right now, not a preference, and restoring a
 * stale search would hide bookings.</para>
 *
 * <para><b>Where it lives.</b> These are per-browser UI preferences, not business data, so
 * they are stored in <c>localStorage</c> under a key scoped to the business. That keeps
 * them user-scoped (the browser belongs to whoever is signed in), tenant-scoped (a
 * business owner with two businesses keeps one preference each), and off the API, which
 * has no preference endpoint for a value that never affects another user. Nothing in the
 * data path depends on it: a missing or unreadable entry simply falls back to the
 * defaults.</para>
 */
export type AppointmentPreferences = {
  view: AppointmentView
  mode: CalendarMode
  sort: AppointmentSort
}

export const DEFAULT_APPOINTMENT_PREFERENCES: AppointmentPreferences = {
  view: 'calendar',
  // The calendar opens on the day: it is the view an owner checks most and the one
  // that answers "what is happening now" without a further click. Week and month are
  // one tap away and are remembered once chosen.
  mode: 'day',
  // The remembered order belongs to the list-shaped views; the calendar keeps its own
  // clock order. Default: what came in most recently, first.
  sort: DEFAULT_LIST_SORT,
}

const STORAGE_PREFIX = 'punched.appointments.preferences.v1'

/** Storage key. Scoped per business so two businesses never share one preference. */
function storageKey(businessId: string): string {
  return `${STORAGE_PREFIX}.${businessId || 'unknown'}`
}

/** Only values the UI understands are accepted; anything else falls back to the default. */
function asChoice<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback
}

/** Read the stored preferences, tolerating absent, corrupt or outdated values. */
export function readAppointmentPreferences(businessId: string): AppointmentPreferences {
  if (typeof window === 'undefined') return DEFAULT_APPOINTMENT_PREFERENCES

  try {
    const raw = window.localStorage.getItem(storageKey(businessId))
    if (!raw) return DEFAULT_APPOINTMENT_PREFERENCES
    const parsed = JSON.parse(raw) as Record<string, unknown>
    return {
      view: asChoice(parsed.view, APPOINTMENT_VIEWS, DEFAULT_APPOINTMENT_PREFERENCES.view),
      mode: asChoice(parsed.mode, CALENDAR_MODES, DEFAULT_APPOINTMENT_PREFERENCES.mode),
      sort: asChoice(parsed.sort, APPOINTMENT_SORTS, DEFAULT_APPOINTMENT_PREFERENCES.sort),
    }
  } catch {
    // A blocked or full storage must never break the module.
    return DEFAULT_APPOINTMENT_PREFERENCES
  }
}

function writeAppointmentPreferences(businessId: string, preferences: AppointmentPreferences): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(storageKey(businessId), JSON.stringify(preferences))
  } catch {
    // Ignore: the preference is a convenience, never a requirement.
  }
}

/** The persisted preferences for one business, with a partial updater. */
export function useAppointmentPreferences(businessId: string) {
  const [preferences, setPreferences] = useState<AppointmentPreferences>(() =>
    readAppointmentPreferences(businessId),
  )

  // The business is resolved by the dashboard context, so it can arrive after the first
  // render: re-read when it changes rather than showing another business's preference.
  useEffect(() => {
    setPreferences(readAppointmentPreferences(businessId))
  }, [businessId])

  useEffect(() => {
    writeAppointmentPreferences(businessId, preferences)
  }, [businessId, preferences])

  const update = useCallback((patch: Partial<AppointmentPreferences>) => {
    setPreferences((current) => ({ ...current, ...patch }))
  }, [])

  return { preferences, update }
}
