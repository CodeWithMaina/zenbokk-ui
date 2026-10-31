import { Outlet, createFileRoute, useNavigate } from '@tanstack/react-router'
import { ConsoleShell } from '../components/shell/ConsoleShell'
import { ConsoleBootstrapSkeleton, ConsoleUnavailable } from '../components/shell/ConsoleStates'
import { requireSession } from '../lib/auth/guards'
import { DashboardProvider, useBusinessDashboard } from '../lib/dashboard'
import { useDashboardContext } from '../lib/dashboard/dashboard-context'

export const Route = createFileRoute('/staff')({
  beforeLoad: async ({ location }) => {
    await requireSession(['Staff'], location.href)
  },
  component: StaffLayout,
})

/**
 * Staff console frame.
 *
 * Same bootstrap as the owner dashboard, resolved for the staff persona: the
 * business comes from `/v1/businesses/staff/my-business` (answered from the
 * caller's membership — the client never supplies it) and the module
 * entitlements from `/v1/me/modules`, so the sidebar only shows what this
 * business and this role can actually reach.
 */
function StaffLayout() {
  const bootstrap = useBusinessDashboard('staff')
  const navigate = useNavigate()

  if (bootstrap.status === 'loading') {
    return <ConsoleBootstrapSkeleton label="Loading your staff workspace…" />
  }

  if (bootstrap.status === 'unauthenticated') {
    return (
      <ConsoleUnavailable
        consoleLabel="Staff console"
        kind="unauthenticated"
        message="Your session ended before your workspace could be loaded."
        onRetry={bootstrap.retry}
        onSignIn={() => void navigate({ to: '/login', replace: true })}
        onSignInAsAnother={() => void navigate({ to: '/login', replace: true })}
      />
    )
  }

  if (bootstrap.status === 'error') {
    return (
      <ConsoleUnavailable
        consoleLabel="Staff console"
        kind={bootstrap.kind}
        message={bootstrap.message}
        onRetry={bootstrap.retry}
        onSignInAsAnother={() => void navigate({ to: '/login', replace: true })}
      />
    )
  }

  return (
    <DashboardProvider bootstrap={bootstrap.data}>
      <StaffFrame />
    </DashboardProvider>
  )
}

function StaffFrame() {
  const { business, nav } = useDashboardContext()

  return (
    <ConsoleShell brand={business.name} brandCaption="Staff console" homeTo="/staff" nav={nav}>
      <Outlet />
    </ConsoleShell>
  )
}
