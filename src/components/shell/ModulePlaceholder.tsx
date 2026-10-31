import { Link } from '@tanstack/react-router'
import { Puzzle } from 'lucide-react'
import { useDashboardContext } from '../../lib/dashboard/dashboard-context'
import { NAV_INDEX } from '../../lib/navigation'
import { Alert } from '../ui/alert'
import { Card, SectionCard } from '../ui/card'
import { EmptyState } from '../ui/empty-state'
import { PageHeader } from '../ui/page-header'

/**
 * Placeholder page for a module that has a navigation entry, a route and access
 * checks but no screens yet.
 *
 * Deliberately dumb: it renders the module's title from the central navigation
 * configuration and states whether the business is entitled to it. It performs
 * no API calls, holds no state and implements no module behaviour — the actual
 * screens land in their own sessions, behind exactly these routes.
 */
export function ModulePlaceholder({ navKey }: { navKey: string }) {
  const { canSee, hasModule, plan, surface } = useDashboardContext()

  const entry = NAV_INDEX.find((candidate) => candidate.key === navKey)
  const title = entry?.label ?? navKey
  const Icon = entry?.icon ?? Puzzle
  const entitled = entry?.module ? hasModule(entry.module) : true

  // The sidebar hides modules the business cannot use; a direct visit gets an
  // explanation instead of a broken page (the API would answer 403 anyway).
  if (entry && !canSee(navKey)) {
    return (
      <div>
        <PageHeader title={title} description="This module is not available in your workspace." />
        <Alert tone="info" title={`${title} isn’t part of your current plan`}>
          {entry.module
            ? `Your workspace is not entitled to the “${entry.module}” module, so its screens stay hidden. `
            : 'Your role does not have access to this screen. '}
          {surface === 'dashboard' ? (
            <Link to="/dashboard/settings" className="link font-semibold">
              Review your plan and modules
            </Link>
          ) : (
            'Ask an owner to review the plan for this workspace.'
          )}
        </Alert>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title={title}
        description={
          entry?.module ? `Module “${entry.module}” · enabled for this workspace` : 'Workspace screen'
        }
      />

      <SectionCard contentClassName="mt-0">
        <EmptyState
          icon={<Icon className="size-5" />}
          title={`${title} is not built yet`}
          description="The route, navigation entry and access checks for this module are in place. Its screens are implemented in a later session."
          action={
            <Link to={surface === 'staff' ? '/staff' : '/dashboard'} className="btn btn-ghost no-underline">
              Back to {surface === 'staff' ? 'today’s console' : 'dashboard'}
            </Link>
          }
        />
      </SectionCard>

      <Card className="mt-4 p-[1.1rem]">
        <p className="eyebrow">Wiring</p>
        <dl className="m-0 mt-[0.6rem] grid gap-[0.6rem] text-meta sm:grid-cols-3">
          <div>
            <dt className="text-caption text-muted">Module key</dt>
            <dd className="m-0 font-semibold">{entry?.module ?? '— (always available)'}</dd>
          </div>
          <div>
            <dt className="text-caption text-muted">Entitlement</dt>
            <dd className="m-0 font-semibold">{entitled ? 'Enabled' : 'Not enabled'}</dd>
          </div>
          <div>
            <dt className="text-caption text-muted">Plan</dt>
            <dd className="m-0 font-semibold">{plan ? plan.name : 'No plan attached'}</dd>
          </div>
        </dl>
      </Card>
    </div>
  )
}
