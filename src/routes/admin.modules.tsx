import { createFileRoute } from '@tanstack/react-router'
import { Boxes } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Alert } from '../components/ui/alert'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { Drawer } from '../components/ui/drawer'
import { EmptyState } from '../components/ui/empty-state'
import { Field, Input, Textarea } from '../components/ui/field'
import { PageHeader } from '../components/ui/page-header'
import { Skeleton } from '../components/ui/skeleton'
import { Switch } from '../components/ui/switch'
import { useAdminModuleCatalog, useUpdateModule } from '../lib/admin/use-admin'
import { errorMessage } from '../lib/api/client'
import { formatNumber } from '../lib/format'
import type { AdminModuleCatalogItem } from '../lib/api/types'

export const Route = createFileRoute('/admin/modules')({
  component: AdminModules,
})

/** The module catalogue: every registered module and its usage. */
function AdminModules() {
  const catalog = useAdminModuleCatalog()
  const updateModule = useUpdateModule()

  const [editing, setEditing] = useState<AdminModuleCatalogItem | null>(null)
  const [form, setForm] = useState({ name: '', description: '', isActive: true, reason: '' })

  const open = (module: AdminModuleCatalogItem) => {
    setEditing(module)
    setForm({
      name: module.name,
      description: module.description ?? '',
      isActive: module.isActive,
      reason: '',
    })
  }

  const submit = () => {
    if (!editing) return
    updateModule.mutate(
      {
        moduleKey: editing.key,
        payload: {
          name: form.name.trim(),
          description: form.description.trim() || null,
          isActive: form.isActive,
          reason: form.reason.trim() || null,
        },
      },
      {
        onSuccess: () => {
          toast.success(`Module '${editing.key}' updated.`)
          setEditing(null)
        },
        onError: (error) => toast.error(errorMessage(error)),
      },
    )
  }

  const toggleActive = (module: AdminModuleCatalogItem, next: boolean) =>
    updateModule.mutate(
      { moduleKey: module.key, payload: { isActive: next, reason: null } },
      {
        onSuccess: () =>
          toast.success(
            `Module '${module.key}' ${next ? 'enabled' : 'disabled'} for the platform.`,
          ),
        onError: (error) => toast.error(errorMessage(error)),
      },
    )

  const rows = catalog.data?.modules ?? []

  return (
    <div>
      <PageHeader
        title="Modules"
        description="Every module the platform registers. The backend remains the source of truth for entitlement decisions."
      />

      {catalog.isError ? (
        <Alert tone="danger">
          {errorMessage(catalog.error, 'The module catalogue did not load.')}
        </Alert>
      ) : catalog.isPending ? (
        <div className="space-y-[0.6rem]" aria-busy="true">
          <Skeleton className="h-12 rounded-card" />
          <Skeleton className="h-12 rounded-card" />
        </div>
      ) : rows.length === 0 ? (
        <Card className="p-card">
          <EmptyState
            icon={<Boxes className="size-5" />}
            title="No modules registered"
            description="Modules are defined by the platform manifest."
          />
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Module</th>
                <th scope="col">Category</th>
                <th scope="col">Dependencies</th>
                <th scope="col" className="text-right">
                  Plans
                </th>
                <th scope="col" className="text-right">
                  Businesses
                </th>
                <th scope="col">Available</th>
                <th scope="col" className="text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((module) => (
                <tr key={module.key}>
                  <td>
                    <span className="block font-semibold">
                      {module.name}
                      {module.isCore ? (
                        <Badge tone="info" className="ml-[0.4rem]">
                          Core
                        </Badge>
                      ) : null}
                    </span>
                    <span className="block font-mono text-caption text-muted">{module.key}</span>
                    {module.description ? (
                      <span className="block text-caption text-subtle">{module.description}</span>
                    ) : null}
                  </td>
                  <td>
                    <Badge tone="neutral">{module.visibility}</Badge>
                  </td>
                  <td>
                    {module.dependencies.length === 0 ? (
                      <span className="text-caption text-muted">None</span>
                    ) : (
                      <span className="flex flex-wrap gap-[0.25rem]">
                        {module.dependencies.map((dependency) => (
                          <Badge key={dependency} tone="neutral">
                            {dependency}
                          </Badge>
                        ))}
                      </span>
                    )}
                  </td>
                  <td className="text-right tabular">{formatNumber(module.planCount)}</td>
                  <td className="text-right tabular">{formatNumber(module.businessCount)}</td>
                  <td>
                    <Switch
                      label={`Toggle availability for ${module.name}`}
                      checked={module.isActive}
                      disabled={updateModule.isPending}
                      onCheckedChange={(checked) => toggleActive(module, checked)}
                    />
                  </td>
                  <td>
                    <div className="flex justify-end">
                      <Button size="sm" onClick={() => open(module)}>
                        Edit
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
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing ? `Edit ${editing.name}` : 'Edit module'}
        description="The module key is immutable — it is the entitlement contract."
        footer={
          <div className="flex justify-end gap-[0.6rem]">
            <Button onClick={() => setEditing(null)}>Cancel</Button>
            <Button variant="primary" onClick={submit} disabled={updateModule.isPending}>
              {updateModule.isPending ? 'Saving…' : 'Save module'}
            </Button>
          </div>
        }
      >
        <Field label="Display name" htmlFor="module-name">
          <Input
            id="module-name"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
          />
        </Field>
        <Field label="Description" htmlFor="module-description" className="mt-[1rem]">
          <Textarea
            id="module-description"
            rows={3}
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
          />
        </Field>
        <div className="mt-[1rem] flex items-center justify-between gap-3">
          <span className="text-meta text-muted">
            Available — disabling removes the module from entitlement resolution
          </span>
          <Switch
            label="Module availability"
            checked={form.isActive}
            onCheckedChange={(checked) => setForm({ ...form, isActive: checked })}
          />
        </div>
        <Field label="Reason" htmlFor="module-reason" optional className="mt-[1rem]">
          <Input
            id="module-reason"
            value={form.reason}
            onChange={(event) => setForm({ ...form, reason: event.target.value })}
          />
        </Field>
      </Drawer>
    </div>
  )
}
