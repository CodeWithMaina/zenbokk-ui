import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { useState } from 'react'
import { ServiceForm } from '../components/services'
import type { ServiceFormResult } from '../components/services'
import { Alert } from '../components/ui/alert'
import { PageHeader } from '../components/ui/page-header'
import { errorMessage } from '../lib/api/client'
import { servicesApi } from '../lib/services'
import { useDashboardContext } from '../lib/dashboard/dashboard-context'

export const Route = createFileRoute('/dashboard/services/new')({
  component: NewServicePage,
})

/**
 * Create a service.
 *
 * The form owns validation and the photo slots; this page owns the request, the
 * cache invalidation and the destination. Saving twice is prevented by the
 * mutation's pending state, and the photos are attached by the same
 * `PUT …/images` call the edit page uses — one code path for both modes.
 */
function NewServicePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { hasPermission } = useDashboardContext()
  const canManage = hasPermission('serviceCatalog.manage')
  const [failure, setFailure] = useState<string | null>(null)

  const create = useMutation({
    mutationFn: async (result: ServiceFormResult) => {
      const created = await servicesApi.create({
        name: result.name,
        description: result.description,
        durationMinutes: result.durationMinutes,
        price: result.price,
        showcase: result.showcase,
      })

      // Images are a separate, ordered write: the service must exist first so the
      // media can be scoped to it. A service with no photos is a supported state,
      // so a failure here is reported without discarding the new service.
      if (result.mediaIds.length > 0) {
        await servicesApi.setImages(created.id, result.mediaIds)
      }

      return created
    },
    onSuccess: (created) => {
      void queryClient.invalidateQueries({ queryKey: ['services'] })
      toast.success(`${created.name} created`)
      void navigate({ to: '/dashboard/services/$serviceId', params: { serviceId: created.id } })
    },
    onError: (error) => {
      const message = errorMessage(error)
      setFailure(message)
      toast.error(message)
    },
  })

  if (!canManage) {
    return (
      <div>
        <PageHeader title="New service" />
        <Alert tone="warning" title="You cannot add services">
          Your role does not hold the “serviceCatalog.manage” permission for this workspace.
        </Alert>
      </div>
    )
  }

  return (
    <div>
      <Link
        to="/dashboard/services"
        className="mb-[0.4rem] inline-flex min-h-[2.4rem] items-center gap-[0.3rem] font-medium text-muted no-underline transition-colors hover:text-fg"
      >
        Services
      </Link>

      <PageHeader
        title="New service"
        description="Photos, pricing and duration are what clients see while booking."
      />

      <ServiceForm
        mode="create"
        busy={create.isPending}
        error={failure}
        onCancel={() => void navigate({ to: '/dashboard/services' })}
        onSubmit={(result) => {
          setFailure(null)
          create.mutate(result)
        }}
      />
    </div>
  )
}
