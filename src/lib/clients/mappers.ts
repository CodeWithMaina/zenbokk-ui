import type { ClientSummary } from '../../components/ui/client-card'
import type { Tone } from '../../components/ui/badge'
import type { BusinessCustomer, CustomerDetailsLoyaltySummary } from '../api/types'
import { formatDate } from '../format'

/**
 * Presentation mapping for the Clients module: one place that turns API rows
 * into the shapes the shared UI kit already understands, so pages and
 * components never re-derive labels or status colours.
 */

/** Filter chips shown above the roster. */
export const CLIENT_STATUS_FILTERS = ['all', 'active', 'left', 'blocked'] as const

export type ClientStatusFilter = (typeof CLIENT_STATUS_FILTERS)[number]

const STATUS_LABELS: Record<string, string> = {
  all: 'All',
  active: 'Active',
  left: 'Left',
  blocked: 'Blocked',
}

/**
 * The roster's persisted enrollment statuses are `active | left | blocked`.
 * `left` reads as the design's grey "Inactive" state, so it maps to the theme's
 * `inactive` token; `blocked` has no token of its own and takes the danger tone.
 */
export function clientStatusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status
}

export function clientStatusDataStatus(status: string): string {
  if (status === 'active') return 'active'
  if (status === 'blocked') return 'active'
  return 'inactive'
}

export function clientStatusTone(status: string): Tone | undefined {
  return status === 'blocked' ? 'danger' : undefined
}

/** Effective stamp goal for a row: the card's own threshold, else the default. */
export function clientStampGoal(
  row: Pick<BusinessCustomer, 'stampsRequired'>,
  fallback = 8,
): number {
  return Math.max(1, row.stampsRequired ?? fallback)
}

/** Roster row → `ClientSummary` (cards, tables, selection all share this). */
export function toClientSummary(row: BusinessCustomer, fallbackGoal = 8): ClientSummary {
  const goal = clientStampGoal(row, fallbackGoal)

  return {
    id: row.userId,
    name: row.fullName,
    phone: row.phoneNumber ?? undefined,
    status: clientStatusDataStatus(row.enrollmentStatus),
    statusLabel: clientStatusLabel(row.enrollmentStatus),
    tone: clientStatusTone(row.enrollmentStatus),
    stamps: Math.min(row.totalStamps, goal),
    stampGoal: goal,
    lastVisit: row.lastStampAt ? formatDate(row.lastStampAt) : 'No visit yet',
  }
}

/** Reward copy for the loyalty card: the program's own wording, else the value. */
export function rewardLabel(loyalty: CustomerDetailsLoyaltySummary | null): string {
  if (!loyalty) return 'No reward configured'
  if (loyalty.rewardDescription.trim()) return loyalty.rewardDescription
  if (loyalty.rewardValue > 0) return `KES ${loyalty.rewardValue.toLocaleString('en-KE')}`
  return 'Reward configured on the program'
}

/** `MANUAL` → `Manual`, `APPOINTMENT` → `Appointment`. */
export function ledgerSourceLabel(source: string): string {
  if (!source) return 'Adjustment'
  const lower = source.toLowerCase()
  return lower.charAt(0).toUpperCase() + lower.slice(1)
}
