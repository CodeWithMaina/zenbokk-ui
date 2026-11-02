import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { errorMessage } from '../../lib/api/client'
import type {
  NotificationPreferenceItem,
  ResolvedNotificationPreference,
} from '../../lib/api/types'
import { useDashboardContext } from '../../lib/dashboard/dashboard-context'
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from '../../lib/notifications'
import {
  NOTIFICATION_CATEGORY_DESCRIPTIONS,
  categoryLabel,
  channelLabel,
} from '../../lib/settings'
import { Alert } from '../ui/alert'
import { SectionCard } from '../ui/card'
import { NotificationMatrix } from '../ui/notification-matrix'
import { Note } from '../ui/note'
import { SaveBar } from '../ui/save-bar'
import { Skeleton } from '../ui/skeleton'

type Matrix = Record<string, Record<string, boolean>>

/** `[{category, channel, enabled}]` → `{ [category]: { [channel]: enabled } }`. */
function matrixFrom(preferences: readonly ResolvedNotificationPreference[]): Matrix {
  const matrix: Matrix = {}
  for (const preference of preferences) {
    matrix[preference.category] = {
      ...(matrix[preference.category] ?? {}),
      [preference.channel]: preference.enabled,
    }
  }
  return matrix
}

/** Distinct values in first-seen order, so the grid keeps the server's order. */
function unique(values: readonly string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const value of values) {
    if (!seen.has(value)) {
      seen.add(value)
      out.push(value)
    }
  }
  return out
}

/**
 * Notification preferences.
 *
 * The matrix is rendered from the server's RESOLVED view — every (category ×
 * channel) pair with its effective value and whether this deployment can
 * deliver on that channel — so the client never re-implements the precedence
 * rules and a channel with no sender is greyed out instead of being offered.
 * Rows and columns are derived from the payload, so a new category or channel
 * added to the backend appears without a frontend change.
 */
export function NotificationSettings({
  onDirtyChange,
}: {
  /** Reports whether this section has unsaved edits (used by the route guard). */
  onDirtyChange?: (dirty: boolean) => void
} = {}) {
  const { business } = useDashboardContext()
  const query = useNotificationPreferences(business.id)

  if (query.isPending) {
    return (
      <SectionCard
        title="Notification channels"
        description="Choose what you hear about, and where."
      >
        <div className="flex flex-col gap-3" aria-busy="true" aria-label="Loading preferences">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </SectionCard>
    )
  }

  if (query.isError || !query.data) {
    return (
      <Alert tone="danger" title="We could not load your notification preferences">
        {errorMessage(query.error, 'Try again in a moment.')}
      </Alert>
    )
  }

  return (
    <NotificationSettingsForm
      resolved={query.data}
      businessId={business.id}
      onDirtyChange={onDirtyChange}
    />
  )
}

function NotificationSettingsForm({
  resolved,
  businessId,
  onDirtyChange,
}: {
  resolved: ResolvedNotificationPreference[]
  businessId: string
  onDirtyChange?: (dirty: boolean) => void
}) {
  const update = useUpdateNotificationPreferences(businessId)

  const snapshot = useMemo(() => matrixFrom(resolved), [resolved])
  const [matrix, setMatrix] = useState<Matrix>(snapshot)
  const [formError, setFormError] = useState<string | null>(null)

  const categories = useMemo(
    () => unique(resolved.map((preference) => preference.category)),
    [resolved],
  )
  const channels = useMemo(
    () => unique(resolved.map((preference) => preference.channel)),
    [resolved],
  )

  const availability = useMemo(() => {
    const map = new Map<string, boolean>()
    for (const preference of resolved) {
      map.set(preference.channel, preference.available)
    }
    return map
  }, [resolved])

  const unavailable = channels.filter((channel) => availability.get(channel) === false)

  const changed: NotificationPreferenceItem[] = []
  for (const category of categories) {
    for (const channel of channels) {
      if (availability.get(channel) === false) continue
      const next = matrix[category]?.[channel] ?? false
      const previous = snapshot[category]?.[channel] ?? false
      if (next !== previous) changed.push({ category, channel, enabled: next })
    }
  }

  const dirty = changed.length > 0

  // Let the route know whether leaving this section would lose work.
  useEffect(() => {
    onDirtyChange?.(dirty)
    return () => onDirtyChange?.(false)
  }, [dirty, onDirtyChange])

  const handleChange = (category: string, channel: string, enabled: boolean) => {
    setMatrix((current) => ({
      ...current,
      [category]: { ...(current[category] ?? {}), [channel]: enabled },
    }))
  }

  const handleSave = async () => {
    setFormError(null)
    try {
      await update.mutateAsync(changed)
      toast.success('Notification preferences saved.')
    } catch (error) {
      setFormError(errorMessage(error))
    }
  }

  return (
    <div className="flex flex-col gap-[1rem]">
      <SectionCard
        title="Notification channels"
        description="Choose what you hear about, and where."
      >
        <NotificationMatrix
          control="switch"
          channels={channels.map((channel) => ({
            id: channel,
            label: channelLabel(channel),
            disabled: availability.get(channel) === false,
          }))}
          events={categories.map((category) => ({
            id: category,
            label: categoryLabel(category),
            description: NOTIFICATION_CATEGORY_DESCRIPTIONS[category],
          }))}
          value={matrix}
          onChange={handleChange}
        />
      </SectionCard>

      {unavailable.length > 0 ? (
        <Note>
          {unavailable.map(channelLabel).join(', ')}{' '}
          {unavailable.length === 1 ? 'isn’t' : 'aren’t'} available yet. They’re shown so you can see
          what’s coming.
        </Note>
      ) : null}

      <Note>
        Some security alerts are always delivered, because account protection cannot be silenced.
      </Note>

      {formError ? (
        <Alert tone="danger" title="Your changes were not saved">
          {formError}
        </Alert>
      ) : null}

      <SaveBar
        dirty={dirty}
        saving={update.isPending}
        message="You have unsaved notification changes."
        onSave={() => void handleSave()}
        onDiscard={() => {
          setMatrix(snapshot)
          setFormError(null)
        }}
      />
    </div>
  )
}

