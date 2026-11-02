import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { CalendarPlus, Pencil, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import {
  ServiceActionsMenu,
  ServiceBookingDrawer,
  ServiceDeleteDialog,
  ServiceDetails,
  ServiceGallery,
} from '../components/services'
import { Alert } from '../components/ui/alert'
import { Button } from '../components/ui/button'
import { PageHeader } from '../components/ui/page-header'
import { Skeleton } from '../components/ui/skeleton'
import { errorMessage } from '../lib/api/client'
import { useDashboardContext } from '../lib/dashboard/dashboard-context'
import { formatDuration, money } from '../lib/format'
import {
  isServiceBookable,
  servicePriceLabel,
  useService,
  useServiceMutations,
  useServices,
} from '../lib/services'
import type { ServiceStatusAction } from '../lib/services'

export const Route = createFileRoute('/dashboard/services/$serviceId/')({
  component: ServiceDetailsPage,
})

const PAST_TENSE: Record<ServiceStatusAction, string> = {
  pause: 'paused',
  resume: 'resumed',
  archive: 'archived',
  restore: 'restored',
}

/**
 * One service: gallery, information, actions and the booking drawer.
 *
 * Every action on this page is a real request — a status move calls its own
 * transition route, a delete calls the delete route behind a confirmation, and
 * "Book now" opens the booking drawer against the live availability calendar.
 * Nothing here is optimistic: the service is re-read from the cache the mutation
 * invalidated, so the status pill can never claim a move the server refused.
 */
function ServiceDetailsPage() {
  const { serviceId } = Route.useParams()
  const navigate = useNavigate()
  const { hasPermission, business } = useDashboardContext()
  const canManage = hasPermission('serviceCatalog.manage')

  const [bookingOpen, setBookingOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState(false)

  const service = useService(serviceId, true)
  const bookable = useServices({ statuses: ['active'] }, 1, 50, bookingOpen)
  const { setStatus, remove } = useServiceMutations()

  if (service.isPending) {
    return (
      <div>
        <Skeleton className="mb-[0.6rem] h-[1.4rem] w-[6rem]" />
        <div className="grid gap-[1.4rem] lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-[3rem]">
          <Skeleton className="aspect-[4/5] rounded-card" />
          <div className="flex flex-col gap-[0.8rem]">
            <Skeleton className="h-[1.2rem] w-[5rem] rounded-pill" />
            <Skeleton className="h-[2rem] w-[70%]" />
            <Skeleton className="h-[7rem] rounded-card" />
            <Skeleton className="h-[3rem] w-[60%]" />
          </div>
        </div>
      </div>
    )
  }

  if (service.isError) {
    return (
      <div>
        <PageHeader title="Service" />
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
        <Button className="mt-[0.8rem]" onClick={() => void navigate({ to: '/dashboard/services' })}>
          Back to services
        </Button>
      </div>
    )
  }

  const row = service.data
  const backLink = (
    <Link
      to="/dashboard/services"
      className="mb-[0.4rem] inline-flex min-h-[2.4rem] items-center gap-[0.3rem] font-medium text-muted no-underline transition-colors hover:text-fg"
    >
      Services
    </Link>
  )

  return (
    <div>
      {backLink}

      <div className="grid gap-[1.4rem] lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-[3rem]">
        <ServiceGallery service={row} className="lg:sticky lg:top-[1.5rem] lg:self-start" />

        <ServiceDetails
          service={row}
          actions={
            <>
              <Button
                variant="primary"
                className="min-w-[9rem] flex-1 max-lg:hidden"
                disabled={!isServiceBookable(row)}
                onClick={() => setBookingOpen(true)}
              >
                <CalendarPlus className="size-4" aria-hidden="true" />
                Book now
              </Button>

              {canManage ? (
                <>
                  <Link
                    to="/dashboard/services/$serviceId/edit"
                    params={{ serviceId: row.id }}
                    className="btn no-underline"
                  >
                    <Pencil className="size-4" aria-hidden="true" />
                    Edit
                  </Link>

                  <ServiceActionsMenu
                    service={row}
                    busy={setStatus.isPending || remove.isPending}
                    onDelete={() => setPendingDelete(true)}
                    onStatusAction={(action) =>
                      setStatus.mutate(
                        { serviceId: row.id, action },
                        {
                          onSuccess: () => toast.success(`${row.name} ${PAST_TENSE[action]}`),
                          onError: (error) => toast.error(errorMessage(error)),
                        },
                      )
                    }
                  />
                </>
              ) : null}
            </>
          }
        />
      </div>

      {/* Phone booking bar: the price, the duration and the one action that matters. */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-[1rem] border-t border-line bg-surface/95 px-4 py-[0.6rem] pb-[calc(0.6rem+env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
        <div className="min-w-0">
          <b className="block text-label font-bold tabular">{servicePriceLabel(row.price)}</b>
          <span className="block text-meta text-muted">{formatDuration(row.durationMinutes)}</span>
        </div>
        <Button
          variant="primary"
          disabled={!isServiceBookable(row)}
          onClick={() => setBookingOpen(true)}
        >
          <CalendarPlus className="size-4" aria-hidden="true" />
          Book now
        </Button>
      </div>

      <ServiceBookingDrawer
        open={bookingOpen}
        onClose={() => setBookingOpen(false)}
        businessId={row.businessId}
        businessSlug={business.slug ?? ''}
        services={bookable.data?.items ?? []}
        initialServiceId={row.id}
      />

      <ServiceDeleteDialog
        service={pendingDelete ? row : null}
        busy={remove.isPending}
        onCancel={() => setPendingDelete(false)}
        onConfirm={() =>
          remove.mutate(row.id, {
            onSuccess: () => {
              setPendingDelete(false)
              toast.success(`${row.name} deleted`)
              void navigate({ to: '/dashboard/services' })
            },
            onError: (error) => toast.error(errorMessage(error)),
          })
        }
      />

      {/* The bar above is phone-only, so the page keeps room for it. */}
      <p className="mt-[1.5rem] text-caption text-muted lg:hidden">
        {money(row.price)} · {formatDuration(row.durationMinutes)}
      </p>
    </div>
  )
}
