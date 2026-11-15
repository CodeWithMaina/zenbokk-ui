import { CalendarDays, Check } from 'lucide-react'
import { useState } from 'react'
import {
  bookingEndMinutes,
  bookingStartMinutes,
  dateKey,
  groupSlots,
  longDate,
  minutesToClock,
  serviceTotals,
  todayKey,
  weekDates,
} from '../../../lib/booking'
import { cn } from '../../../lib/cn'
import { formatDuration } from '../../../lib/format'
import { Button } from '../../ui/button'
import { Input } from '../../ui/field'
import { Skeleton } from '../../ui/skeleton'
import { MonthPicker } from './MonthPicker'
import { StepHeading } from './shared'
import type { BookingWizardApi } from '../use-booking-wizard'

/**
 * Step 3 — when the booking happens.
 *
 * A walk-in starts today, at now rounded up to the next five minutes, and is
 * never marked in progress: the appointment is written `booked` and the console's
 * own start action is what begins the service. An appointment offers the current
 * week's days, the real slots the availability endpoint returns for those
 * services, and a hand-typed time that is checked against that same answer.
 */
export function ScheduleStep({ wizard }: { wizard: BookingWizardApi }) {
  const { draft } = wizard
  const [calendarOpen, setCalendarOpen] = useState(false)
  const totals = serviceTotals(draft.services)
  const start = bookingStartMinutes(draft)
  const end = bookingEndMinutes(draft)

  if (draft.type !== 'appointment') {
    const walkIn = start ?? 0
    return (
      <div>
        <StepHeading
          title="Walk-in timing"
          hint="The booking starts today. Adjust the start if the customer will wait."
        />
        <div className="rounded-lg border border-line bg-surface p-[1rem]">
          <p className="text-metric mb-[0.8rem] text-center font-semibold tabular">
            {minutesToClock(walkIn)}
          </p>
          <div className="mb-[1rem] flex justify-center gap-[0.5rem]">
            <Button onClick={() => wizard.shiftWalkIn(-15)}>− 15 min</Button>
            <Button onClick={() => wizard.shiftWalkIn(15)}>+ 15 min</Button>
          </div>
          <div className="text-meta">
            <div className="flex justify-between gap-[1rem] py-[0.35rem]">
              <span className="text-muted">Date</span>
              <span className="font-medium">Today</span>
            </div>
            <div className="flex justify-between gap-[1rem] py-[0.35rem]">
              <span className="text-muted">Duration</span>
              <span className="font-medium tabular">
                {formatDuration(totals.durationMinutes)}
              </span>
            </div>
            <div className="flex justify-between gap-[1rem] py-[0.35rem]">
              <span className="text-muted">Expected finish</span>
              <span className="font-medium tabular">{minutesToClock(end)}</span>
            </div>
          </div>
        </div>
        <p className="mt-[0.9rem] text-meta text-muted">
          A walk-in is not marked as in progress until you start the service.
        </p>
      </div>
    )
  }

  const today = todayKey()
  const week = weekDates(new Date())
  const inWeek = week.some((day) => dateKey(day) === draft.date)
  const groups = groupSlots(wizard.slots)
  const result = draft.customResult

  return (
    <div>
      <StepHeading
        title="Pick a date and time"
        hint={`Available times fit your ${formatDuration(totals.durationMinutes)} of services.`}
      />
      <div className="flex items-center justify-between gap-[1rem]">
        <p className="eyebrow">This week</p>
        <Button onClick={() => setCalendarOpen(true)}>
          <CalendarDays className="size-[1rem]" aria-hidden="true" />
          Calendar
        </Button>
      </div>

      <div className="bkw-days">
        {week.map((day) => {
          const key = dateKey(day)
          const isToday = key === today
          const past = key < today
          const on = draft.date === key
          return (
            <button
              key={key}
              type="button"
              className={cn('bkw-day', on && 'is-on')}
              disabled={past}
              aria-pressed={on}
              aria-current={isToday ? 'date' : undefined}
              onClick={() => wizard.setDate(key)}
            >
              <small>{day.toLocaleDateString('en-GB', { weekday: 'short' })}</small>
              <b className="tabular">{day.getDate()}</b>
              <small>{day.toLocaleDateString('en-GB', { month: 'short' })}</small>
              {isToday ? <i className="bkw-day-dot" aria-hidden="true" /> : null}
            </button>
          )
        })}
        {draft.date && !inWeek ? (
          <button
            type="button"
            className="bkw-day ex is-on"
            aria-pressed
            onClick={() => wizard.setDate(draft.date as string)}
          >
            <small>
              {new Date(`${draft.date}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'short' })}
            </small>
            <b className="tabular">{new Date(`${draft.date}T12:00:00`).getDate()}</b>
            <small>
              {new Date(`${draft.date}T12:00:00`).toLocaleDateString('en-GB', { month: 'short' })}
            </small>
          </button>
        ) : null}
      </div>

      {draft.date === null ? (
        <div className="bkw-note">Choose a day to see the times this business can take.</div>
      ) : wizard.availability.isLoading ? (
        <div className="bkw-slots" aria-busy="true">
          {Array.from({ length: 9 }, (_, index) => (
            <Skeleton key={index} className="h-[2.6rem] rounded-md" />
          ))}
        </div>
      ) : wizard.availability.isError ? (
        <div className="bkw-note warn" role="alert">
          Availability could not be loaded for that day. The server still checks the slot when you
          confirm the booking.
        </div>
      ) : groups.length === 0 ? (
        <div className="bkw-note">
          No times are being offered for these services on {longDate(draft.date)}. Try another day,
          or a different combination of services.
        </div>
      ) : (
        <>
          {groups.map((group) => (
            <div key={group.label} className="mb-[1rem]">
              <p className="eyebrow mb-[0.5rem]">{group.label}</p>
              <div className="bkw-slots" role="group" aria-label={`${group.label} times`}>
                {group.slots.map((slot) => (
                  <button
                    key={`${slot.localTime}-${slot.staffUserId ?? 'any'}`}
                    type="button"
                    className={cn('bkw-slot', draft.slot === slot.localTime && 'is-on')}
                    disabled={!slot.isAvailable}
                    aria-pressed={draft.slot === slot.localTime}
                    onClick={() => wizard.setSlot(slot.localTime)}
                  >
                    {slot.localTime}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <p className="eyebrow mb-[0.5rem]">Need a different time?</p>
          <div className="flex flex-wrap gap-[0.5rem]">
            <Input
              type="time"
              step={300}
              className="max-w-[10rem] flex-1 basis-[9rem]"
              aria-label="Custom start time"
              value={draft.customTime}
              onChange={(event) => wizard.setCustomTime(event.target.value)}
            />
            <Button onClick={wizard.checkTime}>Check availability</Button>
          </div>

          {result ? (
            result.ok ? (
              <div
                className="mt-[0.8rem] rounded-lg bg-success-soft px-[0.9rem] py-[0.7rem] text-meta text-success-ink"
                role="status"
              >
                <b className="tabular">{result.time}</b> is available and finishes at{' '}
                <b className="tabular">{minutesToClock(end)}</b>. Selected.
              </div>
            ) : (
              <div
                className="mt-[0.8rem] rounded-lg bg-warning-soft px-[0.9rem] py-[0.7rem] text-meta text-warning-ink"
                role="status"
              >
                {result.message}
                {result.nearest.length > 0 ? (
                  <>
                    {' '}
                    Nearest open times: <b className="tabular">{result.nearest.join(' and ')}</b>.
                  </>
                ) : null}
              </div>
            )
          ) : null}

          {draft.slot && !(result?.ok ?? false) ? (
            <div className="bkw-note mt-[0.8rem] flex items-center gap-[0.5rem]">
              <Check className="size-[1rem] flex-none text-accent" aria-hidden="true" />
              <span>
                {longDate(draft.date)} · <b className="tabular">{draft.slot}</b> to{' '}
                <b className="tabular">{minutesToClock(end)}</b>
              </span>
            </div>
          ) : null}
        </>
      )}

      {calendarOpen ? (
        <MonthPicker
          value={draft.date}
          onClose={() => setCalendarOpen(false)}
          onSelect={(date) => {
            wizard.setDate(date)
            setCalendarOpen(false)
          }}
        />
      ) : null}
    </div>
  )
}
