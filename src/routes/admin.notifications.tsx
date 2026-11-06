import { Outlet, createFileRoute, useNavigate, useRouterState } from '@tanstack/react-router'
import {
  Activity,
  BarChart3,
  Building2,
  FileText,
  Plug,
  ScrollText,
  Send,
  TriangleAlert,
} from 'lucide-react'
import { Tabs } from '../components/ui/tabs'
import type { TabItem } from '../components/ui/tabs'

export const Route = createFileRoute('/admin/notifications')({
  component: AdminNotificationsLayout,
})

type NotificationsTab =
  | '/admin/notifications'
  | '/admin/notifications/logs'
  | '/admin/notifications/delivery'
  | '/admin/notifications/failures'
  | '/admin/notifications/providers'
  | '/admin/notifications/templates'
  | '/admin/notifications/businesses'
  | '/admin/notifications/analytics'

const TABS: readonly TabItem<NotificationsTab>[] = [
  { value: '/admin/notifications', label: 'Dashboard', icon: <Send className="size-4" aria-hidden="true" /> },
  { value: '/admin/notifications/logs', label: 'Logs', icon: <ScrollText className="size-4" aria-hidden="true" /> },
  { value: '/admin/notifications/delivery', label: 'Delivery', icon: <Activity className="size-4" aria-hidden="true" /> },
  { value: '/admin/notifications/failures', label: 'Failures', icon: <TriangleAlert className="size-4" aria-hidden="true" /> },
  { value: '/admin/notifications/providers', label: 'Providers', icon: <Plug className="size-4" aria-hidden="true" /> },
  { value: '/admin/notifications/templates', label: 'Templates', icon: <FileText className="size-4" aria-hidden="true" /> },
  { value: '/admin/notifications/businesses', label: 'Businesses', icon: <Building2 className="size-4" aria-hidden="true" /> },
  { value: '/admin/notifications/analytics', label: 'Analytics', icon: <BarChart3 className="size-4" aria-hidden="true" /> },
]

/**
 * Notification management module frame.
 *
 * The tab bar is the module's own navigation, kept in the URL so a refresh or a
 * shared link lands on the same page. Each page fetches only what it renders.
 */
function AdminNotificationsLayout() {
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (state) => state.location.pathname })

  const active =
    TABS.find((tab) => tab.value === pathname)?.value ??
    TABS.find((tab) => tab.value !== '/admin/notifications' && pathname.startsWith(tab.value))?.value ??
    '/admin/notifications'

  return (
    <div>
      <div className="mb-[1rem]">
        <h1 className="text-title font-bold tracking-snug">Notifications</h1>
        <p className="mt-[0.15rem] text-meta text-muted">
          Delivery health, the notification ledger, provider configuration and per-business controls.
        </p>
      </div>

      <Tabs
        label="Notification management sections"
        items={TABS}
        value={active}
        onValueChange={(value) => void navigate({ to: value })}
      />

      <div className="mt-[1.3rem] min-w-0">
        <Outlet />
      </div>
    </div>
  )
}
