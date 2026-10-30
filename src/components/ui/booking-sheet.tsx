import { useState } from 'react'
import type { ReactNode } from 'react'
import { formatDuration, money } from '../../lib/format'
import { cn } from '../../lib/cn'
import { Button } from './button'
import { Drawer } from './drawer'
import { Field, Select } from './field'
import { OptionRow } from './option-row'
import type { AvatarTint } from './avatar'

export type BookingServiceOption = {
  id: string
  name: string
  duration: number
  price: number
}

export type BookingCustomerOption = {
  id: string
  name: string
  detail?: string
  tint?: AvatarTint
}

export type BookingDraft = {
  serviceIds?: readonly string[]
  date?: string
  time?: string
  customerId?: string
}

export type BookingSelection = {
  serviceIds: string[]
  date: string
  time: string
  customerId?: string
  duration: number
  total: number
}

export type BookingSheetProps = {
  open: boolean
  onClose: () => void
  services: readonly BookingServiceOption[]
  customers?: readonly BookingCustomerOption[]
  initialSelection?: BookingDraft
  /** Local date (YYYY-MM-DD) → times that are already taken. */
  busyTimes?: readonly string[]
  currency?: string
  title?: ReactNode
  description?: ReactNode
  submitLabel?: string
  cancelLabel?: string
  /** Close after `onSubmit`; set false when the parent awaits an API call. */
  closeOnSubmit?: boolean
  onSubmit: (selection: BookingSelection) => void
}

export type BookingDayOption = {
  value: string
  weekday: string
  day: string
  month: string
  disabled: boolean
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

/** 9:00 to 17:00 in half-hour steps. */
export const BOOKING_TIME_SLOTS = [
  '09:00',
  '09:30',
  '10:00',
  '10:30',
  '11:00',
  '11:30',
  '12:00',
  '12:30',
  '13:00',
  '13:30',
  '14:00',
  '14:30',
  '15:00',
  '15:30',
  '16:00',
  '16:30',
  '17:00',
] as const

const CLOSING_MINUTES = 18 * 60

function toLocalDateValue(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Next `count` days; Sundays are closed. */
export function buildBookingDays(
  count = 14,
  today = new Date(),
): BookingDayOption[] {
  return Array.from({ length: Math.max(1, count) }, (_, index) => {
    const date = new Date(today)
    date.setDate(today.getDate() + index)

    return {
      value: toLocalDateValue(date),
      weekday: WEEKDAYS[date.getDay()],
      day: String(date.getDate()),
      month: MONTHS[date.getMonth()],
      disabled: date.getDay() === 0,
    }
  })
}

function toMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

/**
 * Appointment booking sheet on top of `Drawer`. Form state lives in an inner
 * component so closing and reopening starts from a clean draft.
 */
export function BookingSheet(props: BookingSheetProps) {
  if (!props.open) return null
  return <BookingSheetForm {...props} />
}

function BookingSheetForm({
  open,
  onClose,
  services,
  customers = [],
  initialSelection,
  busyTimes = [],
  currency = 'KES',
  title = 'Book appointment',
  description = 'Choose services, a date and a time.',
  submitLabel = 'Confirm booking',
  cancelLabel = 'Cancel',
  closeOnSubmit = true,
  onSubmit,
}: BookingSheetProps) {
  const [days] = useState(() => buildBookingDays())
  const fallbackDay = days.find((day) => !day.disabled)?.value ?? days[0]?.value ?? ''

  const [serviceIds, setServiceIds] = useState<string[]>(() =>
    (initialSelection?.serviceIds ?? []).filter((id) =>
      services.some((service) => service.id === id),
    ),
  )
  const [date, setDate] = useState(() => {
    const requested = initialSelection?.date
    if (requested && days.some((day) => day.value === requested)) return requested
    return fallbackDay
  })
  const [time, setTime] = useState(initialSelection?.time ?? '')
  const [customerId, setCustomerId] = useState(
    initialSelection?.customerId ?? '',
  )

  const selectedServices = services.filter((service) =>
    serviceIds.includes(service.id),
  )
  const duration = selectedServices.reduce(
    (sum, service) => sum + service.duration,
    0,
  )
  const total = selectedServices.reduce(
    (sum, service) => sum + service.price,
    0,
  )
  const canSubmit = serviceIds.length > 0 && Boolean(date) && Boolean(time)

  const toggleService = (id: string) => {
    setServiceIds((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    )
  }

  const slotUnavailable = (slot: string) =>
    busyTimes.includes(slot) ||
    (duration > 0 && toMinutes(slot) + duration > CLOSING_MINUTES)

  const handleSubmit = () => {
    if (!canSubmit) return
    onSubmit({
      serviceIds,
      date,
      time,
      customerId: customerId || undefined,
      duration,
      total,
    })
    if (closeOnSubmit) onClose()
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-[0.8rem] max-sm:flex-col max-sm:items-stretch">
          <div className="min-w-0 text-meta text-muted">
            <span className="block font-semibold text-fg tabular">
              {total > 0 ? money(total, currency) : '—'}
            </span>
            <span className="block truncate">
              {serviceIds.length === 0
                ? 'Choose at least one service'
                : `${serviceIds.length} service${serviceIds.length === 1 ? '' : 's'} · ${formatDuration(duration)}`}
            </span>
          </div>
          <div className="flex shrink-0 gap-[0.5rem] max-sm:w-full max-sm:[&>*]:flex-1">
            <Button onClick={onClose}>{cancelLabel}</Button>
            <Button variant="primary" disabled={!canSubmit} onClick={handleSubmit}>
              {submitLabel}
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-[1.2rem]">
        {customers.length > 0 ? (
          <Field label="Customer" optional>
            <Select
              value={customerId}
              onChange={(event) => setCustomerId(event.target.value)}
            >
              <option value="">Walk-in customer</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                  {customer.detail ? ` · ${customer.detail}` : ''}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}

        <div>
          <p className="label">Services</p>
          <div className="flex flex-col gap-[0.5rem]">
            {services.map((service) => (
              <OptionRow
                key={service.id}
                title={service.name}
                description={`${formatDuration(service.duration)} · ${money(
                  service.price,
                  currency,
                )}`}
                selected={serviceIds.includes(service.id)}
                onSelectedChange={() => toggleService(service.id)}
              />
            ))}
            {services.length === 0 ? (
              <p className="text-meta text-muted">No services available.</p>
            ) : null}
          </div>
        </div>

        <div>
          <p className="label">Date</p>
          <div
            role="group"
            aria-label="Choose a date"
            className="flex gap-[0.45rem] overflow-x-auto pb-[0.2rem] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {days.map((day) => {
              const active = day.value === date

              return (
                <button
                  key={day.value}
                  type="button"
                  aria-pressed={active}
                  disabled={day.disabled}
                  onClick={() => setDate(day.value)}
                  className={cn(
                    'flex min-w-[3.5rem] shrink-0 flex-col items-center rounded-lg border px-[0.5rem] py-[0.4rem] text-center transition-colors focus-visible:shadow-ring focus-visible:outline-none',
                    active
                      ? 'border-accent bg-selected'
                      : 'border-line bg-surface hover:bg-hover',
                    day.disabled && 'cursor-not-allowed opacity-35',
                  )}
                >
                  <span className="text-caption tracking-caps text-muted uppercase">
                    {day.weekday}
                  </span>
                  <b className="text-label font-bold tabular">{day.day}</b>
                  <span className="text-caption text-muted">{day.month}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <p className="label">Time</p>
          <div
            role="group"
            aria-label="Choose a time"
            className="grid grid-cols-[repeat(auto-fill,minmax(4.3rem,1fr))] gap-[0.45rem]"
          >
            {BOOKING_TIME_SLOTS.map((slot) => {
              const unavailable = slotUnavailable(slot)
              const active = slot === time

              return (
                <button
                  key={slot}
                  type="button"
                  aria-pressed={active}
                  disabled={unavailable}
                  onClick={() => setTime(slot)}
                  title={unavailable ? 'Not enough time before closing' : undefined}
                  className={cn(
                    'chip w-full justify-center tabular focus-visible:shadow-ring focus-visible:outline-none',
                    active && 'border-transparent bg-inverse text-on-inverse',
                    'disabled:cursor-not-allowed disabled:opacity-35',
                  )}
                >
                  {slot}
                </button>
              )
            })}
          </div>
          {time && date ? (
            <p className="mt-[0.45rem] text-meta text-muted">
              {days.find((day) => day.value === date)?.weekday} · {time}
              {duration > 0 ? ` · ends ${formatDuration(duration)} later` : ''}
            </p>
          ) : (
            <p className="mt-[0.45rem] text-meta text-muted">
              Times close to closing are hidden for longer services.
            </p>
          )}
        </div>
      </div>
    </Drawer>
  )
}

