import type { Tone } from '../../components/ui/badge'
import { formatNumber, money } from '../format'
import type { LoyaltyProgram, ProgramStatus, ProgramStatusFilter, ProgramType } from './types'

/**
 * Presentation mapping for the Loyalty Programs module: one place that turns
 * API rows into the labels, tones and summaries the shared UI kit understands,
 * so pages and components never re-derive them.
 */

/** Filter tabs, in the order the design offers them. */
export const PROGRAM_STATUS_FILTERS = ['all', 'active', 'paused', 'draft'] as const

const STATUS_FILTER_LABELS: Record<ProgramStatusFilter, string> = {
  all: 'All',
  active: 'Active',
  paused: 'Paused',
  draft: 'Draft',
}

export function programStatusFilterLabel(filter: ProgramStatusFilter): string {
  return STATUS_FILTER_LABELS[filter]
}

const STATUSES: readonly ProgramStatus[] = ['draft', 'active', 'paused', 'archived']

/** Coerce the API's `status` string into the module's union (defaults active). */
export function normalizeProgramStatus(status: string | null | undefined): ProgramStatus {
  const value = (status ?? '').toLowerCase()
  return (STATUSES as readonly string[]).includes(value) ? (value as ProgramStatus) : 'active'
}

const STATUS_LABELS: Record<ProgramStatus, string> = {
  draft: 'Draft',
  active: 'Active',
  paused: 'Paused',
  archived: 'Archived',
}

export function programStatusLabel(status: string | null | undefined): string {
  return STATUS_LABELS[normalizeProgramStatus(status)]
}

/** A `[data-status]` token the theme already colours (see `index.css`). */
export function programStatusDataStatus(status: string | null | undefined): string {
  return normalizeProgramStatus(status)
}

/** Only archived reads as a non-standard tone; the rest use the status tokens. */
export function programStatusTone(_status: string | null | undefined): Tone | undefined {
  return undefined
}

/** One-line explanation of what a status means for the program. */
export function programStatusHint(status: string | null | undefined): string {
  switch (normalizeProgramStatus(status)) {
    case 'draft':
      return 'Not launched yet — customers cannot join.'
    case 'paused':
      return 'Stamping is paused; existing progress is kept.'
    case 'archived':
      return 'Archived — hidden from customers.'
    default:
      return 'Customers can earn stamps.'
  }
}

/** The earning models the backend accepts, with the copy the design uses. */
export const PROGRAM_TYPE_OPTIONS: readonly {
  value: ProgramType
  label: string
  description: string
}[] = [
  { value: 'visit', label: 'Visit based', description: 'Reward repeat visits' },
  { value: 'stamp', label: 'Stamp card', description: 'The classic punch card' },
  { value: 'service', label: 'Service based', description: 'Reward specific services' },
  { value: 'purchase', label: 'Purchase based', description: 'Reward what customers spend' },
]

export function programTypeLabel(type: string | null | undefined): string {
  const match = PROGRAM_TYPE_OPTIONS.find((option) => option.value === type)
  if (match) return match.label
  if (!type) return 'Stamp card'
  return type.charAt(0).toUpperCase() + type.slice(1)
}

/** `48` → `2 days`, `24` → `1 day`, `36` → `36 hrs`, `0` → `no expiry`. */
export function rewardValidityLabel(hours: number): string {
  const value = Math.max(0, Math.round(hours))
  if (value === 0) return 'no expiry'
  if (value % 24 === 0) {
    const days = value / 24
    return `${days} ${days === 1 ? 'day' : 'days'}`
  }
  return `${value} hrs`
}

/** Reward copy: the program's own wording, else the configured value. */
export function rewardSummary(program: Pick<LoyaltyProgram, 'rewardDescription' | 'rewardValue'>): string {
  if (program.rewardDescription.trim()) return program.rewardDescription
  if (program.rewardValue > 0) return `${money(program.rewardValue)} reward`
  return 'Reward not set'
}

/** `5 stamps · valid 2 days` — the sub-line under a program card. */
export function programSubtitle(
  program: Pick<LoyaltyProgram, 'stampsRequired' | 'rewardExpirationHours'>,
): string {
  return `${formatNumber(program.stampsRequired)} stamps · valid ${rewardValidityLabel(program.rewardExpirationHours)}`
}

/** Programs whose schedule window has not opened yet / has closed. */
export function programScheduleNote(
  program: Pick<LoyaltyProgram, 'startsAt' | 'endsAt'>,
): string | null {
  const now = Date.now()
  const start = program.startsAt ? new Date(program.startsAt).getTime() : null
  const end = program.endsAt ? new Date(program.endsAt).getTime() : null

  if (start && now < start) {
    return `Starts in ${Math.max(1, Math.ceil((start - now) / 86_400_000))} days`
  }
  if (end && now > end) return 'Ended'
  if (end) return `Ends in ${Math.max(1, Math.ceil((end - now) / 86_400_000))} days`
  return null
}

/** Empty creation form state. */
export function emptyProgramDraft(): import('./types').LoyaltyProgramDraft {
  return {
    name: '',
    description: '',
    programType: 'stamp',
    startDate: '',
    endDate: '',
    stampsRequired: 8,
    defaultEnrollmentStamps: 1,
    rewardDescription: '',
    rewardValue: 500,
    cardDesignId: null,
  }
}
