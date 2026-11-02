import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { ServiceForm } from '../components/services'
import type { ServiceFormResult } from '../components/services'
import { Alert } from '../components/ui/alert'
import { Button } from '../components/ui/button'
import { PageHeader } from '../components/ui/page-header'
import { Skeleton } from '../components/ui/skeleton'
import { errorMessage } from '../lib/api/client'
import { useDashboardContext } from '../lib/dashboard/dashboard-context'
import { servicesApi, useService } from '../lib/services'

export const Route = createFileRoute('/dashboard/services/$serviceId/edit')({
  component: EditServicePage,
})

/**
 * Edit a service.
 *
 * The form is pre-filled from the service the API returns, so the photos, copy,
 * duration, price and visibility are all the real stored values. Saving sends one
 * partial update for the fields and one ordered image write, which is what keeps
 * an untouched photo exactly where it was — the image call only ever lists the
 * media the owner left in the slots.
 */
function EditServicePage() {
  const { serviceId } = Route.useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { hasPermission } = useDashboardContext()
  const canManage = hasPermission('serviceCatalog.manage')
  const [failure, setFailure] = useState<string | null>(null)

  const service = useService(serviceId, canManage)

  const save = useMutation({
    mutationFn: async (result: ServiceFormResult) => {
      const updated = await servicesApi.update(serviceId, {
        name: result.name,
        description: result.description,
        durationMinutes: result.durationMinutes,
        price: result.price,
        showcase: result.showcase,
      })

      // The ordered image set is replaced wholesale, so removing a photo, adding
      // one or reordering them is the same request — and the first id becomes the
      // cover. An unchanged list is still sent, which keeps this idempotent.
      await servicesApi.setImages(serviceId, result.mediaIds)

      return updated
    },
    onSuccess: (updated) => {
      void queryClient.invalidateQueries({ queryKey: ['services'] })
      toast.success(`${updated.name} updated`)
      void navigate({ to: '/dashboard/services/$serviceId', params: { serviceId } })
    },
    onError: (error) => {
      const message = errorMessage(error)
      setFailure(message)
      toast.error(message)
    },
  })

  const backLink = (
    <Link
      to="/dashboard/services/$serviceId"
      params={{ serviceId }}
      className="mb-[0.4rem] inline-flex min-h-[2.4rem] items-center gap-[0.3rem] font-medium text-muted no-underline transition-colors hover:text-fg"
    >
      Back to service
    </Link>
  )

  if (!canManage) {
    return (
      <div>
        {backLink}
        <PageHeader title="Edit service" />
        <Alert tone="warning" title="You cannot change services">
          Your role does not hold the “serviceCatalog.manage” permission for this workspace.
        </Alert>
      </div>
    )
  }

  if (service.isPending) {
    return (
      <div>
        {backLink}
        <PageHeader title="Edit service" />
        <div className="grid gap-[1.4rem] lg:grid-cols-[minmax(0,36rem)_17rem]">
          <div className="card flex flex-col gap-[1rem] p-[1.1rem]">
            <Skeleton className="aspect-[4/5] w-[6rem] rounded-lg" />
            <Skeleton className="h-[2.7rem]" />
            <Skeleton className="h-[6rem]" />
            <Skeleton className="h-[2.7rem]" />
          </div>
        </div>
      </div>
    )
  }

  if (service.isError) {
    return (
      <div>
        {backLink}
        <PageHeader title="Edit service" />
        <Alert tone="danger" title="This service could not be loaded">
          <p>{errorMessage(service.error)}</p>
          <Button
            size="sm"
            className="mt-[0.6rem]"
            onClick={() => void service.refetch()}
            disabled={service.isFetching}
          >
            <RefreshCw className="size-3.5" aria-hidden="true" />
            Try again
          </Button>
        </Alert>
      </div>
    )
  }

  return (
    <div>
      {backLink}

      <PageHeader
        title="Edit service"
        description="Changes are visible on your storefront as soon as you save."
      />

      <ServiceForm
        mode="edit"
        service={service.data}
        busy={save.isPending}
        error={failure}
        onCancel={() => void navigate({ to: '/dashboard/services/$serviceId', params: { serviceId } })}
        onSubmit={(result) => {
          setFailure(null)
          save.mutate(result)
        }}
      />
    </div>
  )
}
