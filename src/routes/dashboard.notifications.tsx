import { createFileRoute } from '@tanstack/react-router'
import { ModulePlaceholder } from '../components/shell/ModulePlaceholder'

/** Notifications — placeholder (`notifications` module, `notifications.view`). */
export const Route = createFileRoute('/dashboard/notifications')({
  component: NotificationsPlaceholder,
})

function NotificationsPlaceholder() {
  return <ModulePlaceholder navKey="notifications" />
}
