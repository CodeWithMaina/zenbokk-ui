import type { ReactNode } from 'react'
import { Badge, StatusPill } from '../ui/badge'
import type { Tone } from '../ui/badge'

/**
 * Platform-administration status vocabulary.
 *
 * One place maps each backend status string to a label and a semantic tone, so
 * a list, a detail page and a filter can never disagree about what "paused"
 * looks like. Tones come from the shared token set — no colour literals.
 */

const BUSINESS_STATUS: Record<string, { label: string; tone: Tone }> = {
  active: { label: 'Active', tone: 'success' },
  suspended: { label: 'Suspended', tone: 'warning' },
  deactivated: { label: 'Deactivated', tone: 'danger' },
}

const SUBSCRIPTION_STATUS: Record<string, { label: string; tone: Tone }> = {
  active: { label: 'Active', tone: 'success' },
  trial: { label: 'Trial', tone: 'info' },
  past_due: { label: 'Past due', tone: 'warning' },
  paused: { label: 'Paused', tone: 'warning' },
  canceled: { label: 'Cancelled', tone: 'neutral' },
  expired: { label: 'Expired', tone: 'danger' },
  deactivated: { label: 'Deactivated', tone: 'danger' },
}

const PLAN_LIFECYCLE: Record<string, { label: string; tone: Tone }> = {
  Active: { label: 'Active', tone: 'success' },
  Draft: { label: 'Draft', tone: 'neutral' },
  Inactive: { label: 'Inactive', tone: 'warning' },
  Archived: { label: 'Archived', tone: 'neutral' },
}

const MEMBER_STATUS: Record<string, Tone> = {
  Active: 'success',
  Invited: 'info',
  Suspended: 'warning',
  Left: 'neutral',
}

/** Business platform status (`active` | `suspended` | `deactivated`). */
export function BusinessStatusPill({ status, className }: { status: string; className?: string }) {
  const entry = BUSINESS_STATUS[status] ?? { label: status, tone: 'neutral' as Tone }
  return (
    <StatusPill tone={entry.tone} className={className}>
      {entry.label}
    </StatusPill>
  )
}

/** Subscription lifecycle status. */
export function SubscriptionStatusPill({
  status,
  className,
}: {
  status: string | null
  className?: string
}) {
  if (!status) return <Badge tone="neutral" className={className}>No subscription</Badge>
  const entry = SUBSCRIPTION_STATUS[status] ?? { label: status, tone: 'neutral' as Tone }
  return (
    <StatusPill tone={entry.tone} className={className}>
      {entry.label}
    </StatusPill>
  )
}

/** Subscription-plan lifecycle state. */
export function PlanLifecyclePill({ lifecycle, className }: { lifecycle: string; className?: string }) {
  const entry = PLAN_LIFECYCLE[lifecycle] ?? { label: lifecycle, tone: 'neutral' as Tone }
  return (
    <StatusPill tone={entry.tone} className={className}>
      {entry.label}
    </StatusPill>
  )
}

/** Membership status of a business member. */
export function MemberStatusPill({ status, className }: { status: string; className?: string }) {
  return (
    <StatusPill tone={MEMBER_STATUS[status] ?? 'neutral'} className={className}>
      {status}
    </StatusPill>
  )
}

/** Where a module's effective entitlement came from. */
export function ModuleSourceBadge({ source }: { source: string }) {
  const normalized = source.toUpperCase()
  if (normalized === 'ADMIN') return <Badge tone="warning">Admin override</Badge>
  if (normalized === 'OVERRIDE') return <Badge tone="info">Owner override</Badge>
  return <Badge tone="neutral">Plan</Badge>
}

/** Human-readable label for an audit action code (`BUSINESS_SUSPENDED` → `Business suspended`). */
export function auditActionLabel(action: string): string {
  const words = action.replace(/_/g, ' ').toLowerCase().trim()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

/** Tone for an audit action, so destructive events read as such. */
export function auditActionTone(action: string): Tone {
  const upper = action.toUpperCase()
  if (/(DEACTIVAT|SUSPEND|CANCEL|ARCHIV|REMOV|DELET|DISABL)/.test(upper)) return 'danger'
  if (/(PAUS|EXPIRE|PAST_DUE|DEGRAD)/.test(upper)) return 'warning'
  if (/(CREATED|PUBLISH|ENABL|REACTIVAT|RENEW|RESUM|EXTEND|UPDATED)/.test(upper)) return 'success'
  return 'info'
}

/** Compact label used in a table cell. */
export function InlineLabel({ children }: { children: ReactNode }) {
  return <span className="text-caption text-muted">{children}</span>
}
