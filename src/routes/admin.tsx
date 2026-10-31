import { Outlet, createFileRoute } from '@tanstack/react-router'
import { ConsoleShell } from '../components/shell/ConsoleShell'
import { requireAdminSurface, requireSession } from '../lib/auth/guards'
import { ADMIN_NAV, resolveNavigation } from '../lib/navigation'

export const Route = createFileRoute('/admin')({
  beforeLoad: async ({ location }) => {
    // Platform administration lives on its own hostname; on the admin host the
    // console renders, anywhere else the visitor is sent there.
    requireAdminSurface()
    await requireSession(['Admin'], location.href)
  },
  component: AdminLayout,
})

/**
 * Platform administration frame.
 *
 * There is no bootstrap call here on purpose: an administrator is not a member
 * of any business, so there are no entitlements or permissions to resolve. Every
 * screen behind this layout is gated server-side by the `PlatformAdmin` policy,
 * which is the only authority that matters. The menu still comes from the shared
 * navigation configuration rather than a local array.
 */
function AdminLayout() {
  const nav = resolveNavigation(ADMIN_NAV, {
    surface: 'admin',
    role: 'Admin',
    entitlements: [],
    permissions: [],
  })

  return (
    <ConsoleShell brand="Punched" brandCaption="Platform administration" homeTo="/admin" nav={nav}>
      <Outlet />
    </ConsoleShell>
  )
}
