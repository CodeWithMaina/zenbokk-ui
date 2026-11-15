import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { CalendarPlus, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import {
  ClientActivityTab,
  ClientAppointmentsTab,
  ClientDetailsHeader,
  ClientLoyaltyTab,
  ClientOverviewTab,
} from '../components/clients'
import { Alert } from '../components/ui/alert'
import { Button } from '../components/ui/button'
import { DetailTabs } from '../components/ui/detail-tabs'
import type { TabItem } from '../components/ui/tabs'
import { EmptyState } from '../components/ui/empty-state'
import { Skeleton } from '../components/ui/skeleton'
import { BookingWizard } from '../components/booking'
import { clientStatusLabel, clientStatusTone } from '../lib/clients/mappers'
import { useClientDetails } from '../lib/clients/use-clients'
import { useDashboardContext } from '../lib/dashboard/dashboard-context'
import { useOwnerServices } from '../lib/dashboard/use-owner-dashboard'
import { MODULE } from '../lib/entitlements'
import { errorMessage } from '../lib/api/client'

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
  const navigate = useNavigate({ from: Route.fullPath })
  const { hasModule, business } = useDashboardContext()

  const enabled = hasModule(MODULE.customers)
  const loyaltyEnabled = hasModule(MODULE.loyalty)
  // A direct link to `?tab=loyalty` while Loyalty is off falls back to Overview,
  // so the address bar can never surface a disabled module's content.
  const tab: ClientTab =
    tabParam === 'loyalty' && !loyaltyEnabled ? 'overview' : (tabParam ?? 'overview')
  const details = useClientDetails(clientId, enabled)

  const [wizardOpen, setWizardOpen] = useState(false)

  const appointmentsEnabled = hasModule(MODULE.appointments)
  const services = useOwnerServices(appointmentsEnabled)

  const setTab = (next: ClientTab) => {
    void navigate({ search: { tab: next }, replace: true })
  }

  // The Loyalty tab exists only when the business is entitled to the module that
  // owns it; the overview, appointments and activity tabs are module-agnostic.
  const tabs: TabItem<ClientTab>[] = [
    { value: 'overview', label: 'Overview' },
    {
      value: 'appointments',
      label: 'Appointments',
      icon: <CalendarPlus className="size-4" aria-hidden="true" />,
    },
    { value: 'activity', label: 'Activity' },
  ]
  if (loyaltyEnabled) tabs.push({ value: 'loyalty', label: 'Loyalty' })

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
        customerType={data.status.customerType}
        onBookAppointment={() => setWizardOpen(true)}
        bookingDisabled={!appointmentsEnabled}
        bookingHint={
          appointmentsEnabled ? undefined : 'The appointments module is not in this plan'
        }
      />

      <DetailTabs
        items={tabs}
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
            onOpenAppointment={(appointmentId) =>
              void navigate({
                to: '/dashboard/appointments/$appointmentId',
                params: { appointmentId },
              })
            }
          />
        ) : null}

        {tab === 'activity' ? <ClientActivityTab customerId={clientId} enabled /> : null}

        {tab === 'loyalty' && loyaltyEnabled ? (
          <ClientLoyaltyTab
            customerId={clientId}
            customerName={customer.fullName}
            loyalty={data.loyalty}
          />
        ) : null}
      </DetailTabs>

      <BookingWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        businessId={business.id}
        businessName={business.name}
        businessLogoUrl={business.logoUrl}
        paymentsEnabled={hasModule(MODULE.payments)}
        services={services.data ?? []}
        prefill={{
          customer: {
            userId: customer.userId,
            fullName: customer.fullName,
            email: customer.email,
            phoneNumber: customer.phoneNumber,
            avatarUrl: customer.avatarUrl,
            enrollmentStatus: data.status.enrollmentStatus,
          },
        }}
        onViewAppointment={(appointmentId) => {
          setWizardOpen(false)
          void navigate({
            to: '/dashboard/appointments/$appointmentId',
            params: { appointmentId },
          })
        }}
      />
    </div>
  )
}
