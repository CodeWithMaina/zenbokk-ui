import { createFileRoute, Link } from '@tanstack/react-router'
import { Copy, Layers, Plus } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { PlanLifecyclePill } from '../components/admin/badges'
import { Alert } from '../components/ui/alert'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card, SectionCard } from '../components/ui/card'
import { Drawer } from '../components/ui/drawer'
import { EmptyState } from '../components/ui/empty-state'
import { Field, Input, Select, Textarea } from '../components/ui/field'
import { PageHeader } from '../components/ui/page-header'
import { Skeleton } from '../components/ui/skeleton'
import { Switch } from '../components/ui/switch'
import {
  useAdminModuleCatalog,
  useAdminTiers,
  useCreateTier,
  useDuplicateTier,
} from '../lib/admin/use-admin'
import { errorMessage } from '../lib/api/client'
import { formatDate, formatNumber, money, pluralize } from '../lib/format'

export const Route = createFileRoute('/admin/plans')({
  component: AdminPlans,
})

const INTERVALS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
] as const

/** The subscription plan catalogue. */
function AdminPlans() {
  const tiers = useAdminTiers()
  const catalog = useAdminModuleCatalog()
  const createTier = useCreateTier()
  const duplicateTier = useDuplicateTier()

  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({
    key: '',
    name: '',
    description: '',
    price: '0',
    billingInterval: 'monthly',
    displayOrder: '',
    isDefault: false,
    moduleKeys: [] as string[],
  })

  const rows = tiers.data ?? []

  const resetForm = () =>
    setForm({
      key: '',
      name: '',
      description: '',
      price: '0',
      billingInterval: 'monthly',
      displayOrder: '',
      isDefault: false,
      moduleKeys: [],
    })

  const submit = () => {
    if (!form.key.trim() || !form.name.trim()) {
      toast.error('A plan key and name are required.')
      return
    }
    createTier.mutate(
      {
        key: form.key.trim().toLowerCase(),
        name: form.name.trim(),
        description: form.description.trim() || null,
        price: Number(form.price) || 0,
        billingInterval: form.billingInterval,
        displayOrder: form.displayOrder.trim() ? Number(form.displayOrder) : null,
        isDefault: form.isDefault,
        moduleKeys: form.moduleKeys,
      },
      {
        onSuccess: (tier) => {
          toast.success(`Plan '${tier.name}' created as a Draft.`)
          setCreating(false)
          resetForm()
        },
        onError: (error) => toast.error(errorMessage(error)),
      },
    )
  }

  const duplicate = (tierId: string, name: string) => {
    duplicateTier.mutate(
      { tierId },
      {
        onSuccess: (tier) => toast.success(`Duplicated ${name} as '${tier.name}'.`),
        onError: (error) => toast.error(errorMessage(error)),
      },
    )
  }

  const toggleModule = (key: string) =>
    setForm((current) => ({
      ...current,
      moduleKeys: current.moduleKeys.includes(key)
        ? current.moduleKeys.filter((entry) => entry !== key)
        : [...current.moduleKeys, key],
    }))

  return (
    <div>
      <PageHeader
        title="Subscription plans"
        description="The catalogue of plans, their pricing and the modules each one bundles."
        actions={
          <Button variant="primary" onClick={() => setCreating(true)}>
            <Plus className="size-4" aria-hidden="true" />
            New plan
          </Button>
        }
      />

      {tiers.isError ? (
        <Alert tone="danger">{errorMessage(tiers.error, 'The plan catalogue did not load.')}</Alert>
      ) : tiers.isPending ? (
        <div className="space-y-[0.6rem]" aria-busy="true">
          <Skeleton className="h-12 rounded-card" />
          <Skeleton className="h-12 rounded-card" />
        </div>
      ) : rows.length === 0 ? (
        <Card className="p-card">
          <EmptyState
            icon={<Layers className="size-5" />}
            title="No plans yet"
            description="Create the first plan to start packaging modules for businesses."
          />
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Plan</th>
                <th scope="col">Price</th>
                <th scope="col">Lifecycle</th>
                <th scope="col" className="text-right">
                  Modules
                </th>
                <th scope="col" className="text-right">
                  Businesses
                </th>
                <th scope="col">Updated</th>
                <th scope="col" className="text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((tier) => (
                <tr key={tier.id}>
                  <td>
                    <Link
                      to="/admin/plans/$tierId"
                      params={{ tierId: tier.id }}
                      className="font-semibold"
                    >
                      {tier.name}
                    </Link>
                    <span className="block font-mono text-caption text-muted">{tier.key}</span>
                    {tier.isDefault ? (
                      <Badge tone="info" className="mt-[0.2rem]">
                        Default
                      </Badge>
                    ) : null}
                  </td>
                  <td>
                    <span className="block">{money(Number(tier.price))}</span>
                    <span className="block text-caption text-muted">{tier.billingInterval}</span>
                  </td>
                  <td>
                    <PlanLifecyclePill lifecycle={tier.lifecycle} />
                  </td>
                  <td className="text-right tabular">{formatNumber(tier.moduleCount)}</td>
                  <td className="text-right tabular">{formatNumber(tier.businessCount)}</td>
                  <td className="text-meta text-muted">
                    {tier.updatedAt ? formatDate(tier.updatedAt) : '—'}
                  </td>
                  <td>
                    <div className="flex flex-wrap justify-end gap-[0.35rem]">
                      <Link
                        to="/admin/plans/$tierId"
                        params={{ tierId: tier.id }}
                        className="btn btn-sm"
                      >
                        Manage
                      </Link>
                      <Button
                        size="sm"
                        disabled={duplicateTier.isPending}
                        onClick={() => duplicate(tier.id, tier.name)}
                      >
                        <Copy className="size-[0.85rem]" aria-hidden="true" />
                        Duplicate
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Drawer
        open={creating}
        onClose={() => setCreating(false)}
        title="New plan"
        description="Plans start as a Draft: not assignable until they are published."
        footer={
          <div className="flex justify-end gap-[0.6rem]">
            <Button onClick={() => setCreating(false)}>Cancel</Button>
            <Button variant="primary" onClick={submit} disabled={createTier.isPending}>
              {createTier.isPending ? 'Creating…' : 'Create plan'}
            </Button>
          </div>
        }
      >
        <div className="grid grid-cols-2 gap-x-[0.8rem] gap-y-[1.1rem] max-sm:grid-cols-1">
          <Field
            label="Plan key"
            htmlFor="plan-key"
            hint="Lowercase, unique. Immutable once published."
          >
            <Input
              id="plan-key"
              value={form.key}
              onChange={(event) => setForm({ ...form, key: event.target.value })}
            />
          </Field>
          <Field label="Display name" htmlFor="plan-name">
            <Input
              id="plan-name"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
            />
          </Field>
          <Field label="Price (KES)" htmlFor="plan-price">
            <Input
              id="plan-price"
              type="number"
              min="0"
              value={form.price}
              onChange={(event) => setForm({ ...form, price: event.target.value })}
            />
          </Field>
          <Field label="Billing interval" htmlFor="plan-interval">
            <Select
              id="plan-interval"
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
          <Field label="Display order" htmlFor="plan-order" optional hint="Sorts the plan list.">
            <Input
              id="plan-order"
              type="number"
              value={form.displayOrder}
              onChange={(event) => setForm({ ...form, displayOrder: event.target.value })}
            />
          </Field>
          <div className="flex items-center justify-between gap-3 pt-[1.4rem]">
            <span className="text-meta text-muted">Platform default plan</span>
            <Switch
              label="Make this the platform default plan"
              checked={form.isDefault}
              onCheckedChange={(checked) => setForm({ ...form, isDefault: checked })}
            />
          </div>
          <Field label="Description" htmlFor="plan-description" className="col-span-full">
            <Textarea
              id="plan-description"
              rows={2}
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
            />
          </Field>
        </div>

        <SectionCard
          title="Included modules"
          description="A plan must include at least one Core module before it can be published."
          className="mt-[1rem]"
        >
          <div className="grid gap-[0.4rem]">
            {(catalog.data?.modules ?? []).map((module) => (
              <label
                key={module.key}
                className="flex items-start gap-[0.6rem] rounded-md border border-line px-[0.8rem] py-[0.6rem]"
              >
                <input
                  type="checkbox"
                  className="mt-[0.2rem]"
                  checked={form.moduleKeys.includes(module.key)}
                  onChange={() => toggleModule(module.key)}
                />
                <span className="min-w-0">
                  <span className="block font-medium">
                    {module.name}{' '}
                    <span className="font-mono text-caption text-muted">{module.key}</span>
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
            {pluralize(form.moduleKeys.length, 'module')} selected.
          </p>
        </SectionCard>
      </Drawer>
    </div>
  )
}
