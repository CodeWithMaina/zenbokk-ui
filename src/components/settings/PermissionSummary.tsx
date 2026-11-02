import { Link } from '@tanstack/react-router'
import type { BusinessModuleDetail } from '../../lib/api/types'
import { groupPermissionsByArea, roleLabel } from '../../lib/settings'
import { SectionCard } from '../ui/card'
import { Disclosure } from '../ui/disclosure'
import { MetricGrid } from '../ui/metric-tile'
import { PermissionGrid } from '../ui/permission-grid'

export type PermissionSummaryProps = {
  /** Permission codes the caller's role holds (from the backend). */
  permissions: readonly string[]
  /** Every module in the catalog, used to label permission areas. */
  modules: readonly BusinessModuleDetail[]
  /** Effective module keys the business can currently access. */
  accessibleModules: readonly string[]
  /** Backend persona for the session (`Business` for an owner). */
  role: string
  /** True while the module catalog is still loading. */
  loading?: boolean
}

/**
 * "Your access" card: real permission and module counts for the signed-in
 * caller, plus the permission codes grouped by the module that owns them.
 *
 * Nothing here is hardcoded — the counts come from the caller's permission set
 * and the business's effective entitlements, and the area labels come from the
 * module names the API returns.
 */
export function PermissionSummary({
  permissions,
  modules,
  accessibleModules,
  role,
  loading = false,
}: PermissionSummaryProps) {
  const moduleNames = new Map(modules.map((module) => [module.key, module.name]))
  const areas = groupPermissionsByArea(permissions, moduleNames)

  return (
    <SectionCard
      title="Your access"
      description={`As ${roleLabel(role).toLowerCase()}, you can manage every part of this business.`}
    >
      <MetricGrid
        items={[
          { value: permissions.length, label: 'Permissions' },
          { value: accessibleModules.length, label: 'Modules' },
          { value: roleLabel(role), label: 'Role' },
        ]}
      />

      {areas.length > 0 ? (
        <Disclosure
          summary="See permissions by area"
          className="mt-[1rem] border-t border-line pt-[0.8rem]"
        >
          <PermissionGrid
            permissions={areas.map((area) => ({
              id: area.id,
              area: area.area,
              level: `(${area.count})`,
            }))}
          />
        </Disclosure>
      ) : (
        <p className="mt-[0.9rem] text-meta text-muted">
          {loading
            ? 'Loading your permissions…'
            : 'No permission codes are attached to this role yet.'}
        </p>
      )}

      <p className="mt-[0.9rem] text-caption text-muted">
        Modules are switched on per plan.{' '}
        <Link to="/dashboard/settings" search={{ section: 'business' }} className="link">
          Review plan and modules
        </Link>
      </p>
    </SectionCard>
  )
}
