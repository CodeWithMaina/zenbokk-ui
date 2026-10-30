import { useState } from 'react'
import { CalendarDays, LayoutGrid, List, MessageCircle } from 'lucide-react'
import {
  ActivityTimeline,
  AppointmentCard,
  Avatar,
  BookingConfirmation,
  BookingSheet,
  BulkActionBar,
  Button,
  ClientGrid,
  ClientTable,
  DescriptionList,
  DescriptionRow,
  DetailTabs,
  EntityHeader,
  LoyaltyCard,
  MessageComposerSheet,
  MetricGrid,
  PageHeader,
  PaginationBar,
  SearchField,
  SectionCard,
  SegmentedControl,
  SelectionBar,
  StampAdjuster,
  StatusPill,
  Toast,
} from '../components/ui'
import type { BookingSelection } from '../components/ui'
import { appointments, activity, clients, services } from './data'

type ClientTab = 'overview' | 'appointments' | 'activity' | 'loyalty'
type ClientView = 'cards' | 'table'

const detailTabs = [
  { value: 'overview', label: 'Overview' },
  { value: 'appointments', label: 'Appointments' },
  { value: 'activity', label: 'Activity' },
  { value: 'loyalty', label: 'Loyalty' },
] as const

const viewOptions = [
  {
    value: 'cards',
    label: 'Cards',
    icon: <LayoutGrid className="size-4" aria-hidden="true" />,
  },
  {
    value: 'table',
    label: 'Table',
    icon: <List className="size-4" aria-hidden="true" />,
  },
] as const

const messageTemplates = [
  {
    id: 'reminder',
    label: 'Reminder',
    body: 'Hi {first_name}, a quick reminder of your upcoming appointment with us. Reply to reschedule.',
  },
  {
    id: 'reward',
    label: 'Reward ready',
    body: 'Hi {first_name}, your loyalty reward is ready to redeem on your next visit.',
  },
  {
    id: 'offer',
    label: 'Offer',
    body: 'Hi {first_name}, enjoy 15% off any service this week. Book now!',
  },
] as const

const detailClient = clients[3]
const initialStamps = detailClient.stamps ?? 0

export function ClientsDemo() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [page, setPage] = useState(1)
  const [view, setView] = useState<ClientView>('table')
  const [tab, setTab] = useState<ClientTab>('overview')
  const [bookingOpen, setBookingOpen] = useState(false)
  const [booking, setBooking] = useState<BookingSelection | null>(null)
  const [confirmationOpen, setConfirmationOpen] = useState(false)
  const [messageOpen, setMessageOpen] = useState(false)
  const [toastOpen, setToastOpen] = useState(false)
  const [savedStamps, setSavedStamps] = useState(initialStamps)
  const [stampDraft, setStampDraft] = useState(initialStamps)
  const [stampReason, setStampReason] = useState('')
  const [stampSaving, setStampSaving] = useState(false)

  const toggleRow = (id: string, selected: boolean) => {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (selected) next.add(id)
      else next.delete(id)
      return next
    })
  }

  const toggleAll = (selected: boolean) => {
    setSelectedIds(
      selected ? new Set(clients.map((client) => client.id)) : new Set(),
    )
  }

  const messageRecipients = clients
    .filter((client) => selectedIds.has(client.id))
    .map((client) => ({
      id: client.id,
      name: client.name,
      tint: client.tint,
      detail: client.phone,
    }))

  const saveStamps = () => {
    setStampSaving(true)
    window.setTimeout(() => {
      setSavedStamps(stampDraft)
      setStampSaving(false)
      setStampReason('')
      setToastOpen(true)
    }, 400)
  }

  const bookedServices = booking
    ? services.filter((service) => booking.serviceIds.includes(service.id))
    : []

  return (
    <>
      <PageHeader
        title="Clients"
        description="Everyone who has visited the studio, with loyalty progress at a glance."
        actions={
          <>
            <SearchField
              label="Search clients"
              placeholder="Search name or phone"
              className="max-sm:w-full"
            />
            <Button onClick={() => setToastOpen(true)}>Add client</Button>
          </>
        }
      />

      <MetricGrid
        items={[
          { value: '248', label: 'Total clients' },
          { value: '31', label: 'New this month' },
          { value: '74%', label: 'Returning rate' },
          { value: '18', label: 'Rewards ready' },
        ]}
      />

      <div className="mt-[1.2rem]">
        <div className="mb-[0.7rem] flex flex-wrap items-center justify-between gap-[0.6rem]">
          <p className="text-meta text-muted">
            <b className="font-semibold text-fg tabular">{clients.length}</b> of
            248 clients shown
          </p>
          <SegmentedControl
            options={viewOptions}
            value={view}
            onValueChange={setView}
            label="Client layout"
          />
        </div>

        {selectedIds.size > 0 ? (
          <SelectionBar
            selectedCount={selectedIds.size}
            itemLabel={
              selectedIds.size === 1 ? 'client selected' : 'clients selected'
            }
            onClear={() => setSelectedIds(new Set())}
            actions={
              <Button size="sm" onClick={() => setMessageOpen(true)}>
                <MessageCircle className="size-4" aria-hidden="true" />
                Message selected
              </Button>
            }
          />
        ) : null}

        {view === 'table' ? (
          <div className="overflow-x-auto">
            <ClientTable
              rows={clients}
              selectedIds={selectedIds}
              onSelectedChange={toggleRow}
              onSelectAll={toggleAll}
              onOpen={() => setToastOpen(true)}
              label="Clients"
            />
          </div>
        ) : (
          <ClientGrid
            clients={clients}
            selectedIds={selectedIds}
            onSelectedChange={toggleRow}
            onOpen={() => setToastOpen(true)}
          />
        )}

        <PaginationBar
          page={page}
          pageCount={4}
          onPageChange={setPage}
          pageSize={25}
          onPageSizeChange={() => setPage(1)}
          className="mt-[0.9rem]"
        />
      </div>

      <section className="mt-[2rem] border-t border-line pt-[1.4rem]">
        <EntityHeader
          avatar={
            <Avatar
              name={detailClient.name}
              tint={detailClient.tint}
              size="lg"
              decorative
            />
          }
          title={detailClient.name}
          subtitle={<span>{detailClient.phone}</span>}
          meta={
            <>
              <StatusPill status={detailClient.status}>
                {detailClient.statusLabel}
              </StatusPill>
              <span>Client since March 2023</span>
            </>
          }
          actions={
            <>
              <Button
                onClick={() => {
                  setSelectedIds(new Set([detailClient.id]))
                  setMessageOpen(true)
                }}
              >
                <MessageCircle className="size-4" aria-hidden="true" />
                Message
              </Button>
              <Button variant="primary" onClick={() => setBookingOpen(true)}>
                <CalendarDays className="size-4" aria-hidden="true" />
                Book
              </Button>
            </>
          }
        />

        <DetailTabs
          items={detailTabs}
          value={tab}
          onValueChange={setTab}
          label="Client detail"
          sticky
        >
          {tab === 'overview' ? (
            <div className="grid gap-[0.9rem] lg:grid-cols-[1.35fr_1fr]">
              <div className="flex flex-col gap-[0.9rem]">
                <MetricGrid
                  items={[
                    { value: '12', label: 'Visits' },
                    { value: String(savedStamps), label: 'Stamps' },
                    { value: 'KES 42k', label: 'Lifetime value' },
                    { value: '2 days', label: 'Last visit' },
                  ]}
                />
                <SectionCard
                  title="Preferences"
                  description="Kept by the studio team"
                >
                  <ul className="flex list-disc flex-col gap-[0.4rem] pl-[1.1rem] text-meta">
                    <li>Prefers Friday mornings with Wanjiru.</li>
                    <li>Sensitive to strong fragrance — use the unscented line.</li>
                    <li>Usually books a facial and scalp ritual together.</li>
                  </ul>
                </SectionCard>
              </div>

              <LoyaltyCard
                memberName={detailClient.name}
                stamps={savedStamps}
                goal={detailClient.stampGoal}
                reward="KES 1,800 credit"
                badge={
                  <span className="rounded-pill border border-premium-gold/40 px-[0.55rem] py-[0.15rem] text-caption font-medium text-premium-gold">
                    {savedStamps >= (detailClient.stampGoal ?? 8)
                      ? 'Reward ready'
                      : `${savedStamps}/${detailClient.stampGoal ?? 8}`}
                  </span>
                }
              />
            </div>
          ) : null}

          {tab === 'appointments' ? (
            <div className="flex flex-col gap-[0.7rem]">
              {appointments.map((appointment) => (
                <AppointmentCard key={appointment.id} appointment={appointment} />
              ))}
            </div>
          ) : null}

          {tab === 'activity' ? (
            <SectionCard title="Activity" description="Latest client events">
              <ActivityTimeline entries={activity} />
            </SectionCard>
          ) : null}

          {tab === 'loyalty' ? (
            <div className="grid gap-[1rem] lg:grid-cols-[1.15fr_1fr]">
              <div className="flex flex-col gap-[1rem]">
                <LoyaltyCard
                  memberName={detailClient.name}
                  stamps={savedStamps}
                  goal={detailClient.stampGoal}
                  reward="KES 1,800 credit"
                />
                <SectionCard title="Reward">
                  <DescriptionList>
                    <DescriptionRow label="Programme">
                      The Aurelia Circle
                    </DescriptionRow>
                    <DescriptionRow label="Reward">
                      KES 1,800 service credit
                    </DescriptionRow>
                    <DescriptionRow label="Valid for">
                      72 hours once earned
                    </DescriptionRow>
                  </DescriptionList>
                </SectionCard>
              </div>

              <StampAdjuster
                savedStamps={savedStamps}
                value={stampDraft}
                onValueChange={setStampDraft}
                goal={detailClient.stampGoal}
                reason={stampReason}
                onReasonChange={setStampReason}
                onSave={saveStamps}
                saving={stampSaving}
              />
            </div>
          ) : null}
        </DetailTabs>
      </section>

      <BookingSheet
        open={bookingOpen}
        onClose={() => setBookingOpen(false)}
        services={services.map(({ id, name, duration, price }) => ({
          id,
          name,
          duration,
          price,
        }))}
        customers={clients.map((client) => ({
          id: client.id,
          name: client.name,
          detail: client.phone,
          tint: client.tint,
        }))}
        initialSelection={{
          customerId: detailClient.id,
          serviceIds: ['s1'],
        }}
        busyTimes={['11:00', '13:30', '15:00']}
        onSubmit={(selection) => {
          setBooking(selection)
          setConfirmationOpen(true)
        }}
      />

      <MessageComposerSheet
        open={messageOpen}
        onClose={() => setMessageOpen(false)}
        recipients={messageRecipients}
        templates={[...messageTemplates]}
        onSend={() => setToastOpen(true)}
      />

      {booking ? (
        <BookingConfirmation
          open={confirmationOpen}
          onClose={() => setConfirmationOpen(false)}
          customerName={detailClient.name}
          date={formatBookingDate(booking.date)}
          time={booking.time}
          services={bookedServices}
          total={booking.total}
          onConfirm={() => setTab('appointments')}
        />
      ) : null}

      <BulkActionBar
        selectedCount={selectedIds.size}
        itemLabel="selected"
        onClear={() => setSelectedIds(new Set())}
        actions={
          <>
            <Button
              variant="ghost"
              size="sm"
              className="text-on-inverse hover:bg-on-inverse/10 hover:text-on-inverse"
              onClick={() => setMessageOpen(true)}
            >
              <MessageCircle className="size-4" aria-hidden="true" />
              Message
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-on-inverse hover:bg-on-inverse/10 hover:text-on-inverse"
              onClick={() => setToastOpen(true)}
            >
              Export
            </Button>
          </>
        }
      />

      <Toast
        open={toastOpen}
        action={
          <Button
            variant="ghost"
            size="sm"
            className="text-on-inverse"
            onClick={() => setToastOpen(false)}
          >
            Dismiss
          </Button>
        }
      >
        Demo action — nothing was saved.
      </Toast>
    </>
  )
}

function formatBookingDate(value: string): string {
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

