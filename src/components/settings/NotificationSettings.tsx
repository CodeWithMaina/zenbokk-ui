import { useDashboardContext } from '../../lib/dashboard/dashboard-context'
import { NotificationWorkspace } from './NotificationWorkspace'

/**
 * Notification settings.
 *
 * A thin wrapper: the workspace owns its own tabs and data, and this component
 * only supplies the tenant id. Each tab reads and writes real endpoints, so a
 * change here reaches the delivery pipeline immediately.
 */
export function NotificationSettings({
  onDirtyChange,
}: {
  /** Reports whether this section has unsaved edits (used by the route guard). */
  onDirtyChange?: (dirty: boolean) => void
} = {}) {
  const { business } = useDashboardContext()

  // The workspace persists per tab, so the route never needs to guard a draft.
  onDirtyChange?.(false)

  return <NotificationWorkspace businessId={business.id} />
}

