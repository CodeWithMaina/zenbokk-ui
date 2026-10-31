import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { CalendarPlus, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import {
  ClientActivityTab,
  ClientAppointmentsTab,
  ClientDetailsHeader,
  ClientLoyaltyTab,
  ClientOverviewTab,
} from '../components/clients'
import { Alert } from '../components/ui/alert'
import { Button } from '../components/ui/button'
import { BookingConfirmation } from '../components/ui/booking-confirmation'
import { BookingSheet } from '../components/ui/booking-sheet'
import type { BookingSelection } from '../components/ui/booking-sheet'
import { DetailTabs } from '../components/ui/detail-tabs'
import { EmptyState } from '../components/ui/empty-state'
import { Skeleton } from '../components/ui/skeleton'
import { errorMessage } from '../lib/api/client'
import { clientStatusLabel, clientStatusTone } from '../lib/clients/mappers'
import { useClientDetails } from '../lib/clients/use-clients'
import { useDashboardContext } from '../lib/dashboard/dashboard-context'
import { ownerApi } from '../lib/dashboard/api'
import { useOwnerAppointments, useOwnerServices } from '../lib/dashboard/use-owner-dashboard'
import { MODULE } from '../lib/entitlements'
import { formatDate, formatTime } from '../lib/format'

const CLIENT_TABS = ['overview', 'appointments', 'activity', 'loyalty'] as const
type ClientTab = (typeof CLIENT_TABS)[number]

/** Optional so a link to a client never has to name a tab. */
type ClientDetailsSearch = { tab?: ClientTab }

/**
 * The open tab lives in the URL, so a client's loyalty view is a link someone
 * can share, refresh or bookmark — and the back button steps through tabs.
 */
function validateSearch(search: Record<string, unknown>): ClientDetailsSearch {
  return {
    tab: (CLIENT_TABS as readonly string[]).includes(String(search.tab))
      ? (search.tab as ClientTab)
      : 'overview',
  }
}

export const Route = createFileRoute('/dashboard/customers/$clientId')({
  validateSearch,
  component: ClientDetailsPage,
})


function ClientDetailsPage() {
  const { clientId } = Route.useParams()
  const { tab: tabParam } = Route.useSearch()
  const tab = tabParam ?? 'overview'
  const navigate = useNavigate({ from: Route.fullPath })
  const { hasModule, business } = useDashboardContext()

  const enabled = hasModule(MODULE.customers)
  const details = useClientDetails(clientId, enabled)

  const [bookingOpen, setBookingOpen] = useState(false)
  const [booking, setBooking] = useState<BookingSelection | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [savingBooking, setSavingBooking] = useState(false)

  const appointmentsEnabled = hasModule(MODULE.appointments)
  const services = useOwnerServices(appointmentsEnabled)

  // Today's bookings for this client, so times already taken are greyed out.
  const todaysAppointments = useOwnerAppointments(
    {
      customerId: clientId,
      from: new Date(new Date().setHours(0, 0, 0, 0)).toISOString(),
      to: new Date(new Date().setHours(23, 59, 59, 999)).toISOString(),
      page: 1,
      pageSize: 50,
      sortBy: 'scheduledAt',
      sortDirection: 'asc',
    },
    appointmentsEnabled && bookingOpen,
  )

  const setTab = (next: ClientTab) => {
    void navigate({ search: { tab: next }, replace: true })
  }

  if (!enabled) {
    return (
      <Alert tone="info" title="Client tools aren’t in this plan">
        The clients module unlocks each client’s loyalty, appointments and
        activity. Add it from settings to open this page.
      </Alert>
    )
  }

  if (details.isPending) {
    return (
      <div
        className="flex flex-col gap-[1rem]"
        aria-busy="true"
        aria-label="Loading client"
      >
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-20 rounded-card" />
        <Skeleton className="h-64 rounded-card" />
      </div>
    )
  }

  if (details.isError) {
    return (
      <EmptyState
        title="This client could not be opened"
        description={errorMessage(details.error)}
        action={
          <div className="flex flex-wrap justify-center gap-[0.6rem]">
            <Button onClick={() => void details.refetch()}>
              <RefreshCw className="size-4" aria-hidden="true" />
              Try again
            </Button>
            <Button
              variant="ghost"
              onClick={() => void navigate({ to: '/dashboard/customers' })}
            >
              Back to clients
            </Button>
          </div>
        }
      />
    )
  }

  const data = details.data
  const customer = data.customer

  const busyTimes = Array.from(
    new Set(
      (todaysAppointments.data?.appointments ?? []).map((appointment) =>
        formatTime(appointment.scheduledAt),
      ),
    ),
  )

  const bookAppointment = async (selection: BookingSelection) => {
    setSavingBooking(true)
    try {
      const scheduledAt = new Date(`${selection.date}T${selection.time}:00`)
      await ownerApi.createAppointmentOnBehalf({
        businessId: business.id,
        customerId: clientId,
        serviceIds: [...selection.serviceIds],
        scheduledAt: scheduledAt.toISOString(),
        note: null,
      })
      setBooking(selection)
      setBookingOpen(false)
      setConfirmOpen(true)
      toast.success('Appointment booked', {
        description: `${customer.fullName} · ${formatDate(scheduledAt.toISOString())} ${selection.time}`,
      })
    } catch (error) {
      toast.error('The appointment was not booked', {
        description: errorMessage(error),
      })
    } finally {
      setSavingBooking(false)
    }
  }

  return (
    <div>
      <ClientDetailsHeader
        customerId={clientId}
        name={customer.fullName}
        phoneNumber={customer.phoneNumber}
        avatarUrl={customer.avatarUrl}
        status={data.status.enrollmentStatus}
        statusLabel={clientStatusLabel(data.status.enrollmentStatus)}
        tone={clientStatusTone(data.status.enrollmentStatus)}
        onBookAppointment={() => setBookingOpen(true)}
        bookingDisabled={!appointmentsEnabled}
        bookingHint={
          appointmentsEnabled ? undefined : 'The appointments module is not in this plan'
        }
      />

      <DetailTabs
        items={[
          { value: 'overview', label: 'Overview' },
          {
            value: 'appointments',
            label: 'Appointments',
            icon: <CalendarPlus className="size-4" aria-hidden="true" />,
          },
          { value: 'activity', label: 'Activity' },
          { value: 'loyalty', label: 'Loyalty' },
        ]}
        value={tab}
        onValueChange={setTab}
        label="Client sections"
        sticky
      >
        {tab === 'overview' ? (
          <ClientOverviewTab details={data} customerId={clientId} />
        ) : null}

        {tab === 'appointments' ? (
          <ClientAppointmentsTab
            customerId={clientId}
            enabled={appointmentsEnabled}
            paymentsEnabled={hasModule(MODULE.payments)}
          />
        ) : null}

        {tab === 'activity' ? <ClientActivityTab customerId={clientId} enabled /> : null}

        {tab === 'loyalty' ? (
          <ClientLoyaltyTab
            customerId={clientId}
            customerName={customer.fullName}
            loyalty={data.loyalty}
          />
        ) : null}
      </DetailTabs>

      <BookingSheet
        open={bookingOpen}
        onClose={() => setBookingOpen(false)}
        services={(services.data ?? [])
          .filter((service) => service.isActive)
          .map((service) => ({
            id: service.id,
            name: service.name,
            duration: service.durationMinutes,
            price: service.price,
          }))}
        customers={[
          {
            id: customer.userId,
            name: customer.fullName,
            detail: customer.phoneNumber ?? customer.email,
          },
        ]}
        initialSelection={{ customerId: customer.userId }}
        busyTimes={busyTimes}
        closeOnSubmit={false}
        submitLabel={savingBooking ? 'Booking…' : 'Confirm booking'}
        onSubmit={(selection) => void bookAppointment(selection)}
      />

      {booking ? (
        <BookingConfirmation
          open={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          customerName={customer.fullName}
          date={formatDate(new Date(`${booking.date}T${booking.time}:00`).toISOString())}
          time={booking.time}
          services={booking.serviceIds.map((id) => {
            const service = (services.data ?? []).find((item) => item.id === id)
            return {
              id,
              name: service?.name ?? 'Service',
              duration: service?.durationMinutes,
              price: service?.price,
            }
          })}
          total={booking.total}
          confirmLabel="View appointments"
          onConfirm={() => setTab('appointments')}
        />
      ) : null}
    </div>
  )
}
