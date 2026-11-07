import { useMemo, useState } from 'react'
import type { CustomerDashboardItem, ServiceDashboardItem, StaffDashboardItem } from '../../lib/api/types'
import { toDateValue } from '../../lib/appointments'
import { useAppointmentAvailability } from '../../lib/appointments'
import type { StaffOption } from '../../lib/appointments'
import { cn } from '../../lib/cn'
import { formatDuration, formatTime, money } from '../../lib/format'
import { Avatar } from '../ui/avatar'
import { Button } from '../ui/button'
import { Drawer } from '../ui/drawer'
import { Field, Input, Select, Textarea } from '../ui/field'
import { SearchField } from '../ui/search-field'
import { Skeleton } from '../ui/skeleton'
import { SearchableStaffSelector } from './SearchableStaffSelector'

export type BookingMode = 'new' | 'reschedule' | 'rebook'

export type BookingPrefill = {
  appointmentId?: string
  customerId?: string
  serviceId?: string | null
  staffUserId?: string | null
  start?: Date | null
  note?: string | null
}

/** What the drawer hands back once the operator confirms. */
export type BookingSubmission = {
  mode: BookingMode
  /** Present for reschedule and rebook. */
  appointmentId?: string
  customerId: string
  serviceId: string
  staffUserId: string | null
  /** Local wall-clock start, converted to UTC by the caller. */
  start: Date
  note: string | null
}

export type AppointmentBookingFormProps = {
  open: boolean
  onClose: () => void
  mode: BookingMode
  businessId: string
  customers: readonly CustomerDashboardItem[]
  services: readonly ServiceDashboardItem[]
  staff: readonly StaffDashboardItem[]
  prefill?: BookingPrefill
  /**
   * Staff module entitlement. When false no staff selection is offered in
   * reschedule/rebook — the appointment is saved without a staff member, and the
   * server refuses one anyway.
   */
  staffModuleEnabled?: boolean
  busy?: boolean
  error?: string | null
  onSubmit: (submission: BookingSubmission) => void
}

const TITLES: Record<BookingMode, string> = {
  new: 'New booking',
  reschedule: 'Reschedule appointment',
  rebook: 'Rebook appointment',
}

const SUBMIT_LABELS: Record<BookingMode, string> = {
  new: 'Create booking',
  reschedule: 'Save new time',
  rebook: 'Create rebooking',
}

/** Local `yyyy-MM-dd` for a date, defaulting to today. */
function initialDate(prefill: BookingPrefill | undefined): string {
  return toDateValue(prefill?.start ?? new Date())
}

/** `HH:mm` for a date, defaulting to the next whole hour. */
function initialTime(prefill: BookingPrefill | undefined): string {
  const start = prefill?.start ?? new Date()
  const hours = String(start.getHours()).padStart(2, '0')
  const minutes = String(start.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

/**
 * Booking, rescheduling and rebooking, in one drawer.
 *
 * The drawer is a thin client over the server's own rules: the times it offers
 * are the availability endpoint's answer for the chosen service, staff and day
 * (so a taken slot is never selectable), the duration and price come from the
 * catalogue row, and the write goes through the same create/reschedule route the
 * rest of the platform uses. If the slot is taken between opening the drawer and
 * submitting, the API's `STAFF_TIME_UNAVAILABLE` refusal is shown in place
 * rather than being papered over.
 *
 * A booking must name an **enrolled** customer — the API takes a `customerId` —
 * so the customer picker searches the business's roster and points at the
 * Customers module when someone is missing, rather than inventing a record.
 */
export function AppointmentBookingForm({
  open,
  onClose,
  mode,
  businessId,
  customers,
  services,
  staff,
  prefill,
  staffModuleEnabled = true,
  busy = false,
  error,
  onSubmit,
}: AppointmentBookingFormProps) {
  const [customerId, setCustomerId] = useState(prefill?.customerId ?? '')
  const [customerQuery, setCustomerQuery] = useState('')
  const [serviceId, setServiceId] = useState(prefill?.serviceId ?? services[0]?.id ?? '')
  const [selectedStaff, setSelectedStaff] = useState<StaffOption | null>(() => {
    if (!prefill?.staffUserId) return null
    // The roster the caller already holds names the pre-filled member; fall back to
    // the id alone so the selection is still shown when the roster has moved on.
    return (
      staff.find((member) => member.userId === prefill.staffUserId) ?? {
        userId: prefill.staffUserId,
        fullName: 'Assigned staff',
        email: '',
        avatarUrl: null,
      }
    )
  })
  const [date, setDate] = useState(initialDate(prefill))
  const [time, setTime] = useState(initialTime(prefill))
  const [note, setNote] = useState(prefill?.note ?? '')

  const service = services.find((entry) => entry.id === serviceId) ?? null

  const matches = useMemo(() => {
    const term = customerQuery.trim().toLowerCase()
    const pool = term
      ? customers.filter((entry) =>
          `${entry.fullName} ${entry.phoneNumber ?? ''} ${entry.email}`
            .toLowerCase()
            .includes(term),
        )
      : customers
    return pool.slice(0, 30)
  }, [customers, customerQuery])

  const availability = useAppointmentAvailability(
    {
      businessId,
      serviceIds: serviceId ? [serviceId] : [],
      staffId: selectedStaff?.userId ?? null,
      date,
    },
    open && mode !== 'rebook',
  )

  const availableSlots = (availability.data ?? []).filter((slot) => slot.isAvailable)

  const start = useMemo(() => {
    const parsed = new Date(`${date}T${time}:00`)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }, [date, time])

  const end =
    start && service ? new Date(start.getTime() + service.durationMinutes * 60_000) : null

  const canSubmit =
    Boolean(serviceId) &&
    Boolean(customerId) &&
    Boolean(start) &&
    !busy &&
    (mode === 'reschedule' ? Boolean(prefill?.appointmentId) : true)

  const submit = () => {
    if (!canSubmit || !start) return
    onSubmit({
      mode,
      appointmentId: prefill?.appointmentId,
      customerId,
      serviceId,
      staffUserId: staffModuleEnabled ? (selectedStaff?.userId ?? null) : null,
      start,
      note: note.trim() || null,
    })
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={TITLES[mode]}
      description={
        mode === 'reschedule'
          ? 'Pick a new day and time. The appointment keeps its history and reference.'
          : 'Choose the customer, the service and a free slot from the bookable grid.'
      }
      footer={
        <div className="flex w-full items-center justify-end gap-[0.6rem]">
          <Button onClick={onClose} disabled={busy}>
            Close
          </Button>
          <Button variant="primary" onClick={submit} disabled={!canSubmit}>
            {busy ? 'Saving…' : SUBMIT_LABELS[mode]}
          </Button>
        </div>
      }
    >
      <div className="space-y-[1.1rem]">
        {mode === 'reschedule' ? (
          <p className="rounded-lg border border-line bg-hover px-[0.9rem] py-[0.7rem] text-meta">
            Rescheduling <b>{prefill?.appointmentId?.slice(0, 8)}</b>. The original slot is released
            as soon as the new one is accepted.
          </p>
        ) : (
          <div>
            <p className="label">Customer</p>
            <SearchField
              label="Search customers"
              placeholder="Search by name, phone or email"
              value={customerQuery}
              onChange={(event) => setCustomerQuery(event.target.value)}
            />
            <div
              role="radiogroup"
              aria-label="Choose a customer"
              className="mt-[0.5rem] max-h-[13rem] space-y-[0.35rem] overflow-y-auto pr-[0.2rem]"
            >
              {matches.map((customer) => {
                const selected = customer.userId === customerId
                return (
                  <button
                    key={customer.userId}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setCustomerId(customer.userId)}
                    className={cn(
                      'flex w-full items-center justify-between gap-[0.6rem] rounded-lg border px-[0.7rem] py-[0.5rem] text-left transition-colors',
                      selected ? 'border-accent bg-selected' : 'border-line bg-surface hover:bg-hover',
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-[0.55rem]">
                      <Avatar
                        name={customer.fullName}
                        src={customer.avatarUrl ?? undefined}
                        decorative
                      />
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">{customer.fullName}</span>
                        <span className="block truncate text-caption text-muted">
                          {customer.phoneNumber ?? customer.email}
                        </span>
                      </span>
                    </span>
                    {selected ? <span className="text-caption font-bold text-accent-ink">Selected</span> : null}
                  </button>
                )
              })}
              {matches.length === 0 ? (
                <p className="py-[0.6rem] text-meta text-muted">
                  No enrolled customer matches. Add them in the Customers module first — bookings
                  must name an enrolled customer.
                </p>
              ) : null}
            </div>
          </div>
        )}

        <div className="grid gap-[0.8rem] sm:grid-cols-2">
          <Field label="Service" htmlFor="appointment-service">
            <Select
              id="appointment-service"
              value={serviceId}
              onChange={(event) => setServiceId(event.target.value)}
            >
              {services.length === 0 ? <option value="">No services available</option> : null}
              {services.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.name} · {formatDuration(entry.durationMinutes)} · {money(entry.price)}
                </option>
              ))}
            </Select>
          </Field>

          {staffModuleEnabled ? (
            <SearchableStaffSelector
              value={selectedStaff}
              onChange={setSelectedStaff}
              enabled={staffModuleEnabled}
              label="Staff"
            />
          ) : null}

          <Field label="Date" htmlFor="appointment-date">
            <Input
              id="appointment-date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </Field>

          <Field label="Start time" htmlFor="appointment-time">
            <Input
              id="appointment-time"
              type="time"
              step={900}
              value={time}
              onChange={(event) => setTime(event.target.value)}
            />
          </Field>
        </div>

        <div>
          <p className="label">Free slots on this day</p>
          {availability.isLoading ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(4.3rem,1fr))] gap-[0.4rem]">
              {Array.from({ length: 8 }, (_, index) => (
                <Skeleton key={index} className="h-[2.2rem] rounded-md" />
              ))}
            </div>
          ) : availableSlots.length === 0 ? (
            <p className="text-meta text-muted">
              No free slots for this service{selectedStaff ? ' and staff member' : ''} on this day.
              Try another day, service or staff member.
            </p>
          ) : (
            <div
              role="group"
              aria-label="Choose a start time"
              className="grid grid-cols-[repeat(auto-fill,minmax(4.3rem,1fr))] gap-[0.4rem]"
            >
              {availableSlots.map((slot) => {
                const active = slot.localTime === time
                return (
                  <button
                    key={`${slot.startAtUtc}-${slot.staffUserId ?? 'any'}`}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      setTime(slot.localTime)
                      if (slot.staffUserId && staffModuleEnabled) {
                        setSelectedStaff({
                          userId: slot.staffUserId,
                          fullName: slot.staffName,
                          email: '',
                          avatarUrl: null,
                        })
                      }
                    }}
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
          {availability.isError ? (
            <p className="mt-[0.4rem] text-meta text-danger-ink" role="alert">
              Availability could not be loaded. The server still validates the slot when you save.
            </p>
          ) : null}
        </div>

        <Field label="Notes for the team" htmlFor="appointment-note" optional>
          <Textarea
            id="appointment-note"
            rows={2}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Allergies, preparation instructions, payment preference…"
          />
        </Field>

        <p className="rounded-lg border border-line bg-hover px-[0.9rem] py-[0.7rem] text-meta tabular">
          {start && service ? (
            <>
              Ends <b>{end ? formatTime(end.toISOString()) : '—'}</b> · {formatDuration(service.durationMinutes)} ·{' '}
              <b>{money(service.price)}</b>
              <br />
              <span className="text-muted">
                Duration and price come from the service catalogue; the server recomputes both when
                the booking is saved.
              </span>
            </>
          ) : (
            'Choose a date and time.'
          )}
        </p>

        {error ? (
          <p className="text-meta font-semibold text-danger-ink" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </Drawer>
  )
}
