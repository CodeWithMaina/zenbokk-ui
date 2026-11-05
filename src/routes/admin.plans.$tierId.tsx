import { createFileRoute, Link, useParams } from '@tanstack/react-router'
import { Archive, ArchiveRestore, CheckCircle2, Copy, PowerOff } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { PlanLifecyclePill } from '../components/admin/badges'
import { Alert } from '../components/ui/alert'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { SectionCard } from '../components/ui/card'
import { DescriptionList, DescriptionRow } from '../components/ui/description-list'
import { EmptyState } from '../components/ui/empty-state'
import { Field, Input, Select, Textarea } from '../components/ui/field'
import { EntityHeader } from '../components/ui/page-header'
import { PaginationBar } from '../components/ui/pagination-bar'
import { Skeleton } from '../components/ui/skeleton'
import {
  useAdminTier,
  useAdminTierBusinesses,
  useDuplicateTier,
  useSetTierModules,
  useTierLifecycle,
  useUpdateTier,
} from '../lib/admin/use-admin'
import { errorMessage } from '../lib/api/client'
import { formatDate, formatNumber, money, pluralize } from '../lib/format'

export const Route = createFileRoute('/admin/plans/$tierId')({
  component: AdminPlanDetailPage,
})

const INTERVALS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
] as const

/** One plan: its metadata, module set, lifecycle and subscribers. */
function AdminPlanDetailPage() {
  const { tierId } = useParams({ from: '/admin/plans/$tierId' })
  const tier = useAdminTier(tierId)
  const updateTier = useUpdateTier(tierId)
  const lifecycle = useTierLifecycle(tierId)
  const setModules = useSetTierModules(tierId)
  const duplicateTier = useDuplicateTier()

  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '0',
    billingInterval: 'monthly',
    displayOrder: '',
  })
  const [selectedModules, setSelectedModules] = useState<string[]>([])
  const [businessPage, setBusinessPage] = useState(1)
  const [businessSearch, setBusinessSearch] = useState('')

  const businesses = useAdminTierBusinesses(tierId, {
    page: businessPage,
    pageSize: 10,
    search: businessSearch.trim() || null,
  })

  // Seed the editor from the loaded plan; a refetch after a write re-seeds it.
  useEffect(() => {
    if (!tier.data) return
    setForm({
      name: tier.data.name,
      description: tier.data.description ?? '',
      price: String(tier.data.price),
      billingInterval: tier.data.billingInterval,
      displayOrder: tier.data.displayOrder != null ? String(tier.data.displayOrder) : '',
    })
    setSelectedModules(
      tier.data.modules.filter((module) => module.included).map((module) => module.key),
    )
  }, [tier.data])

  if (tier.isError) {
    return <Alert tone="danger">{errorMessage(tier.error, 'We could not load this plan.')}</Alert>
  }
  if (tier.isPending || !tier.data) {
    return (
      <div className="space-y-[0.8rem]" aria-busy="true">
        <Skeleton className="h-16 rounded-card" />
        <Skeleton className="h-40 rounded-card" />
      </div>
    )
  }

  const plan = tier.data

  const saveMetadata = () =>
    updateTier.mutate(
      {
        name: form.name.trim(),
        description: form.description.trim() || null,
        price: Number(form.price) || 0,
        billingInterval: form.billingInterval,
        displayOrder: form.displayOrder.trim() ? Number(form.displayOrder) : null,
      },
      {
        onSuccess: () => toast.success('Plan updated.'),
        onError: (error) => toast.error(errorMessage(error)),
      },
    )

  const saveModules = () =>
    setModules.mutate(selectedModules, {
      onSuccess: () => toast.success('Plan modules saved.'),
      onError: (error) => toast.error(errorMessage(error)),
    })

  const transition = (action: 'publish' | 'deactivate' | 'archive' | 'unarchive') =>
    lifecycle.mutate(action, {
      onSuccess: () => toast.success(`Plan updated (${action}).`),
      onError: (error) => toast.error(errorMessage(error)),
    })

  const toggleModule = (key: string) =>
    setSelectedModules((current) =>
      current.includes(key) ? current.filter((entry) => entry !== key) : [...current, key],
    )

  return (
    <div>
      <Link to="/admin/plans" className="link mb-[0.4rem] inline-block font-medium">
        ← All plans
      </Link>

      <EntityHeader
        avatar={
          <span className="grid size-11 shrink-0 place-items-center rounded-round bg-sunken text-heading font-bold text-muted">
            {plan.name.slice(0, 1).toUpperCase()}
          </span>
        }
        title={plan.name}
        subtitle={
          <>
            <PlanLifecyclePill lifecycle={plan.lifecycle} />
            <span className="font-mono text-caption">{plan.key}</span>
            {plan.isDefault ? <Badge tone="info">Default</Badge> : null}
          </>
        }
        meta={
          <>
            <span>
              {money(Number(plan.price))} / {plan.billingInterval}
            </span>
            <span>{pluralize(plan.moduleCount, 'module')}</span>
            <span>{pluralize(plan.businessCount, 'business', 'businesses')}</span>
          </>
        }
        actions={
          <>
            {plan.lifecycle === 'Draft' || plan.lifecycle === 'Inactive' ? (
              <Button
                variant="primary"
                disabled={lifecycle.isPending}
                onClick={() => transition('publish')}
              >
                <CheckCircle2 className="size-4" aria-hidden="true" />
                Publish
              </Button>
            ) : null}
            {plan.lifecycle === 'Draft' || plan.lifecycle === 'Active' ? (
              <Button disabled={lifecycle.isPending} onClick={() => transition('deactivate')}>
                <PowerOff className="size-4" aria-hidden="true" />
                Deactivate
              </Button>
            ) : null}
            {plan.lifecycle === 'Draft' || plan.lifecycle === 'Inactive' ? (
              <Button
                variant="danger"
                disabled={lifecycle.isPending}
                onClick={() => transition('archive')}
              >
                <Archive className="size-4" aria-hidden="true" />
                Archive
              </Button>
            ) : null}
            {plan.lifecycle === 'Archived' ? (
              <Button
                variant="primary"
                disabled={lifecycle.isPending}
                onClick={() => transition('unarchive')}
              >
                <ArchiveRestore className="size-4" aria-hidden="true" />
                Restore
              </Button>
            ) : null}
            <Button
              disabled={duplicateTier.isPending}
              onClick={() =>
                duplicateTier.mutate(
                  { tierId },
                  {
                    onSuccess: (copy) => toast.success(`Duplicated as '${copy.name}'.`),
                    onError: (error) => toast.error(errorMessage(error)),
                  },
                )
              }
            >
              <Copy className="size-4" aria-hidden="true" />
              Duplicate
            </Button>
          </>
        }
      />

      <div className="grid gap-[1rem] lg:grid-cols-2">
        <SectionCard
          title="Plan details"
          description={
            plan.lifecycle === 'Active'
              ? 'Published plans have a read-only module set; metadata stays editable.'
              : 'Draft and inactive plans are fully editable.'
          }
          action={
            <Button variant="primary" onClick={saveMetadata} disabled={updateTier.isPending}>
              {updateTier.isPending ? 'Saving…' : 'Save'}
            </Button>
          }
        >
          <div className="grid grid-cols-2 gap-x-[0.8rem] gap-y-[1.1rem] max-sm:grid-cols-1">
            <Field label="Display name" htmlFor="tier-name">
              <Input
                id="tier-name"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
            </Field>
            <Field label="Price (KES)" htmlFor="tier-price">
              <Input
                id="tier-price"
                type="number"
                min="0"
                value={form.price}
                onChange={(event) => setForm({ ...form, price: event.target.value })}
              />
            </Field>
            <Field label="Billing interval" htmlFor="tier-interval">
              <Select
                id="tier-interval"
                value={form.billingInterval}
                onChange={(event) => setForm({ ...form, billingInterval: event.target.value })}
              >
                {INTERVALS.map((interval) => (
                  <option key={interval.value} value={interval.value}>
                    {interval.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Display order" htmlFor="tier-order" optional>
              <Input
                id="tier-order"
                type="number"
                value={form.displayOrder}
                onChange={(event) => setForm({ ...form, displayOrder: event.target.value })}
              />
            </Field>
            <Field label="Description" htmlFor="tier-description" className="col-span-full">
              <Textarea
                id="tier-description"
                rows={2}
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
              />
            </Field>
          </div>
        </SectionCard>

        <SectionCard title="Lifecycle">
          <DescriptionList>
            <DescriptionRow label="State" value={<PlanLifecyclePill lifecycle={plan.lifecycle} />} />
            <DescriptionRow
              label="Published"
              value={plan.publishedAt ? formatDate(plan.publishedAt) : 'Never'}
            />
            <DescriptionRow
              label="Deactivated"
              value={plan.deactivatedAt ? formatDate(plan.deactivatedAt) : '—'}
            />
            <DescriptionRow
              label="Archived"
              value={plan.archivedAt ? formatDate(plan.archivedAt) : '—'}
            />
            <DescriptionRow label="Created" value={formatDate(plan.createdAt)} />
          </DescriptionList>
          <p className="mt-[0.8rem] text-caption text-muted">
            A plan must include at least one Core module to be published. Archiving requires that no
            business is actively subscribed.
          </p>
        </SectionCard>
      </div>

      <SectionCard
        title="Modules"
        description="The module set this plan grants. Core modules are always available."
        className="mt-[1rem]"
        action={
          <Button variant="primary" onClick={saveModules} disabled={setModules.isPending}>
            {setModules.isPending ? 'Saving…' : 'Save module set'}
          </Button>
        }
      >
        <div className="grid gap-[0.4rem]">
          {plan.modules.map((module) => (
            <label
              key={module.key}
              className="flex items-start gap-[0.6rem] rounded-md border border-line px-[0.8rem] py-[0.6rem]"
            >
              <input
                type="checkbox"
                className="mt-[0.2rem]"
                checked={selectedModules.includes(module.key)}
                onChange={() => toggleModule(module.key)}
              />
              <span className="min-w-0">
                <span className="block font-medium">
                  {module.name}{' '}
                  <span className="font-mono text-caption text-muted">{module.key}</span>
                  {module.isCore ? (
                    <Badge tone="info" className="ml-[0.4rem]">
                      Core
                    </Badge>
                  ) : null}
                </span>
                {module.description ? (
                  <span className="block text-caption text-muted">{module.description}</span>
                ) : null}
                {module.dependencies.length > 0 ? (
                  <span className="block text-caption text-subtle">
                    Needs: {module.dependencies.join(', ')}
                  </span>
                ) : null}
              </span>
            </label>
          ))}
        </div>
        <p className="mt-[0.6rem] text-caption text-muted">
          {pluralize(selectedModules.length, 'module')} selected.
        </p>
      </SectionCard>

      <SectionCard
        title="Subscribed businesses"
        description="Every business currently on this plan."
        className="mt-[1rem]"
        action={
          <Input
            aria-label="Search subscribed businesses"
            placeholder="Search…"
            value={businessSearch}
            onChange={(event) => {
              setBusinessSearch(event.target.value)
              setBusinessPage(1)
            }}
            className="w-full sm:w-[14rem]"
          />
        }
      >
        {businesses.isError ? (
          <Alert tone="danger">{errorMessage(businesses.error, 'The subscribers did not load.')}</Alert>
        ) : businesses.isPending ? (
          <Skeleton className="h-32 rounded-card" />
        ) : (businesses.data?.items ?? []).length === 0 ? (
          <EmptyState
            title="No businesses on this plan"
            description="Businesses appear here once a subscription is assigned."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">Business</th>
                    <th scope="col">Status</th>
                    <th scope="col">Started</th>
                    <th scope="col">Ends</th>
                    <th scope="col" className="text-right">
                      Modules
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(businesses.data?.items ?? []).map((row) => (
                    <tr key={row.id}>
                      <td>
                        <Link
                          to="/admin/businesses/$businessId"
                          params={{ businessId: row.id }}
                          className="font-semibold"
                        >
                          {row.name}
                        </Link>
                        <span className="block text-caption text-muted">
                          {row.category ?? ''}
                          {row.location ? ` · ${row.location}` : ''}
                        </span>
                      </td>
                      <td>
                        <Badge tone="neutral">{row.status}</Badge>
                      </td>
                      <td className="text-meta text-muted">
                        {row.startsAt ? formatDate(row.startsAt) : '—'}
                      </td>
                      <td className="text-meta text-muted">
                        {row.endsAt ? formatDate(row.endsAt) : 'No fixed end'}
                      </td>
                      <td className="text-right tabular">{formatNumber(row.moduleCount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <PaginationBar
              className="mt-[1rem]"
              page={businesses.data?.page ?? businessPage}
              pageCount={businesses.data?.totalPages ?? 1}
              onPageChange={setBusinessPage}
            />
          </>
        )}
      </SectionCard>
    </div>
  )
}
