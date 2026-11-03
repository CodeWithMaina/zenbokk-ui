import { useCallback, useMemo, useSyncExternalStore } from 'react'
import { readBookingDraft, writeBookingDraft } from './booking-draft'
import type { BookingDraft } from './booking-draft'

/**
 * The storefront's in-progress booking ("your lineup").
 *
 * The draft already lives in `sessionStorage` (see `booking-draft.ts`) so it can
 * survive a sign-in round trip. This hook is only the *reactivity* layer over
 * it: the header badge, the bottom tray and the wizard all read the same value,
 * and any of them can change it. Without a subscription the badge would show a
 * count from the last render and quietly disagree with the wizard.
 *
 * `useSyncExternalStore` is the right primitive here rather than a context: the
 * source of truth is outside React, several sibling surfaces (header, tray,
 * wizard) need it, and a plain event keeps them in step without a provider
 * having to wrap the whole storefront.
 */

type Listener = () => void

const listeners = new Set<Listener>()

/** Bumped on every write; the snapshot is keyed on it so identity changes. */
let revision = 0
const cache = new Map<string, { revision: number; value: BookingDraft }>()

function emit() {
  revision += 1
  for (const listener of listeners) listener()
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/**
 * A stable snapshot per business id.
 *
 * `getSnapshot` must return the *same object* until the draft actually changes,
 * or React re-renders forever. Caching on the revision number gives that
 * without pretending `sessionStorage` is cheap to parse on every render.
 */
function snapshot(businessId: string): BookingDraft {
  const cached = cache.get(businessId)
  if (cached && cached.revision === revision) return cached.value

  const value = readBookingDraft(businessId)
  cache.set(businessId, { revision, value })
  return value
}

/** Server render has no `sessionStorage`; the empty draft is the honest answer. */
const emptySnapshot: BookingDraft = {
  serviceIds: [],
  staffId: null,
  startsAt: null,
  notes: '',
  step: 'services',
}

function serverSnapshot(): BookingDraft {
  return emptySnapshot
}

export type BookingTray = {
  draft: BookingDraft
  /** How many services are in the lineup. */
  count: number
  hasSelection: boolean
  setServiceIds: (ids: string[]) => void
  toggleService: (serviceId: string) => void
  setStaffId: (staffId: string | null) => void
  setStartsAt: (startsAt: string | null) => void
  setNotes: (notes: string) => void
  setStep: (step: BookingDraft['step']) => void
  clear: () => void
}

/**
 * Read and mutate the booking draft for one business.
 *
 * Every mutation writes through to `sessionStorage` *and* notifies, so the tray
 * and the wizard can never drift. The draft is scoped per business, so browsing
 * two storefronts in two tabs keeps two independent lineups.
 */
export function useBookingTray(businessId: string): BookingTray {
  const draft = useSyncExternalStore(
    subscribe,
    () => snapshot(businessId),
    serverSnapshot,
  )

  const commit = useCallback(
    (next: BookingDraft) => {
      writeBookingDraft(businessId, next)
      emit()
    },
    [businessId],
  )

  const update = useCallback(
    (changes: Partial<BookingDraft>) => {
      commit({ ...snapshot(businessId), ...changes })
    },
    [businessId, commit],
  )

  const toggleService = useCallback(
    (serviceId: string) => {
      const current = snapshot(businessId)
      const selected = current.serviceIds.includes(serviceId)
      update({
        serviceIds: selected
          ? current.serviceIds.filter((id) => id !== serviceId)
          : [...current.serviceIds, serviceId],
      })
    },
    [businessId, update],
  )

  return useMemo(
    () => ({
      draft,
      count: draft.serviceIds.length,
      hasSelection: draft.serviceIds.length > 0,
      setServiceIds: (ids: string[]) => update({ serviceIds: ids }),
      toggleService,
      setStaffId: (staffId: string | null) => update({ staffId }),
      setStartsAt: (startsAt: string | null) => update({ startsAt }),
      setNotes: (notes: string) => update({ notes }),
      setStep: (step: BookingDraft['step']) => update({ step }),
      clear: () =>
        commit({ serviceIds: [], staffId: null, startsAt: null, notes: '', step: 'services' }),
    }),
    // `update`, `commit` and `toggleService` already close over the business id,
    // so the draft itself is the only thing that decides a new value here.
    [commit, draft, toggleService, update],
  )
}
