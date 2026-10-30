import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { Pencil, Plus, Scissors, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Alert } from '../components/ui/alert'
import { Badge, StatusPill } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { SectionCard } from '../components/ui/card'
import { ConfirmDialog } from '../components/ui/confirm-dialog'
import { Drawer } from '../components/ui/drawer'
import { EmptyState } from '../components/ui/empty-state'
import { Field, FormGrid, Input, Textarea } from '../components/ui/field'
import { PageHeader } from '../components/ui/page-header'
import { Skeleton } from '../components/ui/skeleton'
import { Switch } from '../components/ui/switch'
import { errorMessage } from '../lib/api/client'
import type { ServiceCatalogItem } from '../lib/api/types'
import { ownerApi } from '../lib/dashboard/api'
import { useOwnerConsole } from '../lib/dashboard/console-context'
import { useOwnerServices } from '../lib/dashboard/use-owner-dashboard'
import { formatDuration, money } from '../lib/format'

export const Route = createFileRoute('/dashboard/services')({
  component: ServicesPage,
})

type Draft = {
  name: string
  description: string
  duration: string
  price: string
  showcase: boolean
}

const emptyDraft: Draft = { name: '', description: '', duration: '60', price: '', showcase: true }

function draftFrom(service: ServiceCatalogItem): Draft {
  return {
    name: service.name,
    description: service.description ?? '',
    duration: String(service.durationMinutes),
    price: String(service.price),
    showcase: service.showcase,
  }
}

function ServicesPage() {
  const { hasPermission } = useOwnerConsole()
  const canManage = hasPermission('services.manage')
  const services = useOwnerServices(true)
  const queryClient = useQueryClient()

  const [editing, setEditing] = useState<ServiceCatalogItem | null>(null)
  const [creating, setCreating] = useState(false)
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [error, setError] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<ServiceCatalogItem | null>(null)

  const openCreate = () => {
    setDraft(emptyDraft)
    setEditing(null)
    setCreating(true)
    setError(null)
  }

  const openEdit = (service: ServiceCatalogItem) => {
    setDraft(draftFrom(service))
    setEditing(service)
    setCreating(true)
    setError(null)
  }

  const close = () => {
    setCreating(false)
    setEditing(null)
    setError(null)
  }

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['services'] })
  }

  const save = useMutation({
    mutationFn: async (payload: Draft) => {
      const body = {
        name: payload.name.trim(),
        description: payload.description.trim() || null,
        durationMinutes: Number(payload.duration),
        price: Number(payload.price),
        showcase: payload.showcase,
      }
      if (editing) return ownerApi.updateService(editing.id, body)
      return ownerApi.createService(body)
    },
    onSuccess: () => {
      toast.success(editing ? 'Service updated.' : 'Service added.')
      close()
      invalidate()
    },
    onError: (mutationError) => setError(errorMessage(mutationError)),
  })

  const toggleActive = useMutation({
    mutationFn: (service: ServiceCatalogItem) =>
      ownerApi.updateService(service.id, { isActive: !service.isActive }),
    onSuccess: () => {
      toast.success('Service updated.')
      invalidate()
    },
    onError: (mutationError) => toast.error(errorMessage(mutationError)),
  })

  const remove = useMutation({
    mutationFn: (id: string) => ownerApi.deleteService(id),
    onSuccess: () => {
      toast.success('Service removed from your catalog.')
      setPendingDelete(null)
      invalidate()
    },
    onError: (mutationError) => toast.error(errorMessage(mutationError)),
  })

  const submit = () => {
    if (!draft.name.trim()) return setError('Give the service a name.')
    const duration = Number(draft.duration)
    if (!Number.isFinite(duration) || duration < 5) {
      return setError('Duration must be at least 5 minutes.')
    }
    const price = Number(draft.price)
    if (!Number.isFinite(price) || price < 0) return setError('Enter a price of 0 or more.')
    setError(null)
    save.mutate(draft)
  }

  const items = services.data ?? []

  return (
    <div>
      <PageHeader
        title="Services"
        description="What clients can book and what shows on your storefront."
        actions={
          canManage ? (
            <Button variant="primary" size="sm" onClick={openCreate}>
              <Plus className="size-4" aria-hidden="true" />
              Add service
            </Button>
          ) : null
        }
      />

      {services.isError ? (
        <Alert tone="danger" title="Couldn’t load services">
          {errorMessage(services.error)}
        </Alert>
      ) : services.isPending ? (
        <div className="space-y-2" aria-busy="true">
          <Skeleton className="h-16 rounded-card" />
          <Skeleton className="h-16 rounded-card" />
        </div>
      ) : items.length === 0 ? (
        <SectionCard>
          <EmptyState
            icon={<Scissors className="size-5" />}
            title="No services yet"
            description="Add your first service so clients can book it online."
            action={
              canManage ? (
                <Button variant="primary" onClick={openCreate}>
                  Add service
                </Button>
              ) : null
            }
          />
        </SectionCard>
      ) : (
        <SectionCard contentClassName="p-0">
          <ul className="m-0 list-none divide-y divide-line p-0">
            {items.map((service) => (
              <li
                key={service.id}
                className="flex flex-wrap items-start justify-between gap-3 px-[1.1rem] py-[0.85rem]"
              >
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-label font-semibold">
                    {service.name}
                    <StatusPill status={service.isActive ? 'active' : 'paused'}>
                      {service.isActive ? 'Active' : 'Paused'}
                    </StatusPill>
                    {service.showcase ? <Badge tone="info">On storefront</Badge> : null}
                  </p>
                  {service.description ? (
                    <p className="mt-[0.15rem] max-w-[46rem] text-meta text-muted">
                      {service.description}
                    </p>
                  ) : null}
                  <p className="mt-[0.15rem] text-caption text-muted">
                    {formatDuration(service.durationMinutes)} · {money(service.price)}
                  </p>
                </div>
                {canManage ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(service)}>
                      <Pencil className="size-3.5" aria-hidden="true" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      disabled={toggleActive.isPending}
                      onClick={() => toggleActive.mutate(service)}
                    >
                      {service.isActive ? 'Pause' : 'Activate'}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label={`Remove ${service.name}`}
                      onClick={() => setPendingDelete(service)}
                    >
                      <Trash2 className="size-3.5" aria-hidden="true" />
                    </Button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      <Drawer
        open={creating}
        onClose={close}
        title={editing ? 'Edit service' : 'Add a service'}
        description="Duration and price are what clients see while booking."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button variant="primary" disabled={save.isPending} onClick={submit}>
              {save.isPending ? 'Saving…' : editing ? 'Save changes' : 'Add service'}
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          {error ? <Alert tone="danger">{error}</Alert> : null}
          <Field label="Name" htmlFor="service-name">
            <Input
              id="service-name"
              value={draft.name}
              onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              placeholder="Signature fade"
            />
          </Field>
          <Field label="Description" htmlFor="service-description" optional>
            <Textarea
              id="service-description"
              rows={3}
              value={draft.description}
              onChange={(event) => setDraft({ ...draft, description: event.target.value })}
              placeholder="What the service includes"
            />
          </Field>
          <FormGrid>
            <Field label="Duration (minutes)" htmlFor="service-duration">
              <Input
                id="service-duration"
                type="number"
                min={5}
                step={5}
                value={draft.duration}
                onChange={(event) => setDraft({ ...draft, duration: event.target.value })}
              />
            </Field>
            <Field label="Price" htmlFor="service-price">
              <Input
                id="service-price"
                type="number"
                min={0}
                step="0.01"
                value={draft.price}
                onChange={(event) => setDraft({ ...draft, price: event.target.value })}
                placeholder="1500"
              />
            </Field>
          </FormGrid>
          <div className="flex items-center justify-between gap-3 rounded-md border border-line p-[0.75rem]">
            <div className="min-w-0">
              <p className="text-label font-semibold">Show on storefront</p>
              <p className="text-caption text-muted">
                Visible to visitors even before they sign in.
              </p>
            </div>
            <Switch
              label="Show on storefront"
              checked={draft.showcase}
              onCheckedChange={(checked) => setDraft({ ...draft, showcase: checked })}
            />
          </div>
        </div>
      </Drawer>

      <ConfirmDialog
        open={pendingDelete !== null}
        tone="danger"
        title="Remove this service?"
        description={
          pendingDelete
            ? `${pendingDelete.name} will stop appearing on your storefront and can no longer be booked. Existing appointments keep their details.`
            : undefined
        }
        confirmLabel={remove.isPending ? 'Removing…' : 'Remove service'}
        onConfirm={() => {
          if (pendingDelete) remove.mutate(pendingDelete.id)
        }}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  )
}
