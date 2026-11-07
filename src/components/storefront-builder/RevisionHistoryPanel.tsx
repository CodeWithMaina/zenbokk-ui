import { useMemo, useState } from 'react'
import { Eye, GitCompareArrows, History, Undo2 } from 'lucide-react'
import { Badge } from '../ui/badge'
import type { Tone } from '../ui/badge'
import { Button } from '../ui/button'
import { Drawer } from '../ui/drawer'
import { EmptyState } from '../ui/empty-state'
import { Skeleton } from '../ui/skeleton'
import { cn } from '../../lib/cn'
import { formatDateTime } from '../../lib/format'
import type { StorefrontRevision, StorefrontRevisionType } from '../../lib/api/types'
import { useStorefrontRevisions } from '../../lib/storefront-builder'
import { revisionPeriod } from '../../lib/storefront-builder/revisions'
import { RevisionCompareView } from './RevisionCompareView'
import { RevisionRestoreDialog } from './RevisionRestoreDialog'

/**
 * The builder's version history.
 *
 * Everything on show comes from the server: the panel never invents an entry, and
 * an action is only offered when the API implements it (preview, compare,
 * restore). Selecting "Compare" on one version and then another opens the
 * structured comparison in place of the timeline.
 */

const TYPE_META: Record<StorefrontRevisionType, { label: string; tone: Tone; hint: string }> = {
  draftSave: { label: 'Draft saved', tone: 'neutral', hint: 'A working change' },
  publish: { label: 'Published', tone: 'success', hint: 'Went live' },
  rollback: { label: 'Rolled back', tone: 'info', hint: 'An earlier version restored' },
  reset: { label: 'Reset', tone: 'warning', hint: 'Draft reset to the published version' },
}

const FILTERS: { value: 'all' | StorefrontRevisionType; label: string }[] = [
  { value: 'all', label: 'Everything' },
  { value: 'publish', label: 'Published' },
  { value: 'draftSave', label: 'Drafts' },
  { value: 'rollback', label: 'Rollbacks' },
  { value: 'reset', label: 'Resets' },
]

const PAGE_SIZE = 20

export type RevisionHistoryPanelProps = {
  open: boolean
  onClose: () => void
  /** The draft version the editor is holding right now. */
  draftVersion: number
  /** When the storefront was last published (null = never through the builder). */
  publishedAt: string | null
  /** True when the editor has unsaved changes; the restore dialog warns. */
  hasUnsavedChanges: boolean
  /** The revision currently being previewed, if any. */
  activeRevisionId?: string | null
  onPreview: (revision: StorefrontRevision) => void
  /** Performs the restore; resolve false to keep the confirm dialog open. */
  onRestore: (revision: StorefrontRevision) => Promise<boolean>
}

export function RevisionHistoryPanel({
  open,
  onClose,
  draftVersion,
  publishedAt,
  hasUnsavedChanges,
  activeRevisionId,
  onPreview,
  onRestore,
}: RevisionHistoryPanelProps) {
  const [filter, setFilter] = useState<'all' | StorefrontRevisionType>('all')
  const [page, setPage] = useState(1)
  const [compareFrom, setCompareFrom] = useState<StorefrontRevision | null>(null)
  const [compareTo, setCompareTo] = useState<StorefrontRevision | null>(null)
  const [pendingRestore, setPendingRestore] = useState<StorefrontRevision | null>(null)
  const [compareHint, setCompareHint] = useState(false)

  const history = useStorefrontRevisions(
    { page, pageSize: PAGE_SIZE, type: filter === 'all' ? null : filter },
    open,
  )

  const groups = useMemo(() => {
    const buckets = new Map<string, StorefrontRevision[]>()
    for (const revision of history.data?.items ?? []) {
      const period = revisionPeriod(revision.createdAt)
      buckets.set(period, [...(buckets.get(period) ?? []), revision])
    }
    return [...buckets.entries()]
  }, [history.data])

  const startCompare = (revision: StorefrontRevision) => {
    if (!compareFrom) {
      setCompareFrom(revision)
      setCompareHint(true)
      return
    }
    if (compareFrom.id === revision.id) return
    setCompareTo(revision)
  }

  const comparing = compareFrom !== null && compareTo !== null

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Version history"
      description="Every saved version of your storefront, newest first."
      bodyClassName="grid gap-[0.9rem] content-start"
    >
      {comparing ? (
        <RevisionCompareView
          from={compareFrom}
          to={compareTo}
          onClose={() => {
            setCompareFrom(null)
            setCompareTo(null)
            setCompareHint(false)
          }}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-[0.5rem]">
            <div className="rounded-md border border-line bg-hover px-[0.7rem] py-[0.6rem]">
              <p className="eyebrow">Current draft</p>
              <p className="text-meta font-semibold">Version {draftVersion}</p>
            </div>
            <div className="rounded-md border border-line bg-hover px-[0.7rem] py-[0.6rem]">
              <p className="eyebrow">Latest published</p>
              <p className="text-meta font-semibold">
                {publishedAt ? formatDateTime(publishedAt) : 'Not published yet'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-[0.35rem]" role="group" aria-label="Filter versions">
            {FILTERS.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={filter === option.value}
                onClick={() => {
                  setFilter(option.value)
                  setPage(1)
                }}
                className={cn(
                  'rounded-pill border px-[0.7rem] py-[0.25rem] text-caption font-medium transition-colors',
                  filter === option.value
                    ? 'border-transparent bg-inverse text-on-inverse'
                    : 'border-line text-muted hover:text-fg',
                )}
              >
                {option.label}
              </button>
            ))}
          </div>

          {compareHint ? (
            <p className="rounded-md border border-info bg-info-soft px-[0.7rem] py-[0.55rem] text-meta text-info-ink">
              Now pick the version to compare with.
            </p>
          ) : null}

          {history.isPending ? (
            <div className="grid gap-[0.4rem]" aria-busy="true">
              {[0, 1, 2].map((index) => (
                <Skeleton key={index} className="h-[3.4rem] w-full rounded-md" />
              ))}
            </div>
          ) : history.isError ? (
            <div className="grid gap-[0.5rem]">
              <p
                role="alert"
                className="rounded-md border border-danger bg-danger-soft px-[0.7rem] py-[0.55rem] text-meta text-danger-ink"
              >
                Your version history could not be loaded.
              </p>
              <Button size="sm" onClick={() => void history.refetch()}>
                Try again
              </Button>
            </div>
          ) : (history.data?.items.length ?? 0) === 0 ? (
            <EmptyState
              icon={<History className="size-5" aria-hidden="true" />}
              title="No versions yet"
              description="Save a change and it appears here, ready to preview, compare or restore."
            />
          ) : (
            <div className="grid gap-[0.9rem]">
              {groups.map(([period, revisionsInPeriod]) => (
                <section key={period} className="grid gap-[0.4rem]">
                  <h3 className="eyebrow">{period}</h3>
                  <ul className="grid gap-[0.4rem]">
                    {revisionsInPeriod.map((revision) => {
                      const meta = TYPE_META[revision.revisionType]
                      const active = activeRevisionId === revision.id
                      const isCompareBase = compareFrom?.id === revision.id
                      return (
                        <li
                          key={revision.id}
                          data-revision-number={revision.revisionNumber}
                          className={cn(
                            'grid gap-[0.3rem] rounded-md border px-[0.7rem] py-[0.6rem]',
                            active || isCompareBase
                              ? 'border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_12%,transparent)]'
                              : 'border-line',
                          )}
                        >
                          <div className="flex flex-wrap items-center gap-[0.4rem]">
                            <Badge tone={meta.tone}>{meta.label}</Badge>
                            <span className="text-caption text-subtle">#{revision.revisionNumber}</span>
                            {active ? <Badge tone="info">Previewing</Badge> : null}
                          </div>
                          <p className="text-meta">{revision.description ?? meta.hint}</p>
                          <p className="text-caption text-subtle">
                            {formatDateTime(revision.createdAt)}
                            {revision.createdByName ? ` · ${revision.createdByName}` : ''}
                            {revision.sourceRevisionNumber !== null
                              ? ` · from version #${revision.sourceRevisionNumber}`
                              : ''}
                          </p>
                          <div className="flex flex-wrap gap-[0.35rem]">
                            <Button size="sm" variant="ghost" onClick={() => onPreview(revision)}>
                              <Eye className="size-3.5" aria-hidden="true" />
                              Preview
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => startCompare(revision)}>
                              <GitCompareArrows className="size-3.5" aria-hidden="true" />
                              {isCompareBase ? 'Compare with…' : 'Compare'}
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setPendingRestore(revision)}>
                              <Undo2 className="size-3.5" aria-hidden="true" />
                              Restore
                            </Button>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                </section>
              ))}

              {history.data?.hasMore ? (
                <Button
                  size="sm"
                  onClick={() => setPage((current) => current + 1)}
                  disabled={history.isFetching}
                >
                  {history.isFetching ? 'Loading…' : 'Load older versions'}
                </Button>
              ) : null}
            </div>
          )}
        </>
      )}

      <RevisionRestoreDialog
        revision={pendingRestore}
        hasUnsavedChanges={hasUnsavedChanges}
        onCancel={() => setPendingRestore(null)}
        onConfirm={async (revision) => {
          const ok = await onRestore(revision)
          if (ok) setPendingRestore(null)
          return ok
        }}
      />
    </Drawer>
  )
}
