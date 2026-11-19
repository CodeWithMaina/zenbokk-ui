import { useState } from 'react'
import { Plus, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { Alert } from '../ui/alert'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { SectionCard } from '../ui/card'
import { Checkbox } from '../ui/checkbox'
import { EmptyState } from '../ui/empty-state'
import { Field, Input, Select } from '../ui/field'
import { Skeleton } from '../ui/skeleton'
import { useDashboardContext } from '../../lib/dashboard/dashboard-context'
import { errorMessage } from '../../lib/api/client'
import {
  minutesToTime,
  timeToMinutes,
  useBusinessSchedule,
  useDeleteScheduleException,
  useSaveBusinessSchedule,
  useSaveScheduleException,
  type ScheduleDay,
  type SchedulePeriod,
} from '../../lib/schedule/api'

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]

const TIME_ZONES: string[] = (() => {
  try {
    const intl = Intl as unknown as { supportedValuesOf?: (key: string) => string[] }
    const list = intl.supportedValuesOf?.('timeZone')
    if (list && list.length > 0) return list
  } catch {
    /* older browser */
  }
  return [
    'Africa/Nairobi', 'Africa/Kampala', 'Africa/Dar_es_Salaam', 'Africa/Lagos',
    'Africa/Johannesburg', 'Europe/London', 'Europe/Paris', 'America/New_York',
    'America/Los_Angeles', 'Asia/Dubai', 'Asia/Kolkata', 'Australia/Sydney', 'UTC',
  ]
})()

function validatePeriods(periods: SchedulePeriod[], label: string): string | null {
  if (periods.length === 0) return `${label} needs at least one working period.`
  const sorted = [...periods].sort((a, b) => a.startMinute - b.startMinute)
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].endMinute <= sorted[i].startMinute) return `${label}: a period must end after it starts.`
    if (i > 0 && sorted[i - 1].endMinute > sorted[i].startMinute) return `${label}: periods must not overlap.`
  }
  return null
}

export function BusinessScheduleSettings() {
  const { business } = useDashboardContext()
  const businessId = business?.id
  const schedule = useBusinessSchedule(businessId)
  const saveSchedule = useSaveBusinessSchedule(businessId)
  const saveException = useSaveScheduleException(businessId)
  const deleteException = useDeleteScheduleException(businessId)

  const [draftDays, setDraftDays] = useState<ScheduleDay[] | null>(null)
  const [draftZone, setDraftZone] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [exceptionDate, setExceptionDate] = useState('')
  const [exceptionClosed, setExceptionClosed] = useState(true)
  const [exceptionReason, setExceptionReason] = useState('')
  const [exceptionPeriods, setExceptionPeriods] = useState<SchedulePeriod[]>([
    { startMinute: 9 * 60, endMinute: 12 * 60 },
  ])

  const days = draftDays ?? schedule.data?.days ?? []
  const timeZone = draftZone ?? schedule.data?.timeZoneId ?? 'Africa/Nairobi'

  const patchDay = (dayOfWeek: number, patch: Partial<ScheduleDay>) => {
    const base = draftDays ?? schedule.data?.days ?? []
    setDraftDays(
      base.map((d) =>
        d.dayOfWeek === dayOfWeek
          ? { ...d, ...patch, periods: patch.periods ?? d.periods.map((p) => ({ ...p })) }
          : d,
      ),
    )
  }

  const setPeriod = (dayOfWeek: number, index: number, patch: Partial<SchedulePeriod>) => {
    const base = draftDays ?? schedule.data?.days ?? []
    const day = base.find((d) => d.dayOfWeek === dayOfWeek)
    if (!day) return
    patchDay(dayOfWeek, {
      periods: day.periods.map((p, i) => (i === index ? { ...p, ...patch } : p)),
    })
  }

  const addPeriod = (dayOfWeek: number) => {
    const day = (draftDays ?? schedule.data?.days ?? []).find((d) => d.dayOfWeek === dayOfWeek)
    if (!day) return
    const last = day.periods[day.periods.length - 1]
    const start = last ? Math.min(1380, last.endMinute) : 9 * 60
    patchDay(dayOfWeek, {
      periods: [...day.periods, { startMinute: start, endMinute: Math.min(1440, start + 120) }],
    })
  }

  const removePeriod = (dayOfWeek: number, index: number) => {
    const day = (draftDays ?? schedule.data?.days ?? []).find((d) => d.dayOfWeek === dayOfWeek)
    if (!day) return
    patchDay(dayOfWeek, { periods: day.periods.filter((_, i) => i !== index) })
  }

  const handleSave = async () => {
    setError(null)
    if (days.length !== 7) {
      setError('The week is incomplete. Reload and try again.')
      return
    }
    for (const day of days) {
      if (day.isClosed) continue
      const problem = validatePeriods(day.periods, DAY_NAMES[day.dayOfWeek])
      if (problem) {
        setError(problem)
        return
      }
    }
    try {
      await saveSchedule.mutateAsync({ timeZoneId: timeZone, days })
      setDraftDays(null)
      setDraftZone(null)
      toast.success('Operating hours saved')
    } catch (err) {
      setError(errorMessage(err, 'Could not save the operating hours. Please try again.'))
    }
  }

  const handleAddException = async () => {
    setError(null)
    if (!exceptionDate) {
      setError('Choose a date for the exception.')
      return
    }
    const problem = exceptionClosed ? null : validatePeriods(exceptionPeriods, 'Special hours')
    if (problem) {
      setError(problem)
      return
    }
    try {
      await saveException.mutateAsync({
        date: exceptionDate,
        isClosed: exceptionClosed,
        reason: exceptionReason.trim() || null,
        periods: exceptionClosed ? [] : exceptionPeriods,
      })
      toast.success('Exception saved')
      setExceptionDate('')
      setExceptionReason('')
      setExceptionClosed(true)
      setExceptionPeriods([{ startMinute: 9 * 60, endMinute: 12 * 60 }])
    } catch (err) {
      setError(errorMessage(err, 'Could not save the exception. Please try again.'))
    }
  }

  const handleDeleteException = async (id: string) => {
    setError(null)
    try {
      await deleteException.mutateAsync(id)
      toast.success('Exception removed')
    } catch (err) {
      setError(errorMessage(err, 'Could not remove the exception. Please try again.'))
    }
  }

  if (!businessId) {
    return (
      <Alert tone="warning" title="No business selected">
        This section belongs to a business workspace.
      </Alert>
    )
  }

  if (schedule.isPending) {
    return (
      <div className="space-y-[0.6rem]" aria-busy="true" aria-label="Loading schedule">
        <Skeleton className="h-[2.6rem] w-full" />
        <Skeleton className="h-[16rem] w-full" />
      </div>
    )
  }

  if (schedule.isError) {
    return (
      <Alert tone="danger" title="The schedule could not be loaded">
        <p>{errorMessage(schedule.error, 'Please try again.')}</p>
        <Button size="sm" className="mt-2" onClick={() => schedule.refetch()}>
          Try again
        </Button>
      </Alert>
    )
  }

  const exceptions = schedule.data?.exceptions ?? []

  return (
    <div className="space-y-[1.1rem]">
      {error ? (
        <Alert tone="danger" title="Check the schedule" onDismiss={() => setError(null)}>
          {error}
        </Alert>
      ) : null}

      <SectionCard
        title="Operating hours"
        description="When the business is open for bookings. Each staff member's own availability is applied on top of this."
        action={
          <Button variant="primary" size="sm" onClick={() => void handleSave()} disabled={saveSchedule.isPending}>
            {saveSchedule.isPending ? 'Saving...' : 'Save hours'}
          </Button>
        }
      >
        <Field label="Time zone" htmlFor="schedule-timezone" hint="Times below are local to this zone.">
          <Select
            id="schedule-timezone"
            value={timeZone}
            onChange={(e) => setDraftZone(e.target.value)}
            className="w-full sm:w-[18rem]"
          >
            {TIME_ZONES.map((zone) => (
              <option key={zone} value={zone}>
                {zone}
              </option>
            ))}
          </Select>
        </Field>

        <ul className="mt-4 divide-y divide-line">
          {WEEK_ORDER.map((dayOfWeek) => {
            const day = days.find((d) => d.dayOfWeek === dayOfWeek)
            if (!day) return null
            return (
              <li key={dayOfWeek} className="py-[0.9rem]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="w-[6.5rem] text-label font-semibold">{DAY_NAMES[dayOfWeek]}</span>
                    <Checkbox
                      checked={day.isClosed}
                      onCheckedChange={() => patchDay(dayOfWeek, { isClosed: !day.isClosed })}
                      label="Closed"
                    />
                  </div>
                  {!day.isClosed ? (
                    <Button variant="ghost" size="sm" onClick={() => addPeriod(dayOfWeek)}>
                      <Plus className="size-4" aria-hidden="true" />
                      Add period
                    </Button>
                  ) : null}
                </div>

                {day.isClosed ? (
                  <p className="mt-[0.3rem] text-meta text-subtle">Closed all day.</p>
                ) : (
                  <div className="mt-[0.5rem] flex flex-col gap-[0.4rem]">
                    {day.periods.length === 0 ? (
                      <p className="text-meta text-danger-ink">Add at least one period.</p>
                    ) : null}
                    {day.periods.map((period, index) => (
                      <div key={index} className="flex flex-wrap items-center gap-[0.4rem]">
                        <Input
                          type="time"
                          aria-label={`${DAY_NAMES[dayOfWeek]} period ${index + 1} start`}
                          value={minutesToTime(period.startMinute)}
                          onChange={(e) => setPeriod(dayOfWeek, index, { startMinute: timeToMinutes(e.target.value) })}
                          className="w-[7.5rem]"
                        />
                        <span className="text-meta text-subtle">to</span>
                        <Input
                          type="time"
                          aria-label={`${DAY_NAMES[dayOfWeek]} period ${index + 1} end`}
                          value={minutesToTime(period.endMinute)}
                          onChange={(e) => setPeriod(dayOfWeek, index, { endMinute: timeToMinutes(e.target.value) })}
                          className="w-[7.5rem]"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Remove ${DAY_NAMES[dayOfWeek]} period ${index + 1}`}
                          onClick={() => removePeriod(dayOfWeek, index)}
                        >
                          <X className="size-4" aria-hidden="true" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </SectionCard>

      <SectionCard
        title="Exceptions"
        description="Holidays, closures or one-off hours. An exception replaces the weekly hours for its date."
      >
        {exceptions.length === 0 ? (
          <EmptyState title="No exceptions" description="Add a public holiday, closure or special day." />
        ) : (
          <ul className="divide-y divide-line">
            {exceptions.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-[0.8rem]">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-label font-semibold">
                    {item.date}
                    <Badge tone={item.isClosed ? 'danger' : 'info'}>
                      {item.isClosed ? 'Closed' : 'Special hours'}
                    </Badge>
                  </p>
                  <p className="text-meta text-muted">
                    {item.isClosed
                      ? item.reason || 'Closed all day'
                      : `${item.periods.map((p) => `${minutesToTime(p.startMinute)}-${minutesToTime(p.endMinute)}`).join(', ')}${item.reason ? ` - ${item.reason}` : ''}`}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void handleDeleteException(item.id)}
                  disabled={deleteException.isPending}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 rounded-md border border-line p-[0.9rem]">
          <p className="text-label font-semibold">Add an exception</p>
          <div className="mt-[0.6rem] grid gap-[0.7rem] sm:grid-cols-[10rem_auto_1fr] sm:items-end">
            <Field label="Date" htmlFor="exception-date">
              <Input
                id="exception-date"
                type="date"
                value={exceptionDate}
                onChange={(e) => setExceptionDate(e.target.value)}
                className="w-full"
              />
            </Field>
            <div className="flex items-center gap-3 pb-[0.6rem]">
              <Checkbox
                checked={exceptionClosed}
                onCheckedChange={() => setExceptionClosed((value) => !value)}
                label="Closed all day"
              />
            </div>
            <Field label="Reason" htmlFor="exception-reason">
              <Input
                id="exception-reason"
                value={exceptionReason}
                onChange={(e) => setExceptionReason(e.target.value)}
                placeholder="e.g. Public holiday"
                className="w-full"
              />
            </Field>
          </div>

          {!exceptionClosed ? (
            <div className="mt-[0.7rem] flex flex-col gap-[0.4rem]">
              {exceptionPeriods.map((period, index) => (
                <div key={index} className="flex flex-wrap items-center gap-[0.4rem]">
                  <Input
                    type="time"
                    aria-label={`Exception period ${index + 1} start`}
                    value={minutesToTime(period.startMinute)}
                    onChange={(e) =>
                      setExceptionPeriods((prev) =>
                        prev.map((p, i) => (i === index ? { ...p, startMinute: timeToMinutes(e.target.value) } : p)),
                      )
                    }
                    className="w-[7.5rem]"
                  />
                  <span className="text-meta text-subtle">to</span>
                  <Input
                    type="time"
                    aria-label={`Exception period ${index + 1} end`}
                    value={minutesToTime(period.endMinute)}
                    onChange={(e) =>
                      setExceptionPeriods((prev) =>
                        prev.map((p, i) => (i === index ? { ...p, endMinute: timeToMinutes(e.target.value) } : p)),
                      )
                    }
                    className="w-[7.5rem]"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove exception period ${index + 1}`}
                    onClick={() => setExceptionPeriods((prev) => prev.filter((_, i) => i !== index))}
                  >
                    <X className="size-4" aria-hidden="true" />
                  </Button>
                </div>
              ))}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExceptionPeriods((prev) => [...prev, { startMinute: 12 * 60, endMinute: 15 * 60 }])}
              >
                <Plus className="size-4" aria-hidden="true" />
                Add period
              </Button>
            </div>
          ) : null}

          <div className="mt-[0.8rem]">
            <Button
              variant="default"
              size="sm"
              onClick={() => void handleAddException()}
              disabled={saveException.isPending}
            >
              {saveException.isPending ? 'Saving...' : 'Add exception'}
            </Button>
          </div>
        </div>
      </SectionCard>
    </div>
  )
}
