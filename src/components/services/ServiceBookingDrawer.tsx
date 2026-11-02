import { useMutation, useQuery } from '@tanstack/react-query'
import { Check, Copy, Loader2, Search, UserPlus } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Alert } from '../ui/alert'
import { Avatar } from '../ui/avatar'
import { Button, LinkButton } from '../ui/button'
import { Drawer } from '../ui/drawer'
import { Input } from '../ui/field'
import { OptionRow } from '../ui/option-row'
import { SearchField } from '../ui/search-field'
import { StatusPill } from '../ui/badge'
import { errorMessage } from '../../lib/api/client'
import type { AvailabilitySlot, BusinessCustomer } from '../../lib/api/types'
import { ROSTER_STATUS } from '../../lib/clients/api'
import { clientStatusLabel, clientStatusTone } from '../../lib/clients/mappers'
import { useClients } from '../../lib/clients/use-clients'
import { queryKeys } from '../../lib/api/query-client'
import { ownerApi } from '../../lib/dashboard/api'
import { useDebouncedValue } from '../../lib/hooks/use-debounced-value'
import { formatDuration, formatTime, money } from '../../lib/format'
import type { Service } from '../../lib/services'
import { storefrontApi } from '../../lib/storefront'
import { cn } from '../../lib/cn'

export type ServiceBookingDrawerProps = {
  open: boolean
  onClose: () => void
  businessId: string
  businessSlug: string
  /** Every bookable service, for the multi-select step. */
  services: readonly Service[]
  /** Pre-selected service — the one whose detail page opened the drawer. */
  initialServiceId?: string
  onBooked?: (summary: string) => void
}

/** `2026-05-12` in the viewer's timezone. */
function toDateValue(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/** The next `count` days, starting today, with their weekday labels. */
function buildDays(count = 14) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(today)
    date.setDate(today.getDate() + index)
    return {
      value: toDateValue(date),
      weekday: date.toLocaleDateString('en-GB', { weekday: 'short' }),
      day: date.getDate(),
      month: date.toLocaleDateString('en-GB', { month: 'short' }),
    }
  })
}

/**
 * Book an appointment for one or more services.
 *
 * The design's booking sheet, wired to the existing appointment module rather
 * than to a local fixture:
 *
 *  - services and customers come from the business's own catalogue and roster,
 *  - the day strip and the start times come from the availability calendar, so a
 *    slot that is taken, off-duty or in the past is not offered,
 *  - confirming calls the owner's on-behalf booking endpoint, which applies the
 *    same overlap, permission and status rules as every other booking path.
 *
 * Punched has no endpoint that creates a customer account on someone's behalf,
 * so the "new customer" branch hands over the business's enrolment link instead
 * of fabricating a person.
 */
export function ServiceBookingDrawer({
  open,
  onClose,
  businessId,
  businessSlug,
  services,
  initialServiceId,
  onBooked,
}: ServiceBookingDrawerProps) {
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([])
  const [customerId, setCustomerId] = useState<string | null>(null)
  const [customerTerm, setCustomerTerm] = useState('')
  const [showEnrolment, setShowEnrolment] = useState(false)
  const [date, setDate] = useState<string | null>(null)
  const [slotStart, setSlotStart] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const days = useMemo(() => buildDays(14), [])
  const debouncedTerm = useDebouncedValue(customerTerm.trim(), 300)

  // Reset the draft every time the drawer opens, seeded with the service the
  // owner came from, so a cancelled booking never leaks into the next one.
  useEffect(() => {
    if (!open) return
    setSelectedServiceIds(initialServiceId ? [initialServiceId] : [])
    setCustomerId(null)
    setCustomerTerm('')
    setShowEnrolment(false)
    setDate(null)
    setSlotStart(null)
    setCopied(false)
  }, [open, initialServiceId])

  const selected = services.filter((service) => selectedServiceIds.includes(service.id))
  const totalDuration = selected.reduce((sum, service) => sum + service.durationMinutes, 0)
  const totalPrice = selected.reduce((sum, service) => sum + service.price, 0)

  const customerMatches = useClients(
    {
      search: debouncedTerm.length >= 3 ? debouncedTerm : null,
      status: ROSTER_STATUS.all,
      page: 1,
      pageSize: 5,
    },
    open && debouncedTerm.length >= 3,
  )

  const calendar = useQuery({
    queryKey: queryKeys.availability(businessId, {
      serviceIds: selectedServiceIds,
      startDate: days[0]?.value,
      endDate: days.at(-1)?.value,
    }),
    queryFn: () =>
      storefrontApi.availability(businessId, {
        serviceIds: selectedServiceIds,
        startDate: days[0]?.value,
        endDate: days.at(-1)?.value,
      }),
    enabled: open && selectedServiceIds.length > 0,
    staleTime: 15_000,
  })

  const dayFor = (value: string | null) =>
    value ? calendar.data?.days.find((day) => day.date === value) : undefined

  const slotsFor = (value: string | null): AvailabilitySlot[] => {
    const day = dayFor(value)
    if (!day) return []
    return day.slots.filter((slot) => slot.isAvailable)
  }

  const book = useMutation({
    mutationFn: () =>
      ownerApi.createAppointmentOnBehalf({
        businessId,
        customerId: customerId as string,
        serviceIds: selectedServiceIds,
        scheduledAt: slotStart as string,
      }),
    onSuccess: (appointment) => {
      const summary = `${selected.map((service) => service.name).join(' + ')} · ${formatTime(appointment.scheduledAt)}`
      toast.success(`Booked ${summary}`)
      onBooked?.(summary)
      onClose()
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  const canConfirm =
    selectedServiceIds.length > 0 && Boolean(customerId) && Boolean(slotStart) && !book.isPending

  const enrolmentUrl =
    typeof window === 'undefined' ? `/${businessSlug}` : `${window.location.origin}/${businessSlug}`

  const copyEnrolment = () => {
    void navigator.clipboard
      ?.writeText(enrolmentUrl)
      .then(() => {
        setCopied(true)
        window.setTimeout(() => setCopied(false), 2000)
      })
      .catch(() => setCopied(false))
  }

  const slots = slotsFor(date)
  const customerName = customerMatches.data?.items.find((row) => row.userId === customerId)?.fullName

  // The day strip is the calendar's own answer about which days the business is
  // open, so a closed day is visibly unavailable rather than failing on submit.
  const dayOptions = useMemo(
    () =>
      days.map((day) => ({
        ...day,
        closed: calendar.data?.days.find((entry) => entry.date === day.value)?.isOpen === false,
      })),
    [calendar.data?.days, days],
  )

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Book appointment"
      description={customerName ?? 'Choose a client, services and a start time.'}
      footer={
        <div className="flex w-full items-center justify-between gap-[0.8rem]">
          <div className="flex min-w-0 flex-col">
            <b className="text-label font-bold tabular">
              {selected.length > 0 ? money(totalPrice) : 'Choose a service'}
            </b>
            {selected.length > 0 ? (
              <span className="text-meta text-muted">
                {formatDuration(totalDuration)} · {selected.length}{' '}
                {selected.length === 1 ? 'service' : 'services'}
              </span>
            ) : null}
          </div>
          <Button variant="primary" disabled={!canConfirm} onClick={() => book.mutate()}>
            {book.isPending ? 'Booking…' : 'Confirm booking'}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-[1.1rem]">
        <section>
          <p className="label">Client</p>

          {customerId && customerName ? (
            <OptionRow
              title={customerName}
              description={
                customerMatches.data?.items.find((row) => row.userId === customerId)?.phoneNumber ??
                undefined
              }
              meta={
                <LinkButton
                  onClick={() => {
                    setCustomerId(null)
                    setCustomerTerm('')
                  }}
                >
                  Change
                </LinkButton>
              }
              selected
            />
          ) : showEnrolment ? (
            <div className="flex flex-col gap-[0.8rem]">
              <Alert tone="info" title="Clients create their own account">
                Punched has no endpoint that creates a client account for you, so a new client
                enrols from your storefront and appears here immediately. Share the link below.
              </Alert>
              <div className="flex items-center gap-[0.5rem]">
                <Input
                  readOnly
                  value={enrolmentUrl}
                  aria-label="Public enrolment link"
                  className="font-mono text-meta"
                  onFocus={(event) => event.currentTarget.select()}
                />
                <Button onClick={copyEnrolment} className="shrink-0">
                  {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </div>
              <LinkButton onClick={() => setShowEnrolment(false)}>
                Search an existing client
              </LinkButton>
            </div>
          ) : (
            <CustomerSearch
              term={customerTerm}
              onTermChange={setCustomerTerm}
              debouncedTerm={debouncedTerm}
              query={customerMatches}
              onSelect={setCustomerId}
              onNewClient={() => setShowEnrolment(true)}
            />
          )}
        </section>

        <section>
          <p className="label">Services</p>
          <div className="flex flex-col gap-[0.5rem]">
            {services.map((service) => (
              <OptionRow
                key={service.id}
                title={service.name}
                description={`${formatDuration(service.durationMinutes)} · ${money(service.price)}`}
                selected={selectedServiceIds.includes(service.id)}
                onSelectedChange={() => {
                  setSelectedServiceIds((current) =>
                    current.includes(service.id)
                      ? current.filter((id) => id !== service.id)
                      : [...current, service.id],
                  )
                  // The bookable window depends on the total duration, so a
                  // changed service set invalidates the chosen start time.
                  setSlotStart(null)
                }}
              />
            ))}
            {services.length === 0 ? (
              <p className="text-meta text-muted">No bookable services right now.</p>
            ) : null}
          </div>
        </section>

        {selectedServiceIds.length === 0 ? (
          <p className="text-meta text-muted">Choose a service to see available start times.</p>
        ) : (
          <ServiceBookingSchedule
            days={dayOptions}
            date={date}
            onDateChange={(value) => {
              setDate(value)
              setSlotStart(null)
            }}
            slots={slots}
            slotStart={slotStart}
            onSlotChange={setSlotStart}
            loading={calendar.isFetching}
            error={calendar.isError ? errorMessage(calendar.error) : null}
            notice={calendar.data?.notice ?? null}
          />
        )}
      </div>
    </Drawer>
  )
}

type CustomerQuery = ReturnType<typeof useClients>

/** Roster search step: an existing client, or the enrolment link for a new one. */
function CustomerSearch({
  term,
  onTermChange,
  debouncedTerm,
  query,
  onSelect,
  onNewClient,
}: {
  term: string
  onTermChange: (value: string) => void
  debouncedTerm: string
  query: CustomerQuery
  onSelect: (customerId: string) => void
  onNewClient: () => void
}) {
  return (
    <div className="flex flex-col gap-[0.6rem]">
      <SearchField
        label="Search clients"
        placeholder="Search name or phone"
        autoComplete="off"
        value={term}
        icon={<Search className="size-4" aria-hidden="true" />}
        onChange={(event) => onTermChange(event.target.value)}
      />

      {debouncedTerm.length > 0 && debouncedTerm.length < 3 ? (
        <p className="text-meta text-muted">Keep typing — three characters or more.</p>
      ) : null}

      {query.isFetching ? (
        <p className="flex items-center gap-[0.4rem] text-meta text-muted">
          <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
          Searching your clients…
        </p>
      ) : null}

      {query.isError ? (
        <Alert tone="danger" title="Search failed">
          {errorMessage(query.error)}
        </Alert>
      ) : null}

      {debouncedTerm.length >= 3 && !query.isFetching ? (
        <ul className="m-0 flex list-none flex-col gap-[0.4rem] p-0">
          {(query.data?.items ?? []).map((client: BusinessCustomer) => (
            <li key={client.userId}>
              <button
                type="button"
                onClick={() => onSelect(client.userId)}
                className="flex w-full items-center gap-[0.7rem] rounded-lg border border-line bg-surface px-[0.8rem] py-[0.6rem] text-left transition-colors hover:border-muted hover:bg-hover focus-visible:shadow-ring focus-visible:outline-none"
              >
                <Avatar name={client.fullName} size="sm" decorative />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{client.fullName}</span>
                  <span className="block truncate text-caption text-muted">
                    {client.phoneNumber ?? client.email}
                  </span>
                </span>
                <StatusPill
                  status={client.enrollmentStatus}
                  tone={clientStatusTone(client.enrollmentStatus)}
                >
                  {clientStatusLabel(client.enrollmentStatus)}
                </StatusPill>
              </button>
            </li>
          ))}
          {(query.data?.items ?? []).length === 0 ? (
            <li className="text-meta text-muted">
              No client matches that yet. Send them your enrolment link.
            </li>
          ) : null}
        </ul>
      ) : null}

      <LinkButton onClick={onNewClient}>
        <UserPlus className="size-3.5" aria-hidden="true" />
        New client
      </LinkButton>
    </div>
  )
}

/** Day strip + start times, both driven by the availability calendar. */
function ServiceBookingSchedule({
  days,
  date,
  onDateChange,
  slots,
  slotStart,
  onSlotChange,
  loading,
  error,
  notice,
}: {
  days: { value: string; weekday: string; day: number; month: string; closed: boolean }[]
  date: string | null
  onDateChange: (value: string) => void
  slots: readonly AvailabilitySlot[]
  slotStart: string | null
  onSlotChange: (value: string) => void
  loading: boolean
  error?: string | null
  notice?: string | null
}) {
  return (
    <div className="flex flex-col gap-[1rem]">
      <div>
        <p className="label">Date</p>
        <div
          role="group"
          aria-label="Choose a date"
          className="flex gap-[0.5rem] overflow-x-auto pb-[0.3rem] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {days.map((day) => {
            const active = day.value === date
            return (
              <button
                key={day.value}
                type="button"
                aria-pressed={active}
                disabled={day.closed}
                onClick={() => onDateChange(day.value)}
                className={cn(
                  'flex min-w-[3.9rem] shrink-0 flex-col items-center justify-center rounded-lg border py-[0.5rem] transition-colors focus-visible:shadow-ring focus-visible:outline-none',
                  active
                    ? 'border-inverse bg-inverse text-on-inverse'
                    : 'border-line bg-surface hover:bg-hover',
                  day.closed && 'cursor-not-allowed opacity-35',
                )}
              >
                <span className="text-caption">{day.weekday}</span>
                <b className="text-label font-bold tabular">{day.day}</b>
                <span className={cn('text-caption', !active && 'text-muted')}>{day.month}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <p className="label">Start time</p>

        {loading ? (
          <p className="flex items-center gap-[0.4rem] text-meta text-muted">
            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
            Checking availability…
          </p>
        ) : error ? (
          <Alert tone="danger" title="Availability could not be loaded">
            {error}
          </Alert>
        ) : !date ? (
          <p className="text-meta text-muted">Pick a day to see start times.</p>
        ) : slots.length === 0 ? (
          <p className="text-meta text-muted">
            No free start time that day{notice ? ` — ${notice}` : ''}.
          </p>
        ) : (
          <div
            role="group"
            aria-label="Choose a start time"
            className="grid grid-cols-[repeat(auto-fill,minmax(5rem,1fr))] gap-[0.5rem]"
          >
            {slots.map((slot) => {
              const active = slot.startAtUtc === slotStart
              return (
                <button
                  key={slot.startAtUtc}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onSlotChange(slot.startAtUtc)}
                  title={slot.staffName ? `${slot.staffName} · ${slot.localTime}` : slot.localTime}
                  className={cn(
                    'chip w-full justify-center tabular focus-visible:shadow-ring focus-visible:outline-none',
                    active && 'border-transparent bg-inverse text-on-inverse',
                  )}
                >
                  {slot.localTime}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

