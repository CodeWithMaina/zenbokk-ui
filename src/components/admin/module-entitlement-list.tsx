import { Lock, ShieldCheck, Sparkles } from 'lucide-react'
import { Badge, StatusPill } from '../ui/badge'
import { Button } from '../ui/button'
import { EmptyState } from '../ui/empty-state'
import type { AdminBusinessEffectiveModule } from '../../lib/api/types'
import { ModuleSourceBadge } from './badges'

export type ModuleEntitlementListProps = {
  modules: readonly AdminBusinessEffectiveModule[]
  /** Module key currently being written, so its row shows a busy state. */
  busyKey?: string | null
  /** Toggle an explicit admin override on/off. */
  onSet?: (moduleKey: string, enabled: boolean) => void
  /** Remove the override so the module reverts to plan entitlement. */
  onRemoveOverride?: (moduleKey: string) => void
  readOnly?: boolean
}

/**
 * Every module with its resolved entitlement for one business.
 *
 * The distinctions the platform administrator needs are made explicit:
 * a module can be included by the plan, granted manually (an override), or
 * withheld. `hasAccess` is the effective answer — enabled AND covered by an
 * access-granting subscription AND the business not suspended — so a module can
 * read "Enabled" yet not grant access, and the row says why.
 */
export function ModuleEntitlementList({
  modules,
  busyKey,
  onSet,
  onRemoveOverride,
  readOnly = false,
}: ModuleEntitlementListProps) {
  if (modules.length === 0) {
    return (
      <EmptyState
        icon={<Sparkles className="size-5" />}
        title="No modules in the catalogue"
        description="Modules appear here once the platform registers them."
      />
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="table">
        <thead>
          <tr>
            <th scope="col">Module</th>
            <th scope="col">Entitlement</th>
            <th scope="col">Source</th>
            <th scope="col">Dependencies</th>
            {!readOnly ? (
              <th scope="col" className="text-right">
                Actions
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {modules.map((module) => {
            const busy = busyKey === module.key
            const overridden = module.source === 'ADMIN' || module.source === 'OVERRIDE'
            return (
              <tr key={module.key}>
                <td>
                  <span className="block font-semibold">{module.name}</span>
                  <span className="block font-mono text-caption text-muted">{module.key}</span>
                  {module.description ? (
                    <span className="mt-[0.15rem] block text-caption text-subtle">
                      {module.description}
                    </span>
                  ) : null}
                </td>
                <td>
                  <StatusPill tone={module.hasAccess ? 'success' : module.isEnabled ? 'warning' : 'neutral'}>
                    {module.hasAccess
                      ? 'Available'
                      : module.isEnabled
                        ? 'Enabled — no access'
                        : 'Disabled'}
                  </StatusPill>
                  {module.isCore ? (
                    <Badge tone="info" className="ml-[0.4rem]">
                      Core
                    </Badge>
                  ) : null}
                  {module.reason ? (
                    <span className="mt-[0.2rem] block text-caption text-subtle">{module.reason}</span>
                  ) : null}
                </td>
                <td>
                  <ModuleSourceBadge source={module.source} />
                </td>
                <td>
                  {module.dependencies.length === 0 ? (
                    <span className="text-caption text-muted">None</span>
                  ) : (
                    <span className="flex flex-wrap gap-[0.3rem]">
                      {module.dependencies.map((dependency) => {
                        const dep = modules.find((candidate) => candidate.key === dependency)
                        const ok = dep?.hasAccess ?? false
                        return (
                          <Badge key={dependency} tone={ok ? 'success' : 'danger'}>
                            {dependency}
                          </Badge>
                        )
                      })}
                    </span>
                  )}
                </td>
                {!readOnly ? (
                  <td>
                    <div className="flex justify-end gap-[0.4rem]">
                      <Button
                        size="sm"
                        variant={module.isEnabled ? 'default' : 'primary'}
                        disabled={busy}
                        onClick={() => onSet?.(module.key, !module.isEnabled)}
                      >
                        {module.isEnabled ? (
                          <>
                            <Lock className="size-[0.85rem]" aria-hidden="true" />
                            Disable
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="size-[0.85rem]" aria-hidden="true" />
                            Enable
                          </>
                        )}
                      </Button>
                      {overridden ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busy}
                          onClick={() => onRemoveOverride?.(module.key)}
                        >
                          Revert
                        </Button>
                      ) : null}
                    </div>
                  </td>
                ) : null}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
