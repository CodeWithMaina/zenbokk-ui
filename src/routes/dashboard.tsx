import { createFileRoute, Link, Outlet, useNavigate } from '@tanstack/react-router'
import { ConsoleShell } from '../components/shell/ConsoleShell'
import { ConsoleBootstrapSkeleton, ConsoleUnavailable } from '../components/shell/ConsoleStates'
import { Alert } from '../components/ui/alert'
import { requireSession } from '../lib/auth/guards'
import { DashboardProvider, useBusinessDashboard } from '../lib/dashboard'
import { useDashboardContext } from '../lib/dashboard/dashboard-context'

export const Route = createFileRoute('/dashboard')({
  beforeLoad: async ({ location }) => {
    await requireSession(['Business'], location.href)
  },
  component: DashboardLayout,
})

/**
 * Business dashboard shell.
 *
 * The layout does exactly three things: guard the route, bootstrap the business
 * context (identity → business → entitlements → permissions → plan), and hand
 * the resolved payload to `DashboardProvider`. Pages below it read business
 * access from that context, so none of them has to work it out again.
 */
function DashboardLayout() {
  const bootstrap = useBusinessDashboard('dashboard')
  const navigate = useNavigate()

  if (bootstrap.status === 'loading') {
    return <ConsoleBootstrapSkeleton label="Loading your business workspace…" />
  }

  if (bootstrap.status === 'unauthenticated') {
    return (
      <ConsoleUnavailable
        consoleLabel="Business dashboard"
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
        consoleLabel="Business dashboard"
        kind={bootstrap.kind}
        message={bootstrap.message}
        onRetry={bootstrap.retry}
        onSignInAsAnother={() => void navigate({ to: '/login', replace: true })}
      />
    )
  }

  return (
    <DashboardProvider bootstrap={bootstrap.data}>
      <DashboardFrame />
    </DashboardProvider>
  )
}

/** The frame itself: brand, resolved sidebar, plan notice and the page. */
function DashboardFrame() {
  const { business, plan, nav } = useDashboardContext()

  const planNeedsAttention =
    !plan || ['expired', 'past_due', 'canceled', 'suspended'].includes(plan.status)

  return (
    <ConsoleShell
      brand={business.name}
      brandCaption={business.category ?? 'Business dashboard'}
      homeTo="/dashboard"
      nav={nav}
      banner={
        planNeedsAttention ? (
          <div className="px-4 pt-4">
            <Alert tone="warning">
              {plan
                ? `Your ${plan.name} plan is ${plan.status.replace('_', ' ')}. Some modules are paused until it is renewed.`
                : 'No plan is attached to this workspace yet, so only core screens are available.'}{' '}
              <Link to="/dashboard/settings" className="link font-semibold">
                Review plans
              </Link>
            </Alert>
          </div>
        ) : null
      }
    >
      <Outlet />
    </ConsoleShell>
  )
}
