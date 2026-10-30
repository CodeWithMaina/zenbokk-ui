import { useMutation, useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft, CalendarPlus, CalendarX2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Alert } from '../components/ui/alert'
import { AppointmentCard } from '../components/ui/appointment-card'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { ConfirmDialog } from '../components/ui/confirm-dialog'
import { Skeleton } from '../components/ui/skeleton'
import { errorMessage } from '../lib/api/client'
import { queryClient, queryKeys } from '../lib/api/query-client'
import type { Appointment } from '../lib/api/types'
import { useAuth } from '../lib/auth'
import { requireSession } from '../lib/auth/guards'
import {
  appointmentStatusLabel,
  isAppointmentCancellable,
  isAppointmentFinal,
} from '../lib/dashboard/appointment-status'
import { formatDay, formatTimeRange, money } from '../lib/format'
import { bookingApi, useStorefront } from '../lib/storefront'
import { storefrontHref } from '../lib/tenant'

export const Route = createFileRoute('/$slug/account')({
  beforeLoad: async ({ location }) => {
    await requireSession([], location.href)
  },
  component: AccountPage,
})

const monthFormatter = new Intl.DateTimeFormat('en-GB', { month: 'short' })

export function AccountPage() {
  const { business, businessId, canonicalSlug } = useStorefront()
  const { isAuthenticated } = useAuth()
  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null)

  const appointmentsQuery = useQuery({
    queryKey: queryKeys.myAppointments({ businessId }),
    queryFn: () => bookingApi.mine({ businessId, page: 1, pageSize: 50 }),
    enabled: isAuthenticated,
    // Keeps the upcoming/history split honest while the page stays open.
    refetchInterval: 60_000,
  })

  const cancelBooking = useMutation({
    mutationFn: (id: string) => bookingApi.cancel(id),
    onSuccess: () => {
      toast.success('Appointment cancelled.')
      setCancelTarget(null)
      void queryClient.invalidateQueries({ queryKey: ['appointments', 'customer'] })
    },
    onError: (error) => {
      toast.error(errorMessage(error, 'We could not cancel that appointment.'))
    },
  })

  // The query's fetch timestamp doubles as "now" without reading the clock
  // during render (React Compiler purity); refetchInterval keeps it fresh.
  const now = appointmentsQuery.dataUpdatedAt
  const mine = (appointmentsQuery.data?.items ?? []).filter(
    (appointment) => appointment.businessId === businessId,
  )
  const upcoming = mine
    .filter(
      (appointment) =>
        !isAppointmentFinal(appointment.status) &&
        new Date(appointment.scheduledAt).getTime() >= now,
    )
    .sort(
      (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
    )
  const past = mine
    .filter((appointment) => !upcoming.includes(appointment))
    .sort(
      (a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime(),
    )

  function card(appointment: Appointment, cancellable: boolean) {
    const start = new Date(appointment.scheduledAt)
    const total = appointment.services.reduce((sum, service) => sum + service.price, 0)

    return (
      <div key={appointment.id}>
        <AppointmentCard
          appointment={{
            id: appointment.id,
            day: start.getDate(),
            month: monthFormatter.format(start),
            weekday: formatDay(start),
            time: formatTimeRange(appointment.scheduledAt, appointment.endAt),
            status: appointment.status,
            statusLabel: appointmentStatusLabel(appointment.status),
            services: appointment.services.map((service) => ({
              name: service.name,
              duration: service.durationMinutes,
              price: service.price,
            })),
            total,
            currency: 'KES',
          }}
        />
        {cancellable ? (
          <div className="mt-[0.4rem] flex items-center justify-end gap-[0.6rem]">
            <span className="text-caption text-subtle">Total {money(total, 'KES')}</span>
            <Button
              variant="ghost"
              className="btn-sm"
              onClick={() => setCancelTarget(appointment)}
            >
              Cancel
            </Button>
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-(--container-page) px-gutter py-[clamp(1.5rem,4vw,3rem)]">
      <a
        href={storefrontHref(canonicalSlug)}
        className="inline-flex items-center gap-[0.3rem] text-meta text-muted transition-colors hover:text-fg"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {business.name}
      </a>
      <p className="eyebrow mt-[0.6rem]">Your visits</p>
      <h1 className="display mt-[0.3rem] text-title">Your appointments</h1>
      <p className="mt-[0.25rem] text-meta text-muted">
        Everything you have booked with {business.name}.
      </p>

      {appointmentsQuery.isPending ? (
        <div className="mt-[1.2rem] space-y-[0.7rem]" aria-busy="true">
          <Skeleton className="h-[8rem] rounded-card" />
          <Skeleton className="h-[8rem] rounded-card" />
        </div>
      ) : appointmentsQuery.isError ? (
        <Alert tone="danger" className="mt-[1.2rem]">
          {errorMessage(appointmentsQuery.error, 'We could not load your appointments.')}{' '}
          <button
            type="button"
            className="link font-semibold"
            onClick={() => void appointmentsQuery.refetch()}
          >
            Try again
          </button>
        </Alert>
      ) : (
        <div className="mt-[1.2rem] flex flex-col gap-[1.4rem]">
          <section>
            <h2 className="text-heading font-bold tracking-snug">Upcoming</h2>
            {upcoming.length === 0 ? (
              <Card className="mt-[0.6rem] p-[1.2rem] text-center">
                <span className="mx-auto grid size-11 place-items-center rounded-round bg-accent-soft text-accent-ink">
                  <CalendarX2 className="size-5" aria-hidden="true" />
                </span>
                <p className="mt-[0.5rem] font-semibold">Nothing on the calendar</p>
                <p className="mt-[0.15rem] text-meta text-muted">
                  Book a visit and it will show up here.
                </p>
                <a
                  href={storefrontHref(canonicalSlug, '/book')}
                  className="btn btn-primary mt-[0.8rem] no-underline"
                >
                  <CalendarPlus className="size-4" aria-hidden="true" />
                  Book an appointment
                </a>
              </Card>
            ) : (
              <div className="mt-[0.6rem] flex flex-col gap-[0.7rem]">
                {upcoming.map((appointment) =>
                  card(appointment, isAppointmentCancellable(appointment.status)),
                )}
              </div>
            )}
          </section>

          {past.length > 0 ? (
            <section>
              <h2 className="text-heading font-bold tracking-snug">History</h2>
              <div className="mt-[0.6rem] flex flex-col gap-[0.7rem]">
                {past.map((appointment) => card(appointment, false))}
              </div>
            </section>
          ) : null}
        </div>
      )}

      <ConfirmDialog
        open={cancelTarget !== null}
        tone="danger"
        title="Cancel this appointment?"
        description={
          cancelTarget
            ? `${formatDay(cancelTarget.scheduledAt)} · ${formatTimeRange(cancelTarget.scheduledAt, cancelTarget.endAt)}. The slot will be released for someone else.`
            : undefined
        }
        confirmLabel={cancelBooking.isPending ? 'Cancelling…' : 'Cancel appointment'}
        cancelLabel="Keep it"
        onCancel={() => setCancelTarget(null)}
        onConfirm={() => {
          if (cancelTarget) cancelBooking.mutate(cancelTarget.id)
        }}
      />
    </div>
  )
}
