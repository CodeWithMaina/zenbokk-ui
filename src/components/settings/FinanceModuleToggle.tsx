import { useState } from 'react'
import { Landmark } from 'lucide-react'
import { toast } from 'sonner'
import { errorMessage } from '../../lib/api/client'
import { useSetModuleEnabled, useSettingsModules } from '../../lib/settings'
import { SectionCard } from '../ui/card'
import { Skeleton } from '../ui/skeleton'
import { Switch } from '../ui/switch'
import { Alert } from '../ui/alert'

/**
 * The Finance module switch — the business-level enable/disable for the whole module.
 *
 * Finance is a normal entitlement, so it is controlled the way every other module is: an
 * owner-level OVERRIDE on the business, enforced server-side (the API answers 403
 * MODULE_DISABLED and the navigation drops the entry). This control exists so the owner can
 * find that switch where finance lives, rather than hunting for it.
 *
 * Turning Finance off hides the screens. It never deletes a financial record, and it never
 * stops a customer booking or paying — payment processing is the payments domain, not the
 * management screens.
 */
export function FinanceModuleToggle() {
  const modules = useSettingsModules()
  const setEnabled = useSetModuleEnabled()
  const [error, setError] = useState<string | null>(null)

  const finance = modules.data?.modules.find((entry) => entry.key === 'financials')

  if (modules.isPending) {
    return (
      <SectionCard title="Finance">
        <Skeleton className="h-[3.4rem]" />
      </SectionCard>
    )
  }

  // No module row means the catalogue has no Finance module for this business at all — which
  // is a plan problem, not a toggle. Say so rather than rendering a dead switch.
  if (!finance) {
    return (
      <SectionCard title="Finance" description="Cashbook and M-PESA reconciliation.">
        <p className="m-0 text-meta text-muted">
          Finance is not available on your current plan. Contact support to add it.
        </p>
      </SectionCard>
    )
  }

  const toggle = async (next: boolean) => {
    setError(null)
    try {
      await setEnabled.mutateAsync({ moduleKey: 'financials', enabled: next })
      toast.success(next ? 'Finance enabled.' : 'Finance disabled. Your records are untouched.')
    } catch (failure) {
      setError(errorMessage(failure, 'The Finance setting could not be changed.'))
    }
  }

  return (
    <SectionCard
      title="Finance"
      description="The Cashbook and M-PESA reconciliation screens."
      action={
        <span className="inline-flex items-center gap-[0.4rem] text-caption text-muted">
          <Landmark className="size-3.5" aria-hidden="true" />
          {finance.source === 'OVERRIDE' ? 'Set by you' : 'From your plan'}
        </span>
      }
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="m-0 font-semibold">{finance.enabled ? 'Finance is on' : 'Finance is off'}</p>
          <p className="m-0 mt-[0.1rem] text-meta text-muted">
            {finance.enabled
              ? 'Your Cashbook and Reconciliation screens are visible to your team.'
              : 'The finance screens are hidden. Nothing has been deleted, and customers can still book and pay.'}
          </p>
        </div>
        <Switch
          checked={finance.enabled}
          onCheckedChange={(next) => void toggle(next)}
          label="Enable Finance"
          disabled={setEnabled.isPending}
        />
      </div>

      {error ? (
        <Alert tone="danger" title="Could not change the setting" className="mt-[0.8rem]">
          {error}
        </Alert>
      ) : null}
    </SectionCard>
  )
}
