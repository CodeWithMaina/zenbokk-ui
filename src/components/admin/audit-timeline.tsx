import { ActivityTimeline } from '../ui/activity-timeline'
import type { SubscriptionAuditLogEntry } from '../../lib/api/types'
import { formatDate, formatTime } from '../../lib/format'
import { auditActionLabel, auditActionTone } from './badges'

export type AuditTimelineProps = {
  entries: readonly SubscriptionAuditLogEntry[]
  emptyLabel?: string
}

/** `2026-11-04T09:12:00Z` → `4 Nov 2026 · 09:12`. */
function stamp(iso: string): string {
  return `${formatDate(iso)} · ${formatTime(iso)}`
}

/**
 * The administrative audit feed, rendered on the shared activity timeline.
 * Each entry shows the action, who did it, why, and (when the server recorded
 * one) the before/after payload.
 */
export function AuditTimeline({ entries, emptyLabel }: AuditTimelineProps) {
  return (
    <ActivityTimeline
      emptyLabel={emptyLabel ?? 'No administrative activity recorded yet.'}
      entries={entries.map((entry) => ({
        id: entry.id,
        title: auditActionLabel(entry.action),
        tone: auditActionTone(entry.action),
        time: stamp(entry.createdAt),
        description: (
          <>
            <span className="block">
              {entry.actorName ?? (entry.actorUserId ? 'Administrator' : 'System')}
              {entry.reason ? ` — ${entry.reason}` : ''}
            </span>
            {entry.payload ? (
              <code className="mt-[0.25rem] block max-w-full overflow-x-auto rounded-sm bg-sunken px-[0.5rem] py-[0.35rem] text-[0.75rem] text-muted">
                {JSON.stringify(entry.payload)}
              </code>
            ) : null}
          </>
        ),
      }))}
    />
  )
}
