import { useMemo } from 'react'
import { ArrowRight, GitCompareArrows, Loader2 } from 'lucide-react'
import { Badge } from '../ui/badge'
import type { Tone } from '../ui/badge'
import { Button } from '../ui/button'
import { EmptyState } from '../ui/empty-state'
import { formatDateTime } from '../../lib/format'
import type { StorefrontChange, StorefrontRevision } from '../../lib/api/types'
import { useStorefrontRevisionComparison } from '../../lib/storefront-builder'

/**
 * Structured "what changed between these two versions" view.
 *
 * The server already phrased every difference as a sentence
 * (`Hero headline changed`, `Gallery section added`), so this component only
 * groups and labels them — it never renders a raw payload diff.
 */

const KIND_META: Record<StorefrontChange['kind'], { label: string; tone: Tone }> = {
  added: { label: 'Added', tone: 'success' },
  removed: { label: 'Removed', tone: 'danger' },
  modified: { label: 'Changed', tone: 'info' },
  reordered: { label: 'Reordered', tone: 'warning' },
}

export function RevisionCompareView({
  from,
  to,
  onClose,
}: {
  from: StorefrontRevision
  to: StorefrontRevision
  onClose: () => void
}) {
  const comparison = useStorefrontRevisionComparison(from.id, to.id)

  const grouped = useMemo(() => {
    const groups = new Map<string, StorefrontChange[]>()
    for (const change of comparison.data?.changes ?? []) {
      const bucket = groups.get(change.category) ?? []
      bucket.push(change)
      groups.set(change.category, bucket)
    }
    return [...groups.entries()]
  }, [comparison.data])

  return (
    <div className="grid gap-[0.8rem]">
      <div className="flex items-center justify-between gap-[0.6rem]">
        <h3 className="inline-flex items-center gap-[0.4rem] text-heading font-bold tracking-snug">
          <GitCompareArrows className="size-4" aria-hidden="true" />
          What changed
        </h3>
        <Button size="sm" variant="ghost" onClick={onClose}>
          Back to history
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-[0.5rem] rounded-md border border-line bg-hover px-[0.7rem] py-[0.6rem] text-meta">
        <span className="font-semibold">#{from.revisionNumber}</span>
        <span className="text-subtle">{formatDateTime(from.createdAt)}</span>
        <ArrowRight className="size-4 text-subtle" aria-hidden="true" />
        <span className="font-semibold">#{to.revisionNumber}</span>
        <span className="text-subtle">{formatDateTime(to.createdAt)}</span>
      </div>

      {comparison.isPending ? (
        <p className="flex items-center gap-[0.5rem] py-6 text-meta text-muted">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          Comparing versions…
        </p>
      ) : comparison.isError ? (
        <div className="rounded-md border border-danger bg-danger-soft px-[0.8rem] py-[0.7rem] text-meta text-danger-ink">
          These versions could not be compared. Close and try again.
        </div>
      ) : comparison.data?.identical ? (
        <EmptyState
          title="These versions are identical"
          description="Nothing changed between them."
          className="py-6"
        />
      ) : (
        <>
          <div className="flex flex-wrap gap-[0.4rem]">
            {(['added', 'removed', 'modified', 'reordered'] as const)
              .filter((kind) => (comparison.data?.counts[kind] ?? 0) > 0)
              .map((kind) => (
                <Badge key={kind} tone={KIND_META[kind].tone}>
                  {comparison.data?.counts[kind]} {KIND_META[kind].label.toLowerCase()}
                </Badge>
              ))}
          </div>

          <div className="grid gap-[0.9rem]">
            {grouped.map(([category, changes]) => (
              <section key={category} className="grid gap-[0.35rem]">
                <h4 className="eyebrow">{category}</h4>
                <ul className="grid gap-[0.3rem]">
                  {changes.map((change, index) => (
                    <li
                      key={`${category}-${index}-${change.label}`}
                      className="flex items-start gap-[0.5rem] rounded-md border border-line px-[0.7rem] py-[0.55rem]"
                    >
                      <Badge tone={KIND_META[change.kind].tone} className="mt-[0.1rem]">
                        {KIND_META[change.kind].label}
                      </Badge>
                      <span className="min-w-0">
                        <span className="block text-meta font-medium">{change.label}</span>
                        {change.detail ? (
                          <span className="block text-caption text-subtle">{change.detail}</span>
                        ) : null}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
