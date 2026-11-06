import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Alert } from '../ui/alert'
import { SectionCard } from '../ui/card'
import { NotificationMatrix } from '../ui/notification-matrix'
import { Note } from '../ui/note'
import { SaveBar } from '../ui/save-bar'
import { Skeleton } from '../ui/skeleton'
import {
  useBusinessNotificationPreferences,
  useUpdateBusinessNotificationPreferences,
} from '../../lib/notifications/use-business-notifications'
import { errorMessage } from '../../lib/api/client'
import { NOTIFICATION_CATEGORY_DESCRIPTIONS, categoryLabel, channelLabel } from '../../lib/settings'

type Matrix = Record<string, Record<string, boolean>>

/**
 * The business's own (category × channel) preference matrix.
 *
 * Rows and columns come from the server's resolved view, so a category or
 * channel added to the backend appears here without a frontend change. Only the
 * cells that changed are written.
 */
export function NotificationPreferencesTab({ businessId }: { businessId: string }) {
  const query = useBusinessNotificationPreferences(businessId)
  const update = useUpdateBusinessNotificationPreferences(businessId)

  const preferences = query.data ?? []

  const snapshot = useMemo(() => {
    const matrix: Matrix = {}
    for (const preference of preferences) {
      matrix[preference.category] = {
        ...(matrix[preference.category] ?? {}),
        [preference.channel]: preference.enabled,
      }
    }
    return matrix
  }, [preferences])

  const [matrix, setMatrix] = useState<Matrix>({})
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => setMatrix(snapshot), [snapshot])

  const categories = useMemo(
    () => [...new Set(preferences.map((entry) => entry.category))],
    [preferences],
  )
  const channels = useMemo(() => [...new Set(preferences.map((entry) => entry.channel))], [preferences])

  const availability = useMemo(() => {
    const map = new Map<string, boolean>()
    for (const entry of preferences) map.set(entry.channel, entry.available)
    return map
  }, [preferences])

  const adminLocked = useMemo(
    () => new Set(preferences.filter((entry) => entry.adminOverride).map((entry) => entry.channel)),
    [preferences],
  )

  if (query.isError) {
    return (
      <Alert tone="danger" title="We could not load your notification preferences">
        {errorMessage(query.error, 'Try again in a moment.')}
      </Alert>
    )
  }

  if (query.isPending) return <Skeleton className="h-40 rounded-card" />

  const changed: { category: string; channel: string; enabled: boolean }[] = []
  for (const category of categories) {
    for (const channel of channels) {
      if (availability.get(channel) === false) continue
      const next = matrix[category]?.[channel] ?? false
      const previous = snapshot[category]?.[channel] ?? false
      if (next !== previous) changed.push({ category, channel, enabled: next })
    }
  }

  const unavailable = channels.filter((channel) => availability.get(channel) === false)

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
        title="Notification preferences"
        description="Choose which events your customers and staff are notified about, and on which channels."
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
          onChange={(category, channel, enabled) =>
            setMatrix((current) => ({
              ...current,
              [category]: { ...(current[category] ?? {}), [channel]: enabled },
            }))
          }
        />
      </SectionCard>

      {adminLocked.size > 0 ? (
        <Note>
          {[...adminLocked].map(channelLabel).join(', ')}{' '}
          {adminLocked.size === 1 ? 'is' : 'are'} restricted by the platform. Contact support to change
          {adminLocked.size === 1 ? ' it' : ' them'}.
        </Note>
      ) : null}

      {unavailable.length > 0 ? (
        <Note>
          {unavailable.map(channelLabel).join(', ')}{' '}
          {unavailable.length === 1 ? 'isn’t' : 'aren’t'} available on this deployment yet.
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
        dirty={changed.length > 0}
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
