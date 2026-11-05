import { createFileRoute, Link, useParams } from '@tanstack/react-router'
import { Ban, Pause, Play, RotateCcw, XCircle } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { PlanLifecyclePill, SubscriptionStatusPill } from '../components/admin/badges'
import { AuditTimeline } from '../components/admin/audit-timeline'
import { ModuleEntitlementList } from '../components/admin/module-entitlement-list'
import { ReasonDialog } from '../components/admin/reason-dialog'
import { Alert } from '../components/ui/alert'
import { Button } from '../components/ui/button'
import { SectionCard } from '../components/ui/card'
import { DescriptionList, DescriptionRow } from '../components/ui/description-list'
import { EmptyState } from '../components/ui/empty-state'
import { Field, Input, Select } from '../components/ui/field'
import { EntityHeader } from '../components/ui/page-header'
import { Skeleton } from '../components/ui/skeleton'
import {
  useAdminSubscriptionDetail,
  useAdminTiers,
  useChangePlan,
  useExtendSubscription,
  useRemoveBusinessModuleOverride,
  useSetBusinessModule,
  useSubscriptionAction,
} from '../lib/admin/use-admin'
import { errorMessage } from '../lib/api/client'
import { formatDate, formatNumber, money } from '../lib/format'

export const Route = createFileRoute('/admin/subscriptions/$businessId')({
  component: AdminSubscriptionDetailPage,
})

type Action = 'pause' | 'resume' | 'cancel' | 'reactivate' | 'deactivate'

/** One subscription: plan, pricing, modules, lifecycle, billing and history. */
function AdminSubscriptionDetailPage() {
  const { businessId } = useParams({ from: '/admin/subscriptions/$businessId' })
  const detail = useAdminSubscriptionDetail(businessId)
  const tiers = useAdminTiers()
  const action = useSubscriptionAction(businessId)
  const changePlan = useChangePlan(businessId)
  const extend = useExtendSubscription(businessId)
  const setModule = useSetBusinessModule(businessId)
  const removeOverride = useRemoveBusinessModuleOverride(businessId)

  const [pending, setPending] = useState<Action | null>(null)
  const [busyModule, setBusyModule] = useState<string | null>(null)
  const [targetPlan, setTargetPlan] = useState('')
  const [planReason, setPlanReason] = useState('')
  const [extendDate, setExtendDate] = useState('')
  const [extendReason, setExtendReason] = useState('')

  if (detail.isError) {
    return (
      <Alert tone="danger">
        {errorMessage(detail.error, 'We could not load this subscription.')}
      </Alert>
    )
  }

  if (detail.isPending || !detail.data) {
    return (
      <div className="space-y-[0.8rem]" aria-busy="true">
        <Skeleton className="h-16 rounded-card" />
        <Skeleton className="h-40 rounded-card" />
      </div>
    )
  }

  const sub = detail.data
  const tier = sub.currentTier
  const status = sub.subscriptionStatus ?? 'none'

  const confirmAction = (reason: string) => {
    if (!pending) return
    action.mutate(
      { action: pending, reason },
      {
        onSuccess: (result) => {
          toast.success(result.message)
          setPending(null)
        },
        onError: (error) => toast.error(errorMessage(error)),
      },
    )
  }

  const onToggleModule = (moduleKey: string, enabled: boolean) => {
    setBusyModule(moduleKey)
    setModule.mutate(
      { moduleKey, enabled },
      {
        onSuccess: () =>
          toast.success(`Module '${moduleKey}' ${enabled ? 'enabled' : 'disabled'}.`),
        onError: (error) => toast.error(errorMessage(error)),
        onSettled: () => setBusyModule(null),
      },
    )
  }

  const onRevertModule = (moduleKey: string) => {
    setBusyModule(moduleKey)
    removeOverride.mutate(moduleKey, {
      onSuccess: () => toast.success(`'${moduleKey}' reverted to the plan entitlement.`),
      onError: (error) => toast.error(errorMessage(error)),
      onSettled: () => setBusyModule(null),
    })
  }

  return (
    <div>
      <Link to="/admin/subscriptions" className="link mb-[0.4rem] inline-block font-medium">
        ← All subscriptions
      </Link>

      <EntityHeader
        avatar={
          <span className="grid size-11 shrink-0 place-items-center rounded-round bg-sunken text-heading font-bold text-muted">
            {sub.businessName.slice(0, 1).toUpperCase()}
          </span>
        }
        title={sub.businessName}
        subtitle={
          <>
            <SubscriptionStatusPill status={sub.subscriptionStatus} />
            <span>{tier?.name ?? 'No plan'}</span>
          </>
        }
        meta={
          <Link
            to="/admin/businesses/$businessId"
            params={{ businessId }}
            className="link text-caption"
          >
            Open the business profile →
          </Link>
        }
        actions={
          <>
            {status === 'paused' ? (
              <Button variant="primary" onClick={() => setPending('resume')}>
                <Play className="size-4" aria-hidden="true" />
                Resume
              </Button>
            ) : status === 'active' || status === 'trial' || status === 'past_due' ? (
              <Button onClick={() => setPending('pause')}>
                <Pause className="size-4" aria-hidden="true" />
                Pause
              </Button>
            ) : null}
            {status === 'canceled' || status === 'expired' || status === 'deactivated' ? (
              <Button variant="primary" onClick={() => setPending('reactivate')}>
                <RotateCcw className="size-4" aria-hidden="true" />
                Reactivate
              </Button>
            ) : status === 'none' ? null : (
              <Button variant="danger" onClick={() => setPending('cancel')}>
                <XCircle className="size-4" aria-hidden="true" />
                Cancel
              </Button>
            )}
            {status !== 'deactivated' && status !== 'none' ? (
              <Button variant="danger" onClick={() => setPending('deactivate')}>
                <Ban className="size-4" aria-hidden="true" />
                Deactivate
              </Button>
            ) : null}
          </>
        }
      />

      <div className="grid gap-[1rem] lg:grid-cols-2">
        <SectionCard title="Overview">
          <DescriptionList>
            <DescriptionRow
              label="Business ID"
              value={<span className="font-mono text-caption">{sub.businessId}</span>}
            />
            <DescriptionRow label="Business" value={sub.businessName} />
            <DescriptionRow
              label="Plan"
              value={
                tier ? (
                  <span className="inline-flex items-center gap-[0.4rem]">
                    {tier.name}
                    <PlanLifecyclePill lifecycle={tier.lifecycle} />
                  </span>
                ) : (
                  '—'
                )
              }
            />
            <DescriptionRow
              label="Status"
              value={<SubscriptionStatusPill status={sub.subscriptionStatus} />}
            />
            <DescriptionRow label="Started" value={sub.startsAt ? formatDate(sub.startsAt) : '—'} />
            <DescriptionRow
              label="Ends"
              value={sub.endsAt ? formatDate(sub.endsAt) : 'No fixed end'}
            />
          </DescriptionList>
        </SectionCard>

        <SectionCard title="Plan and pricing">
          {tier ? (
            <DescriptionList>
              <DescriptionRow
                label="Plan key"
                value={<span className="font-mono text-caption">{tier.key}</span>}
              />
              <DescriptionRow label="Base price" value={money(Number(tier.price))} />
              <DescriptionRow label="Billing frequency" value={tier.billingInterval} />
              <DescriptionRow label="Currency" value="KES" />
              <DescriptionRow label="Modules on the plan" value={formatNumber(tier.moduleCount)} />
              <DescriptionRow
                label="Businesses on the plan"
                value={formatNumber(tier.businessCount)}
              />
              <DescriptionRow label="Default plan" value={tier.isDefault ? 'Yes' : 'No'} />
            </DescriptionList>
          ) : (
            <EmptyState
              title="No plan assigned"
              description="Assign a plan to grant module access."
            />
          )}
        </SectionCard>

        <SectionCard
          title="Change plan"
          description="Upgrade or downgrade. The change is immediate; entitlements follow."
        >
          <Field label="Target plan" htmlFor="sub-target-plan">
            <Select
              id="sub-target-plan"
              value={targetPlan}
              onChange={(event) => setTargetPlan(event.target.value)}
            >
              <option value="">Choose a plan…</option>
              {(tiers.data ?? [])
                .filter((entry) => entry.lifecycle === 'Active' && entry.key !== tier?.key)
                .map((entry) => (
                  <option key={entry.id} value={entry.key}>
                    {entry.name} — {money(Number(entry.price))} / {entry.billingInterval}
                  </option>
                ))}
            </Select>
          </Field>
          <Field label="Reason" htmlFor="sub-plan-reason" optional className="mt-[0.8rem]">
            <Input
              id="sub-plan-reason"
              value={planReason}
              onChange={(event) => setPlanReason(event.target.value)}
            />
          </Field>
          <Button
            variant="primary"
            className="mt-[0.8rem]"
            disabled={!targetPlan || changePlan.isPending}
            onClick={() =>
              changePlan.mutate(
                { planKey: targetPlan, reason: planReason.trim() || null },
                {
                  onSuccess: (result) => toast.success(result.message),
                  onError: (error) => toast.error(errorMessage(error)),
                },
              )
            }
          >
            {changePlan.isPending ? 'Applying…' : 'Apply plan change'}
          </Button>
        </SectionCard>

        <SectionCard title="Extend the period">
          <Field label="New end date" htmlFor="sub-extend-date">
            <Input
              id="sub-extend-date"
              type="date"
              value={extendDate}
              onChange={(event) => setExtendDate(event.target.value)}
            />
          </Field>
          <Field label="Reason" htmlFor="sub-extend-reason" optional className="mt-[0.8rem]">
            <Input
              id="sub-extend-reason"
              value={extendReason}
              onChange={(event) => setExtendReason(event.target.value)}
            />
          </Field>
          <Button
            className="mt-[0.8rem]"
            disabled={!extendDate || extend.isPending}
            onClick={() =>
              extend.mutate(
                {
                  endsAt: new Date(`${extendDate}T23:59:59Z`).toISOString(),
                  reason: extendReason.trim() || null,
                },
                {
                  onSuccess: (result) => toast.success(result.message),
                  onError: (error) => toast.error(errorMessage(error)),
                },
              )
            }
          >
            {extend.isPending ? 'Extending…' : 'Extend subscription'}
          </Button>
        </SectionCard>
      </div>

      <div className="mt-[1rem] grid gap-[1rem]">
        <SectionCard
          title="Modules"
          description="Every module and its effective entitlement. An administrator's grant is a business override and never rewrites the plan."
        >
          <ModuleEntitlementList
            modules={sub.effectiveModules}
            busyKey={busyModule}
            onSet={onToggleModule}
            onRemoveOverride={onRevertModule}
          />
        </SectionCard>

        <SectionCard
          title="Billing and payments"
          description="Only what the platform actually records."
        >
          <Alert tone="neutral">
            This deployment has no invoice or card-payment ledger for platform subscriptions. Plan
            changes and extensions are applied directly and recorded in the audit history below; no
            invoice, transaction, refund or payment-failure record is fabricated here.
          </Alert>
        </SectionCard>

        <SectionCard
          title="History"
          description="Plan changes, module assignments, pauses, cancellations and renewals."
        >
          <AuditTimeline
            entries={sub.auditHistory}
            emptyLabel="No subscription history recorded yet."
          />
        </SectionCard>
      </div>

      <ReasonDialog
        open={pending !== null}
        tone={pending === 'resume' || pending === 'reactivate' ? 'default' : 'danger'}
        title={`${
          pending === 'pause'
            ? 'Pause'
            : pending === 'resume'
              ? 'Resume'
              : pending === 'cancel'
                ? 'Cancel'
                : pending === 'reactivate'
                  ? 'Reactivate'
                  : 'Deactivate'
        } this subscription?`}
        description={
          pending === 'resume' || pending === 'reactivate'
            ? 'Access is restored immediately, subject to the plan’s modules.'
            : 'Module access is withheld. The subscription row and its history are retained, and the change is reversible.'
        }
        requireReason={pending === 'pause' || pending === 'cancel' || pending === 'deactivate'}
        busy={action.isPending}
        onConfirm={confirmAction}
        onCancel={() => setPending(null)}
      />
    </div>
  )
}
