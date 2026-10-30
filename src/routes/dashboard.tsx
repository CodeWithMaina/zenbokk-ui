import { createFileRoute, Outlet, useRouter } from '@tanstack/react-router'
import {
  CalendarDays,
  LayoutDashboard,
  Scissors,
  Settings,
  Store,
  UsersRound,
  UserSquare,
} from 'lucide-react'
import { useMemo } from 'react'
import { ConsoleShell } from '../components/shell/ConsoleShell'
import type { ConsoleNavItem } from '../components/shell/ConsoleNavList'
import { Alert } from '../components/ui/alert'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { Skeleton } from '../components/ui/skeleton'
import { ApiError } from '../lib/api/client'
import { requireSession } from '../lib/auth/guards'
import { OwnerConsoleContext } from '../lib/dashboard/console-context'
import type { OwnerConsoleValue } from '../lib/dashboard/console-context'
import { useOwnerBootstrap } from '../lib/dashboard/use-owner-dashboard'
import { MODULE } from '../lib/entitlements'

export const Route = createFileRoute('/dashboard')({
  beforeLoad: async ({ location }) => {
    await requireSession(['Business'], location.href)
  },
  component: DashboardLayout,
})

function DashboardLayout() {
  const bootstrap = useOwnerBootstrap()
  const router = useRouter()

  const value = useMemo<OwnerConsoleValue | null>(() => {
    if (!bootstrap.data) return null
    const { entitlements, permissions } = bootstrap.data
    return {
      bootstrap: bootstrap.data,
      business: bootstrap.data.business,
      entitlements,
      permissions,
      plan: bootstrap.data.plan,
      hasModule: (key) => entitlements.includes(key),
      hasPermission: (code) => permissions.includes(code),
    }
  }, [bootstrap.data])

  if (bootstrap.isPending) {
    return (
      <div className="mx-auto flex w-full max-w-(--container-page-wide) gap-6 p-6" aria-busy="true">
        <div className="hidden w-[15rem] shrink-0 space-y-3 lg:block">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-2/3" />
        </div>
        <div className="min-w-0 flex-1 space-y-4">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-24 rounded-card" />
          <Skeleton className="h-24 rounded-card" />
        </div>
      </div>
    )
  }

  if (bootstrap.isError || !value) {
    const error = bootstrap.error
    const message =
      error instanceof ApiError && (error.isForbidden || error.isNotFound)
        ? 'This account doesn’t own a business workspace yet. Ask an administrator to link one, or sign in with the owner’s email address.'
        : error instanceof ApiError
          ? error.message
          : 'We couldn’t load your workspace.'

    return (
      <main className="grid min-h-svh place-items-center px-5 py-12">
        <Card className="w-full max-w-[34rem] p-7">
          <p className="eyebrow">Owner console</p>
          <h1 className="display mt-2 text-title">Workspace unavailable</h1>
          <p className="mt-2 text-meta text-muted">{message}</p>
          <div className="mt-6 flex flex-wrap gap-[0.5rem]">
            <Button variant="primary" onClick={() => void bootstrap.refetch()}>
              Try again
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                void router.navigate({ to: '/auth/sign-in', replace: true })
              }}
            >
              Sign in with another account
            </Button>
          </div>
        </Card>
      </main>
    )
  }

  const { business, hasModule, plan } = value

  const nav: ConsoleNavItem[] = [
    { to: '/dashboard', label: 'Overview', icon: LayoutDashboard, exact: true },
    {
      to: '/dashboard/appointments',
      label: 'Appointments',
      icon: CalendarDays,
      hidden: !hasModule(MODULE.appointments),
    },
    {
      to: '/dashboard/services',
      label: 'Services',
      icon: Scissors,
      hidden: !hasModule(MODULE.serviceCatalog),
    },
    {
      to: '/dashboard/staff',
      label: 'Staff',
      icon: UserSquare,
      hidden: !hasModule(MODULE.staff),
    },
    {
      to: '/dashboard/customers',
      label: 'Customers',
      icon: UsersRound,
      hidden: !hasModule(MODULE.customers),
    },
    {
      to: '/dashboard/storefront',
      label: 'Storefront',
      icon: Store,
      hidden: !hasModule(MODULE.storefront),
    },
    { to: '/dashboard/settings', label: 'Settings', icon: Settings },
  ]

  const planNeedsAttention =
    !plan || ['expired', 'past_due', 'canceled', 'suspended'].includes(plan.status)

  return (
    <OwnerConsoleContext value={value}>
      <ConsoleShell
        brand={business.name}
        brandCaption={business.category ?? 'Owner console'}
        homeTo="/dashboard"
        nav={nav}
        banner={
          planNeedsAttention ? (
            <div className="px-4 pt-4">
              <Alert tone="warning">
                {plan
                  ? `Your ${plan.name} plan is ${plan.status.replace('_', ' ')}. Some modules are paused until it is renewed.`
                  : 'No plan is attached to this workspace yet, so only core screens are available.'}{' '}
                <a href="/dashboard/settings" className="link font-semibold">
                  Review plans
                </a>
              </Alert>
            </div>
          ) : null
        }
      >
        <Outlet />
      </ConsoleShell>
    </OwnerConsoleContext>
  )
}
