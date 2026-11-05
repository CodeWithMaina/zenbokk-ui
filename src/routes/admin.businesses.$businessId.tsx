import { createFileRoute, Link, useParams } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import {
  BusinessStatusPill,
  MemberStatusPill,
  SubscriptionStatusPill,
} from '../components/admin/badges'
import { ModuleEntitlementList } from '../components/admin/module-entitlement-list'
import { AuditTimeline } from '../components/admin/audit-timeline'
import { ReasonDialog } from '../components/admin/reason-dialog'
import { Alert } from '../components/ui/alert'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { SectionCard } from '../components/ui/card'
import { DescriptionList, DescriptionRow } from '../components/ui/description-list'
import { DetailTabs } from '../components/ui/detail-tabs'
import { EmptyState } from '../components/ui/empty-state'
import { Field, Input, Select, Textarea } from '../components/ui/field'
import { EntityHeader } from '../components/ui/page-header'
import { PaginationBar } from '../components/ui/pagination-bar'
import { Skeleton } from '../components/ui/skeleton'
import {
  useAdminBusinessAudit,
  useAdminBusinessDetail,
  useAdminBusinessUsers,
  useAdminSubscriptionDetail,
  useChangePlan,
  useExtendSubscription,
  useRemoveBusinessModuleOverride,
  useSetBusinessModule,
  useSetBusinessStatus,
  useAdminTiers,
  useUpdateAdminBusiness,
} from '../lib/admin/use-admin'
import { errorMessage } from '../lib/api/client'
import { formatDate, formatNumber, money, pluralize } from '../lib/format'
import type { AdminBusinessDetail } from '../lib/api/types'

export const Route = createFileRoute('/admin/businesses/$businessId')({
  component: AdminBusinessDetailPage,
})

type Tab = 'overview' | 'profile' | 'members' | 'subscription' | 'modules' | 'activity'

const TABS: { value: Tab; label: string }[] = [
  { value: 'overview', label: 'Overview' },
  { value: 'profile', label: 'Profile' },
  { value: 'members', label: 'Members' },
  { value: 'subscription', label: 'Subscription' },
  { value: 'modules', label: 'Modules' },
  { value: 'activity', label: 'Activity' },
]

/** One business: profile, members, subscription, entitlements and history. */
function AdminBusinessDetailPage() {
  const { businessId } = useParams({ from: '/admin/businesses/$businessId' })
  const [tab, setTab] = useState<Tab>('overview')
  const [pendingStatus, setPendingStatus] = useState<'suspended' | 'active' | 'deactivated' | null>(
    null,
  )
  const [busyModule, setBusyModule] = useState<string | null>(null)

  const detail = useAdminBusinessDetail(businessId)
  const subscription = useAdminSubscriptionDetail(businessId)
  const setStatus = useSetBusinessStatus(businessId)
  const setModule = useSetBusinessModule(businessId)
  const removeOverride = useRemoveBusinessModuleOverride(businessId)
  const changePlan = useChangePlan(businessId)
  const extend = useExtendSubscription(businessId)

  const business = detail.data

  if (detail.isError) {
    return (
      <Alert tone="danger">{errorMessage(detail.error, 'We could not load this business.')}</Alert>
    )
  }

  if (detail.isPending || !business) {
    return (
      <div className="space-y-[0.8rem]" aria-busy="true">
        <Skeleton className="h-16 rounded-card" />
        <Skeleton className="h-40 rounded-card" />
      </div>
    )
  }

  const confirmStatus = (reason: string) => {
    if (!pendingStatus) return
    setStatus.mutate(
      { status: pendingStatus, reason },
      {
        onSuccess: () => {
          toast.success(
            pendingStatus === 'active'
              ? 'Business reactivated.'
              : pendingStatus === 'suspended'
                ? 'Business suspended.'
                : 'Business deactivated.',
          )
          setPendingStatus(null)
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
      <Link to="/admin/businesses" className="link mb-[0.4rem] inline-block font-medium">
        ← All businesses
      </Link>

      <EntityHeader
        avatar={
          <span className="grid size-11 shrink-0 place-items-center rounded-round bg-sunken text-heading font-bold text-muted">
            {business.name.slice(0, 1).toUpperCase()}
          </span>
        }
        title={business.name}
        subtitle={
          <>
            <BusinessStatusPill status={business.status} />
            <span>
              {business.category}
              {business.location ? ` · ${business.location}` : ''}
            </span>
          </>
        }
        meta={
          <>
            <span className="font-mono text-caption">{business.id}</span>
            {business.tenantUrl ? (
              <a href={business.tenantUrl} target="_blank" rel="noreferrer" className="link">
                {business.slug}
              </a>
            ) : (
              <Badge tone="neutral">URL pending</Badge>
            )}
          </>
        }
        actions={
          <>
            {business.status === 'active' ? (
              <Button onClick={() => setPendingStatus('suspended')}>Suspend</Button>
            ) : (
              <Button variant="primary" onClick={() => setPendingStatus('active')}>
                Reactivate
              </Button>
            )}
            {business.status !== 'deactivated' ? (
              <Button variant="danger" onClick={() => setPendingStatus('deactivated')}>
                Deactivate
              </Button>
            ) : null}
          </>
        }
      />

      {business.suspendedReason ? (
        <Alert tone="warning" className="mb-[1rem]">
          Suspended {business.suspendedAt ? formatDate(business.suspendedAt) : ''} —{' '}
          {business.suspendedReason}
        </Alert>
      ) : null}

      <DetailTabs items={TABS} value={tab} onValueChange={setTab} label="Business sections">
        {tab === 'overview' ? <OverviewTab business={business} /> : null}
        {tab === 'profile' ? <ProfileTab business={business} /> : null}
        {tab === 'members' ? <MembersTab businessId={businessId} /> : null}
        {tab === 'subscription' ? (
          <SubscriptionTab
            business={business}
            planChangePending={changePlan.isPending}
            extendPending={extend.isPending}
            onChangePlan={(planKey, reason) =>
              changePlan.mutate(
                { planKey, reason },
                {
                  onSuccess: (result) => toast.success(result.message),
                  onError: (error) => toast.error(errorMessage(error)),
                },
              )
            }
            onExtend={(endsAt, reason) =>
              extend.mutate(
                { endsAt, reason },
                {
                  onSuccess: (result) => toast.success(result.message),
                  onError: (error) => toast.error(errorMessage(error)),
                },
              )
            }
          />
        ) : null}
        {tab === 'modules' ? (
          subscription.isPending ? (
            <Skeleton className="h-40 rounded-card" />
          ) : (
            <ModuleEntitlementList
              modules={subscription.data?.effectiveModules ?? []}
              busyKey={busyModule}
              onSet={onToggleModule}
              onRemoveOverride={onRevertModule}
            />
          )
        ) : null}
        {tab === 'activity' ? <ActivityTab businessId={businessId} /> : null}
      </DetailTabs>

      <ReasonDialog
        open={pendingStatus !== null}
        tone={pendingStatus === 'active' ? 'default' : 'danger'}
        title={
          pendingStatus === 'active'
            ? 'Reactivate this business?'
            : pendingStatus === 'suspended'
              ? 'Suspend this business?'
              : 'Deactivate this business?'
        }
        description={
          pendingStatus === 'active'
            ? 'Access is restored immediately, subject to the subscription and module entitlements.'
            : 'No data is deleted. The business can be reactivated at any time.'
        }
        requireReason={pendingStatus !== 'active'}
        busy={setStatus.isPending}
        onConfirm={confirmStatus}
        onCancel={() => setPendingStatus(null)}
      />
    </div>
  )
}

/** Identity, contact details, subscription and roll-up counters. */
function OverviewTab({ business }: { business: AdminBusinessDetail }) {
  const sub = business.subscription

  return (
    <div className="grid gap-[1rem] lg:grid-cols-2">
      <SectionCard title="Identity" description="Registered profile and address.">
        <DescriptionList>
          <DescriptionRow
            label="Business ID"
            value={<span className="font-mono text-caption">{business.id}</span>}
          />
          <DescriptionRow label="Category" value={business.category} />
          <DescriptionRow label="Location" value={business.location} />
          <DescriptionRow label="Description" value={business.description ?? '—'} align="start" />
          <DescriptionRow
            label="Storefront address"
            value={
              business.tenantUrl ? (
                <a href={business.tenantUrl} target="_blank" rel="noreferrer" className="link">
                  {business.slug}
                </a>
              ) : (
                'Not provisioned'
              )
            }
          />
          <DescriptionRow label="Registered" value={formatDate(business.createdAt)} />
          <DescriptionRow
            label="Last activity"
            value={business.lastActivityAt ? formatDate(business.lastActivityAt) : 'No activity yet'}
          />
        </DescriptionList>
      </SectionCard>

      <SectionCard title="Owner and contact">
        <DescriptionList>
          <DescriptionRow label="Owner" value={business.owner.fullName} />
          <DescriptionRow label="Owner email" value={business.owner.email} />
          <DescriptionRow label="Owner phone" value={business.owner.phoneNumber ?? '—'} />
          <DescriptionRow label="Business email" value={business.email ?? '—'} />
          <DescriptionRow label="Business phone" value={business.phoneNumber ?? '—'} />
          <DescriptionRow label="M-Pesa number" value={business.mpesaNumber ?? '—'} />
          <DescriptionRow label="Time zone" value={business.timeZoneId ?? '—'} />
        </DescriptionList>
      </SectionCard>

      <SectionCard
        title="Subscription"
        description="The plan that gates this business's modules."
        action={
          <Link to="/admin/subscriptions/$businessId" params={{ businessId: business.id }} className="link font-semibold">
            Manage
          </Link>
        }
      >
        {sub ? (
          <DescriptionList>
            <DescriptionRow label="Plan" value={sub.planName ?? '—'} />
            <DescriptionRow label="Status" value={<SubscriptionStatusPill status={sub.status} />} />
            <DescriptionRow label="Billing interval" value={sub.billingInterval ?? '—'} />
            <DescriptionRow
              label="Price"
              value={sub.price != null ? money(Number(sub.price)) : '—'}
            />
            <DescriptionRow
              label="Current period"
              value={
                sub.currentPeriodStartsAt ? formatDate(sub.currentPeriodStartsAt) : (sub.startsAt ? formatDate(sub.startsAt) : '—')
              }
            />
            <DescriptionRow
              label="Ends"
              value={sub.endsAt ? formatDate(sub.endsAt) : 'No fixed end'}
            />
            <DescriptionRow label="Trial" value={sub.isTrial ? 'Yes' : 'No'} />
            {sub.pausedAt ? (
              <DescriptionRow
                label="Paused"
                value={sub.pauseReason ?? formatDate(sub.pausedAt)}
              />
            ) : null}
          </DescriptionList>
        ) : (
          <EmptyState title="No subscription" description="This business has never subscribed." />
        )}
      </SectionCard>

      <SectionCard title="Activity counters">
        <DescriptionList>
          <DescriptionRow label="Staff" value={formatNumber(business.totalStaff)} />
          <DescriptionRow label="Customers" value={formatNumber(business.totalCustomers)} />
          <DescriptionRow label="Stamps issued" value={formatNumber(business.totalStamps)} />
          <DescriptionRow label="Redemptions" value={formatNumber(business.totalRedemptions)} />
          <DescriptionRow label="Loyalty programs" value={formatNumber(business.programCount)} />
        </DescriptionList>
      </SectionCard>
    </div>
  )
}

/**
 * The supported business profile fields. Every field is optional on the wire:
 * an untouched input sends `null` and the server leaves the stored value alone.
 */
function ProfileTab({ business }: { business: AdminBusinessDetail }) {
  const update = useUpdateAdminBusiness(business.id)
  const [form, setForm] = useState({
    name: business.name,
    category: business.category,
    location: business.location,
    description: business.description ?? '',
    email: business.email ?? '',
    phoneNumber: business.phoneNumber ?? '',
    mpesaNumber: business.mpesaNumber ?? '',
    logoUrl: business.logoUrl ?? '',
    timeZoneId: business.timeZoneId ?? '',
    reason: '',
  })

  const set = (key: keyof typeof form) => (value: string) =>
    setForm((current) => ({ ...current, [key]: value }))

  const submit = () => {
    update.mutate(
      {
        name: form.name,
        category: form.category,
        location: form.location,
        description: form.description,
        email: form.email,
        phoneNumber: form.phoneNumber,
        mpesaNumber: form.mpesaNumber,
        logoUrl: form.logoUrl,
        timeZoneId: form.timeZoneId,
        reason: form.reason.trim() || null,
      },
      {
        onSuccess: () => toast.success('Business profile saved.'),
        onError: (error) => toast.error(errorMessage(error)),
      },
    )
  }

  return (
    <SectionCard
      title="Business profile"
      description="Everything an administrator may edit. Changes are audited."
      action={
        <Button variant="primary" onClick={submit} disabled={update.isPending}>
          {update.isPending ? 'Saving…' : 'Save changes'}
        </Button>
      }
    >
      <div className="grid grid-cols-2 gap-x-[0.8rem] gap-y-[1.1rem] max-sm:grid-cols-1">
        <Field label="Business name" htmlFor="biz-name">
          <Input id="biz-name" value={form.name} onChange={(e) => set('name')(e.target.value)} />
        </Field>
        <Field label="Category" htmlFor="biz-category">
          <Input
            id="biz-category"
            value={form.category}
            onChange={(e) => set('category')(e.target.value)}
          />
        </Field>
        <Field label="Location" htmlFor="biz-location">
          <Input
            id="biz-location"
            value={form.location}
            onChange={(e) => set('location')(e.target.value)}
          />
        </Field>
        <Field label="Time zone" htmlFor="biz-timezone" hint="IANA id, e.g. Africa/Nairobi">
          <Input
            id="biz-timezone"
            value={form.timeZoneId}
            onChange={(e) => set('timeZoneId')(e.target.value)}
          />
        </Field>
        <Field label="Business email" htmlFor="biz-email">
          <Input
            id="biz-email"
            type="email"
            value={form.email}
            onChange={(e) => set('email')(e.target.value)}
          />
        </Field>
        <Field label="Business phone" htmlFor="biz-phone">
          <Input
            id="biz-phone"
            value={form.phoneNumber}
            onChange={(e) => set('phoneNumber')(e.target.value)}
          />
        </Field>
        <Field label="M-Pesa number" htmlFor="biz-mpesa">
          <Input
            id="biz-mpesa"
            value={form.mpesaNumber}
            onChange={(e) => set('mpesaNumber')(e.target.value)}
          />
        </Field>
        <Field label="Logo URL" htmlFor="biz-logo" optional>
          <Input
            id="biz-logo"
            value={form.logoUrl}
            onChange={(e) => set('logoUrl')(e.target.value)}
          />
        </Field>
        <Field label="Description" htmlFor="biz-description" className="col-span-full">
          <Textarea
            id="biz-description"
            rows={3}
            value={form.description}
            onChange={(e) => set('description')(e.target.value)}
          />
        </Field>
        <Field
          label="Reason for this change"
          htmlFor="biz-reason"
          optional
          hint="Recorded against the change in the audit history."
          className="col-span-full"
        >
          <Input
            id="biz-reason"
            value={form.reason}
            onChange={(e) => set('reason')(e.target.value)}
          />
        </Field>
      </div>
    </SectionCard>
  )
}

/** Owner, staff and customers attached to this business. */
function MembersTab({ businessId }: { businessId: string }) {
  const [role, setRole] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  const members = useAdminBusinessUsers(businessId, {
    role: role || null,
    page,
    pageSize,
  })

  const rows = members.data?.items ?? []

  return (
    <SectionCard
      title="Members"
      description="Owner, staff and customers. Platform administration never changes tenant roles."
      action={
        <Select
          aria-label="Filter members by role"
          value={role}
          onChange={(event) => {
            setRole(event.target.value)
            setPage(1)
          }}
        >
          <option value="">All roles</option>
          <option value="Owner">Owner</option>
          <option value="Staff">Staff</option>
          <option value="Customer">Customer</option>
        </Select>
      }
    >
      {members.isError ? (
        <Alert tone="danger">{errorMessage(members.error, 'The member list did not load.')}</Alert>
      ) : members.isPending ? (
        <Skeleton className="h-32 rounded-card" />
      ) : rows.length === 0 ? (
        <EmptyState title="No members" description="Nobody is attached to this business yet." />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Person</th>
                  <th scope="col">Role</th>
                  <th scope="col">Status</th>
                  <th scope="col">Joined</th>
                  <th scope="col">Verified</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((member) => (
                  <tr key={member.userId}>
                    <td>
                      <span className="block font-semibold">{member.fullName}</span>
                      <span className="block text-caption text-muted">{member.email}</span>
                      {member.phoneNumber ? (
                        <span className="block text-caption text-subtle">{member.phoneNumber}</span>
                      ) : null}
                    </td>
                    <td>
                      <Badge tone="neutral">{member.role}</Badge>
                    </td>
                    <td>
                      <MemberStatusPill status={member.status} />
                    </td>
                    <td className="text-meta text-muted">{formatDate(member.joinedAt)}</td>
                    <td>
                      <Badge tone={member.isVerified ? 'success' : 'warning'}>
                        {member.isVerified ? 'Verified' : 'Unverified'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <PaginationBar
            className="mt-[1rem]"
            page={members.data?.page ?? page}
            pageCount={members.data?.totalPages ?? 1}
            onPageChange={setPage}
            pageSize={pageSize}
            onPageSizeChange={(size) => {
              setPageSize(size)
              setPage(1)
            }}
          />
        </>
      )}
    </SectionCard>
  )
}

/** The subscription, its plan controls and the extend/upgrade workflows. */
function SubscriptionTab({
  business,
  planChangePending,
  extendPending,
  onChangePlan,
  onExtend,
}: {
  business: AdminBusinessDetail
  planChangePending: boolean
  extendPending: boolean
  onChangePlan: (planKey: string, reason: string | null) => void
  onExtend: (endsAt: string, reason: string | null) => void
}) {
  const tiers = useAdminTiers()
  const sub = business.subscription
  const [targetPlan, setTargetPlan] = useState('')
  const [planReason, setPlanReason] = useState('')
  const [extendDate, setExtendDate] = useState('')
  const [extendReason, setExtendReason] = useState('')

  const currentPlan = (tiers.data ?? []).find((tier) => tier.key === sub?.planKey)
  const target = (tiers.data ?? []).find((tier) => tier.key === targetPlan)
  const targetIsUpgrade =
    target && currentPlan ? Number(target.price) > Number(currentPlan.price) : null

  return (
    <div className="grid gap-[1rem] lg:grid-cols-2">
      <SectionCard title="Current subscription">
        {sub ? (
          <DescriptionList>
            <DescriptionRow label="Plan" value={sub.planName ?? '—'} />
            <DescriptionRow label="Status" value={<SubscriptionStatusPill status={sub.status} />} />
            <DescriptionRow label="Billing interval" value={sub.billingInterval ?? '—'} />
            <DescriptionRow
              label="Price"
              value={sub.price != null ? money(Number(sub.price)) : '—'}
            />
            <DescriptionRow
              label="Period started"
              value={sub.currentPeriodStartsAt ? formatDate(sub.currentPeriodStartsAt) : '—'}
            />
            <DescriptionRow
              label="Ends"
              value={sub.endsAt ? formatDate(sub.endsAt) : 'No fixed end'}
            />
            <DescriptionRow
              label="Days remaining"
              value={sub.daysUntilExpiry != null ? String(sub.daysUntilExpiry) : '—'}
            />
            <DescriptionRow label="Trial" value={sub.isTrial ? 'Yes' : 'No'} />
          </DescriptionList>
        ) : (
          <EmptyState title="No subscription" description="Assign a plan to grant module access." />
        )}
        <div className="mt-[1rem]">
          <Link
            to="/admin/subscriptions/$businessId"
            params={{ businessId: business.id }}
            className="link font-semibold"
          >
            Open the full subscription console →
          </Link>
        </div>
      </SectionCard>

      <SectionCard
        title="Change plan"
        description="Upgrade or downgrade. The change is immediate; module entitlements follow."
      >
        <Field label="Target plan" htmlFor="target-plan">
          <Select
            id="target-plan"
            value={targetPlan}
            onChange={(event) => setTargetPlan(event.target.value)}
          >
            <option value="">Choose a plan…</option>
            {(tiers.data ?? [])
              .filter((tier) => tier.lifecycle === 'Active' && tier.key !== sub?.planKey)
              .map((tier) => (
                <option key={tier.id} value={tier.key}>
                  {tier.name} — {money(Number(tier.price))} / {tier.billingInterval}
                </option>
              ))}
          </Select>
        </Field>

        {currentPlan && target ? (
          <p className="mt-[0.6rem] text-meta text-muted">
            {targetIsUpgrade === null
              ? null
              : targetIsUpgrade
                ? 'This is an upgrade. '
                : 'This is a downgrade — review the modules that will be withdrawn. '}
            {pluralize(target.moduleCount, 'module')} on the target plan (currently{' '}
            {pluralize(currentPlan.moduleCount, 'module')}).
          </p>
        ) : null}

        <Field label="Reason" htmlFor="plan-reason" optional className="mt-[0.8rem]">
          <Input
            id="plan-reason"
            value={planReason}
            onChange={(event) => setPlanReason(event.target.value)}
            placeholder="e.g. Owner requested a downgrade"
          />
        </Field>

        <Button
          variant="primary"
          className="mt-[0.8rem]"
          disabled={!targetPlan || planChangePending}
          onClick={() => onChangePlan(targetPlan, planReason.trim() || null)}
        >
          {planChangePending ? 'Applying…' : 'Apply plan change'}
        </Button>
      </SectionCard>

      <SectionCard
        title="Extend the period"
        description="Adds time to the current period. Extending a lapsed subscription reactivates it."
      >
        <Field label="New end date" htmlFor="extend-date">
          <Input
            id="extend-date"
            type="date"
            value={extendDate}
            onChange={(event) => setExtendDate(event.target.value)}
          />
        </Field>
        <Field label="Reason" htmlFor="extend-reason" optional className="mt-[0.8rem]">
          <Input
            id="extend-reason"
            value={extendReason}
            onChange={(event) => setExtendReason(event.target.value)}
            placeholder="e.g. Goodwill extension"
          />
        </Field>
        <Button
          className="mt-[0.8rem]"
          disabled={!extendDate || extendPending}
          onClick={() =>
            onExtend(
              new Date(`${extendDate}T23:59:59Z`).toISOString(),
              extendReason.trim() || null,
            )
          }
        >
          {extendPending ? 'Extending…' : 'Extend subscription'}
        </Button>
      </SectionCard>
    </div>
  )
}

/** The business's administrative audit history. */
function ActivityTab({ businessId }: { businessId: string }) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const audit = useAdminBusinessAudit(businessId, { page, pageSize })

  return (
    <SectionCard
      title="Activity and audit history"
      description="Every administrative change, newest first."
    >
      {audit.isError ? (
        <Alert tone="danger">{errorMessage(audit.error, 'The audit history did not load.')}</Alert>
      ) : audit.isPending ? (
        <Skeleton className="h-32 rounded-card" />
      ) : (
        <>
          <AuditTimeline entries={audit.data?.items ?? []} />
          {(audit.data?.totalPages ?? 1) > 1 ? (
            <PaginationBar
              className="mt-[1rem]"
              page={audit.data?.page ?? page}
              pageCount={audit.data?.totalPages ?? 1}
              onPageChange={setPage}
              pageSize={pageSize}
              onPageSizeChange={(size) => {
                setPageSize(size)
                setPage(1)
              }}
            />
          ) : null}
        </>
      )}
    </SectionCard>
  )
}
