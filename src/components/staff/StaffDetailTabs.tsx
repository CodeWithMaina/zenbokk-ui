import { useState } from 'react'
import { toast } from 'sonner'
import { Clock, Plus, Trash2 } from 'lucide-react'
import type {
  AppointmentDashboardItem,
  StaffAvailabilityDay,
  StaffDetail,
  StaffServiceLink,
} from '../../lib/api/types'
import {
  availabilitySourceLabel,
  formatWindow,
  groupTimeOff,
  minutesToTime,
  sortWeek,
  staffCompleteness,
  timeToMinutes,
  weeklyMinutes,
} from '../../lib/staff'
import { formatDate, formatDuration, money, pluralize } from '../../lib/format'
import { Alert } from '../ui/alert'
import { StatusPill } from '../ui/badge'
import { Button } from '../ui/button'
import { SectionCard } from '../ui/card'
import { ConfirmDialog } from '../ui/confirm-dialog'
import { DescriptionRow } from '../ui/description-list'
import { Drawer } from '../ui/drawer'
import { EmptyState } from '../ui/empty-state'
import { Field, Input } from '../ui/field'
import { MetricGrid } from '../ui/metric-tile'
import { Note } from '../ui/note'
import { OptionRow } from '../ui/option-row'
import { Progress } from '../ui/progress'
import { Switch } from '../ui/switch'

/**
 * This member's bookings, read from the owner appointments endpoint.
 *
 * The transitions (confirm, complete, no-show) live in the appointments
 * console, which owns that state machine — so this tab reports the schedule and
 * links there rather than offering a second, competing set of actions.
 */
export function StaffBookingsTab({
  appointments,
  enabled,
  loading,
}: {
  appointments: readonly AppointmentDashboardItem[]
  enabled: boolean
  loading: boolean
}) {
  if (!enabled) {
    return (
      <Alert tone="info" title="Appointments aren’t in this plan">
        Bookings appear here when the appointments module is enabled for your business.
      </Alert>
    )
  }

  if (loading) {
    return <p className="text-meta text-muted">Loading bookings…</p>
  }

  return (
    <SectionCard
      title="Bookings"
      description="Appointments assigned to this teammate, most recent first."
    >
      {appointments.length === 0 ? (
        <EmptyState
          title="No bookings yet"
          description="Appointments assigned to this teammate appear here."
        />
      ) : (
        <ul className="m-0 list-none divide-y divide-line p-0">
          {appointments.map((appointment) => (
            <li
              key={appointment.id}
              className="flex flex-wrap items-center justify-between gap-[0.6rem] py-[0.7rem] first:pt-0 last:pb-0"
            >
              <div className="min-w-0">
                <p className="text-label font-semibold">{appointment.serviceName || 'Appointment'}</p>
                <p className="text-caption text-muted">
                  {formatDate(appointment.scheduledAt)} · {appointment.customerName}
                </p>
              </div>
              <StatusPill status={appointment.status}>
                {appointment.status.replace(/_/g, ' ')}
              </StatusPill>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  )
}

/** The headline numbers the profile can state from real API data. */
export function StaffOverviewTab({
  detail,
  attendanceEnabled,
  clockedIn,
}: {
  detail: StaffDetail
  attendanceEnabled: boolean
  clockedIn: boolean
}) {
  const completeness = staffCompleteness(detail)
  const goalType = detail.dailyGoalType === 'appointments' ? 'bookings' : 'stamps'
  const goalValue = goalType === 'bookings' ? detail.appointmentDailyGoal : detail.dailyGoal
  const achieved = goalType === 'bookings' ? detail.appointmentsToday : detail.stampsToday

  return (
    <div className="space-y-[0.9rem]">
      <MetricGrid
        items={[
          { value: detail.appointmentsToday, label: 'Bookings today' },
          { value: detail.appointmentsLast7d, label: 'Bookings this week' },
          { value: detail.stampsToday, label: 'Stamps today' },
          { value: detail.stampsLast7d, label: 'Stamps this week' },
        ]}
      />

      <SectionCard title="Today’s goal" description={`The business tracks daily ${goalType}.`}>
        {goalValue === null ? (
          <p className="text-meta text-muted">
            No daily goal is set for this teammate yet — set one from their profile, or a business
            default from settings.
          </p>
        ) : (
          <Progress
            value={achieved}
            max={goalValue}
            label={`${achieved} of ${goalValue} ${goalType} today`}
            showValue
            tone={achieved >= goalValue ? 'success' : 'accent'}
          />
        )}
      </SectionCard>

      <div className="grid gap-[0.9rem] md:grid-cols-2">
        <SectionCard title="Employment">
          <DescriptionRow label="Job title" value={detail.positionName ?? 'Not set'} />
          <DescriptionRow label="Joined" value={formatDate(detail.joinedAt)} />
          <DescriptionRow label="Membership" value={detail.membershipStatus} />
          {detail.endedAt ? (
            <DescriptionRow label="Deactivated" value={formatDate(detail.endedAt)} />
          ) : null}
          <DescriptionRow
            label="Last activity"
            value={detail.lastActivityAt ? formatDate(detail.lastActivityAt) : 'Never'}
          />
          <DescriptionRow
            label="Services assigned"
            value={pluralize(detail.services.length, 'service')}
          />
        </SectionCard>

        <SectionCard title="Profile completeness">
          <div className="mb-[0.75rem] flex items-center justify-between gap-[0.6rem]">
            <b className="text-metric tabular">{completeness.percent}%</b>
            <StatusPill status={completeness.percent === 100 ? 'active' : 'pending'}>
              {completeness.percent === 100 ? 'Complete' : 'Needs attention'}
            </StatusPill>
          </div>
          <Progress value={completeness.percent} ariaLabel="Profile completeness" />
          <ul className="mt-[0.75rem] m-0 list-none space-y-[0.35rem] p-0">
            {completeness.items.map((item) => (
              <li key={item.label} className="flex items-center gap-[0.5rem] text-meta">
                <span
                  aria-hidden="true"
                  className={
                    item.done
                      ? 'grid size-[1.15rem] place-items-center rounded-round bg-accent text-[0.7rem] text-on-accent'
                      : 'grid size-[1.15rem] place-items-center rounded-round bg-neutral-soft text-[0.7rem] text-muted'
                  }
                >
                  {item.done ? '✓' : ''}
                </span>
                <span className={item.done ? '' : 'text-muted'}>{item.label}</span>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>

      {attendanceEnabled ? (
        <SectionCard title="Attendance today">
          <p className="flex items-center gap-[0.5rem] text-meta">
            <Clock className="size-4" aria-hidden="true" />
            {clockedIn ? 'Currently clocked in.' : 'Not clocked in right now.'}
          </p>
          <p className="mt-[0.3rem] text-caption text-muted">
            Open the Attendance tab for today’s shift and this member’s clock history.
          </p>
        </SectionCard>
      ) : null}
    </div>
  )
}

/** The services this member delivers, with one atomic save per change. */
export function StaffServicesTab({
  detail,
  services,
  enabled,
  canManage,
  onToggleService,
  saving,
}: {
  detail: StaffDetail
  /** Every service in the catalogue, for the picker. */
  services: readonly { id: string; name: string; durationMinutes: number; price: number }[]
  enabled: boolean
  canManage: boolean
  onToggleService: (serviceId: string, assigned: boolean) => void
  saving: boolean
}) {
  const [pickerOpen, setPickerOpen] = useState(false)

  if (!enabled) {
    return (
      <Alert tone="info" title="The service catalogue isn’t in this plan">
        Assigning services needs the service catalogue module, because a staff member can only
        deliver services the business offers.
      </Alert>
    )
  }

  const assignedIds = new Set(detail.services.map((service: StaffServiceLink) => service.serviceId))

  return (
    <div className="space-y-[0.9rem]">
      <SectionCard
        title={`Assigned services · ${detail.services.length}`}
        description="A customer can only book this teammate for a service assigned here."
        action={
          canManage ? (
            <Button size="sm" onClick={() => setPickerOpen(true)}>
              <Plus className="size-3.5" aria-hidden="true" />
              Assign
            </Button>
          ) : null
        }
      >
        {detail.services.length === 0 ? (
          <EmptyState
            icon={<Plus className="size-5" />}
            title="No services assigned"
            description="Assign at least one service so this teammate can be booked."
          />
        ) : (
          <ul className="m-0 list-none divide-y divide-line p-0">
            {detail.services.map((service) => (
              <li
                key={service.serviceId}
                className="flex flex-wrap items-center justify-between gap-[0.6rem] py-[0.7rem] first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="text-label font-semibold">{service.name}</p>
                  <p className="text-caption text-muted">
                    {service.categoryName ? `${service.categoryName} · ` : ''}
                    {formatDuration(service.durationMinutes)}
                    {service.price === null ? '' : ` · ${money(service.price)}`}
                  </p>
                </div>

                <div className="flex items-center gap-[0.5rem]">
                  {!service.isActive ? <StatusPill status="inactive">Paused</StatusPill> : null}
                  {!service.showcase ? <StatusPill status="hidden">Not on storefront</StatusPill> : null}
                  {canManage ? (
                    <Button
                      size="sm"
                      variant="danger"
                      disabled={saving}
                      onClick={() => onToggleService(service.serviceId, false)}
                    >
                      Remove
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <Drawer
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Assign services"
        description="Tick everything this teammate can deliver."
        footer={
          <div className="flex w-full justify-end">
            <Button variant="primary" onClick={() => setPickerOpen(false)}>
              Done
            </Button>
          </div>
        }
      >
        {services.length === 0 ? (
          <EmptyState
            title="No services in the catalogue yet"
            description="Add services first, then assign them here."
          />
        ) : (
          <ul className="m-0 list-none space-y-[0.4rem] p-0">
            {services.map((service) => (
              <li key={service.id}>
                <OptionRow
                  title={service.name}
                  description={`${formatDuration(service.durationMinutes)} · ${money(service.price)}`}
                  selected={assignedIds.has(service.id)}
                  disabled={saving}
                  onSelectedChange={(selected) => onToggleService(service.id, selected)}
                />
              </li>
            ))}
          </ul>
        )}
      </Drawer>
    </div>
  )
}


/** One weekday row in the working-hours editor: a switch plus its four times. */
function ScheduleDayRow({
  day,
  disabled,
  onPatch,
}: {
  day: StaffAvailabilityDay
  disabled: boolean
  onPatch: (changes: Partial<StaffAvailabilityDay>) => void
}) {
  const timeField = (
    key: 'startMinute' | 'endMinute' | 'breakStartMinute' | 'breakEndMinute',
    label: string,
    optional = false,
  ) => (
    <Field label={label} optional={optional} htmlFor={`${key}-${day.dayOfWeek}`}>
      <Input
        id={`${key}-${day.dayOfWeek}`}
        type="time"
        step={900}
        value={day[key] === null ? '' : minutesToTime(day[key])}
        disabled={disabled}
        onChange={(event) => onPatch({ [key]: timeToMinutes(event.target.value) })}
      />
    </Field>
  )

  return (
    <li className="py-[0.7rem] first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-center justify-between gap-[0.6rem]">
        <div className="min-w-0">
          <p className="text-label font-semibold">{day.dayName}</p>
          <p className="text-caption text-muted">
            {day.isWorking
              ? `${formatWindow(day.startMinute, day.endMinute)}${
                  day.breakStartMinute !== null && day.breakEndMinute !== null
                    ? ` · break ${formatWindow(day.breakStartMinute, day.breakEndMinute)}`
                    : ''
                }`
              : 'Day off'}
          </p>
        </div>

        <Switch
          checked={day.isWorking}
          label={`${day.dayName} working`}
          disabled={disabled}
          onCheckedChange={(checked) =>
            onPatch({
              isWorking: checked,
              startMinute: checked ? day.startMinute || 540 : 0,
              endMinute: checked ? day.endMinute || 1020 : 0,
              breakStartMinute: checked ? day.breakStartMinute : null,
              breakEndMinute: checked ? day.breakEndMinute : null,
            })
          }
        />
      </div>

      {day.isWorking ? (
        <div className="mt-[0.6rem] grid grid-cols-2 gap-[0.5rem] sm:grid-cols-4">
          {timeField('startMinute', 'Start')}
          {timeField('endMinute', 'End')}
          {timeField('breakStartMinute', 'Break from', true)}
          {timeField('breakEndMinute', 'Break to', true)}
        </div>
      ) : null}
    </li>
  )
}



/**
 * Dated time off: the exceptions that override the recurring week.
 *
 * The rows listed are the dates the API reports as *not working* inside the
 * horizon, grouped into ranges — a plain working day is the roster, not an
 * exception, so it is not echoed back here.
 */
function StaffTimeOffCard({
  detail,
  canManage,
  saving,
  open,
  onOpenChange,
  draft,
  onDraftChange,
  onAdd,
  onRemove,
}: {
  detail: StaffDetail
  canManage: boolean
  saving: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
  draft: { from: string; to: string; reason: string }
  onDraftChange: (draft: { from: string; to: string; reason: string }) => void
  onAdd: (input: { from: string; to: string; reason: string }) => void
  onRemove: (date: string) => void
}) {
  const ranges = groupTimeOff(detail.timeOff)

  return (
    <SectionCard
      title="Time off"
      description="Dated days off. They override the working week for those dates."
      action={
        canManage ? (
          <Button size="sm" onClick={() => onOpenChange(true)} disabled={saving}>
            <Plus className="size-3.5" aria-hidden="true" />
            Add time off
          </Button>
        ) : null
      }
    >
      {ranges.length === 0 ? (
        <EmptyState
          icon={<Clock className="size-5" />}
          title="No time off booked"
          description="Days off added here stop this teammate being offered on those dates."
        />
      ) : (
        <ul className="m-0 list-none divide-y divide-line p-0">
          {ranges.map((range) => (
            <li
              key={range.from}
              className="flex flex-wrap items-center justify-between gap-[0.6rem] py-[0.7rem] first:pt-0 last:pb-0"
            >
              <div className="min-w-0">
                <p className="text-label font-semibold">
                  {range.from === range.to
                    ? formatDate(range.from)
                    : `${formatDate(range.from)} – ${formatDate(range.to)}`}
                </p>
                <p className="text-caption text-muted">
                  {pluralize(range.days, 'day')}
                  {range.reason ? ` · ${range.reason}` : ''}
                </p>
              </div>
              {canManage ? (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={saving}
                  onClick={() => onRemove(range.from)}
                >
                  <Trash2 className="size-3.5" aria-hidden="true" />
                  Remove
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <Drawer
        open={open}
        onClose={() => onOpenChange(false)}
        title="Add time off"
        description="The dates become unavailable for new bookings."
        footer={
          <div className="flex w-full justify-end gap-[0.5rem]">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={saving}
              onClick={() => {
                if (!draft.from || !draft.to) {
                  toast.error('Choose both dates.')
                  return
                }
                if (draft.to < draft.from) {
                  toast.error('The end date must be on or after the start date.')
                  return
                }
                onAdd(draft)
                onDraftChange({ from: '', to: '', reason: '' })
                onOpenChange(false)
              }}
            >
              Save
            </Button>
          </div>
        }
      >
        <div className="space-y-[0.8rem]">
          <Field label="From" htmlFor="time-off-from">
            <Input
              id="time-off-from"
              type="date"
              value={draft.from}
              onChange={(event) => onDraftChange({ ...draft, from: event.target.value })}
            />
          </Field>
          <Field label="To" htmlFor="time-off-to">
            <Input
              id="time-off-to"
              type="date"
              value={draft.to}
              onChange={(event) => onDraftChange({ ...draft, to: event.target.value })}
            />
          </Field>
          <Field label="Reason" optional htmlFor="time-off-reason">
            <Input
              id="time-off-reason"
              value={draft.reason}
              maxLength={200}
              placeholder="Annual leave"
              onChange={(event) => onDraftChange({ ...draft, reason: event.target.value })}
            />
          </Field>
        </div>
      </Drawer>
    </SectionCard>
  )
}

/**
 * The recurring working week, its breaks, and dated time off.
 *
 * What is saved here is what the booking engine offers customers: the API
 * resolves a dated override first, then this week, then the business's own
 * booking window — which is why the source of the week is stated, not assumed.
 */
export function StaffScheduleTab({
  detail,
  canManage,
  saving,
  onSaveWeek,
  onClearWeek,
  onAddTimeOff,
  onRemoveTimeOff,
}: {
  detail: StaffDetail
  canManage: boolean
  saving: boolean
  onSaveWeek: (days: StaffAvailabilityDay[]) => void
  onClearWeek: () => void
  onAddTimeOff: (input: { from: string; to: string; reason: string }) => void
  onRemoveTimeOff: (date: string) => void
}) {
  const [days, setDays] = useState<StaffAvailabilityDay[]>(() => sortWeek(detail.availability))
  const [timeOffOpen, setTimeOffOpen] = useState(false)
  const [clearOpen, setClearOpen] = useState(false)
  const [timeOff, setTimeOff] = useState({ from: '', to: '', reason: '' })
  const [error, setError] = useState<string | null>(null)

  const patch = (dayOfWeek: number, changes: Partial<StaffAvailabilityDay>) => {
    setDays((current) =>
      current.map((day) => (day.dayOfWeek === dayOfWeek ? { ...day, ...changes } : day)),
    )
  }

  const save = () => {
    // The same rules the API enforces, checked here so the owner sees the reason
    // without a round trip.
    for (const day of days) {
      if (!day.isWorking) continue
      if (day.endMinute <= day.startMinute) {
        setError(`${day.dayName}: the end time must be after the start time.`)
        return
      }
      if (
        day.breakStartMinute !== null &&
        day.breakEndMinute !== null &&
        (day.breakEndMinute <= day.breakStartMinute ||
          day.breakStartMinute < day.startMinute ||
          day.breakEndMinute > day.endMinute)
      ) {
        setError(`${day.dayName}: the break must sit inside the working hours.`)
        return
      }
    }

    setError(null)
    onSaveWeek(days)
  }

  const total = weeklyMinutes(days)
  const openDays = days.filter((day) => day.isWorking).length

  return (
    <div className="space-y-[0.9rem]">
      {error ? <Alert tone="danger">{error}</Alert> : null}

      <SectionCard
        title="Working hours"
        description={`${Math.round((total / 60) * 10) / 10} hours a week across ${pluralize(openDays, 'day')}.`}
        action={
          canManage ? (
            <div className="flex flex-wrap gap-[0.5rem]">
              {detail.availabilitySource === 'pattern' ? (
                <Button size="sm" variant="ghost" onClick={() => setClearOpen(true)} disabled={saving}>
                  Clear week
                </Button>
              ) : null}
              <Button size="sm" variant="primary" onClick={save} disabled={saving}>
                {saving ? 'Saving…' : 'Save hours'}
              </Button>
            </div>
          ) : null
        }
      >
        <p className="mb-[0.8rem] text-caption text-muted">
          Source: {availabilitySourceLabel(detail.availabilitySource)}.
        </p>

        <ul className="m-0 list-none divide-y divide-line p-0">
          {days.map((day) => (
            <ScheduleDayRow
              key={day.dayOfWeek}
              day={day}
              disabled={!canManage || saving}
              onPatch={(changes) => patch(day.dayOfWeek, changes)}
            />
          ))}
        </ul>

        <Note className="mt-[0.9rem]">
          A break splits the day, so no booking can be placed across it. Dated time off always wins
          over the week for the dates it covers.
        </Note>
      </SectionCard>

      <StaffTimeOffCard
        detail={detail}
        canManage={canManage}
        saving={saving}
        open={timeOffOpen}
        onOpenChange={setTimeOffOpen}
        draft={timeOff}
        onDraftChange={setTimeOff}
        onAdd={onAddTimeOff}
        onRemove={onRemoveTimeOff}
      />


      <ConfirmDialog
        open={clearOpen}
        title="Clear the saved working week?"
        description="This teammate then follows their dated roster, and failing that the business's own booking hours. Their time off is kept."
        confirmLabel="Clear week"
        tone="danger"
        onCancel={() => setClearOpen(false)}
        onConfirm={() => {
          setClearOpen(false)
          onClearWeek()
        }}
      />
    </div>
  )
}


/** Storefront visibility and the personal details the business owns. */
export function StaffProfileTab({
  detail,
  canManage,
  saving,
  onToggle,
  onEdit,
}: {
  detail: StaffDetail
  canManage: boolean
  saving: boolean
  onToggle: (field: 'isPublic' | 'isBookable', value: boolean) => void
  onEdit: () => void
}) {
  const completeness = staffCompleteness(detail)

  return (
    <div className="grid gap-[0.9rem] md:grid-cols-2">
      <SectionCard
        title="Storefront settings"
        description="What customers see, and whether they can book this person."
      >
        <ul className="m-0 list-none divide-y divide-line p-0">
          <li className="flex items-center justify-between gap-[0.8rem] py-[0.7rem] first:pt-0">
            <div className="min-w-0">
              <p className="text-label font-semibold">Visible on storefront</p>
              <p className="text-caption text-muted">List this teammate publicly on your page.</p>
            </div>
            <Switch
              checked={detail.isPublic}
              label="Visible on storefront"
              disabled={!canManage || saving}
              onCheckedChange={(value) => onToggle('isPublic', value)}
            />
          </li>
          <li className="flex items-center justify-between gap-[0.8rem] py-[0.7rem] last:pb-0">
            <div className="min-w-0">
              <p className="text-label font-semibold">Bookable online</p>
              <p className="text-caption text-muted">Customers can pick them when booking.</p>
            </div>
            <Switch
              checked={detail.isBookable}
              label="Bookable online"
              disabled={!canManage || saving}
              onCheckedChange={(value) => onToggle('isBookable', value)}
            />
          </li>
        </ul>

        <Note className="mt-[0.9rem]">
          {detail.isBookable
            ? 'While this is on, their assigned services and working hours decide which slots customers can book.'
            : 'While this is off, they are not offered in booking — their history is untouched.'}
        </Note>
      </SectionCard>

      <SectionCard
        title="Personal details"
        description={`${completeness.percent}% complete.`}
        action={
          canManage ? (
            <Button size="sm" onClick={onEdit}>
              Edit
            </Button>
          ) : null
        }
      >
        <DescriptionRow label="Full name" value={detail.fullName} />
        <DescriptionRow label="Sign-in email" value={detail.email} />
        <DescriptionRow
          label="Phone"
          value={
            detail.phoneNumber ? detail.phoneNumber : <span className="text-muted">Not added</span>
          }
        />
        <DescriptionRow label="Job title" value={detail.positionName ?? 'Not set'} />
        <DescriptionRow
          label="Biography"
          value={detail.bio ? detail.bio : <span className="text-muted">Not added</span>}
        />
        <DescriptionRow label="Staff ID" value={detail.userId.slice(0, 8).toUpperCase()} />
        <Progress
          className="mt-[0.9rem]"
          value={completeness.percent}
          label="Profile completeness"
          showValue
        />
      </SectionCard>
    </div>
  )
}


/** Today's clock state plus this member's clock history. */
export function StaffAttendanceTab({
  enabled,
  canManage,
  clocking,
  state,
  history,
  loading,
  onClockIn,
  onClockOut,
}: {
  enabled: boolean
  canManage: boolean
  clocking: boolean
  state: string | null
  history: readonly {
    id: string
    eventType: string
    occurredAt: string
    workedMinutes: number | null
    locationName: string | null
  }[]
  loading: boolean
  onClockIn: () => void
  onClockOut: () => void
}) {
  if (!enabled) {
    return (
      <Alert tone="info" title="Attendance isn’t in this plan">
        Attendance history and clocking appear here when the attendance module is enabled for your
        business.
      </Alert>
    )
  }

  const clockedIn = state === 'clocked_in'

  return (
    <div className="space-y-[0.9rem]">
      <SectionCard
        title="Today"
        description={clockedIn ? 'Currently clocked in.' : 'Not clocked in right now.'}
        action={
          canManage ? (
            <Button variant="primary" disabled={clocking} onClick={clockedIn ? onClockOut : onClockIn}>
              <Clock className="size-4" aria-hidden="true" />
              {clockedIn ? 'Clock out' : 'Clock in'}
            </Button>
          ) : null
        }
      >
        <p className="text-meta text-muted">
          A manual clock records a real attendance event against this teammate, so the ledger stays
          complete when someone forgets to scan.
        </p>
      </SectionCard>

      <SectionCard title="Clock history" description="Newest first.">
        {loading ? (
          <p className="text-meta text-muted">Loading history…</p>
        ) : history.length === 0 ? (
          <EmptyState
            icon={<Clock className="size-5" />}
            title="No clock events yet"
            description="Scans and manual entries both appear here."
          />
        ) : (
          <ul className="m-0 list-none divide-y divide-line p-0">
            {history.map((event) => (
              <li
                key={event.id}
                className="flex flex-wrap items-center justify-between gap-[0.6rem] py-[0.7rem] first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="text-label font-semibold">
                    {event.eventType === 'CLOCK_IN' ? 'Clocked in' : 'Clocked out'}
                  </p>
                  <p className="text-caption text-muted">
                    {formatDate(event.occurredAt)}
                    {event.locationName ? ` · ${event.locationName}` : ''}
                  </p>
                </div>
                {event.workedMinutes !== null ? (
                  <span className="text-meta text-muted tabular">
                    {formatDuration(event.workedMinutes)}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  )
}

/** What the business owes this member, from the commission ledger. */
export function StaffCommissionTab({
  enabled,
  loading,
  balance,
}: {
  enabled: boolean
  loading: boolean
  balance: {
    currency: string
    pendingAmount: number
    approvedAmount: number
    payableAmount: number
    paidAmount: number
    lifetimeEarnedAmount: number
    outstandingAmount: number
  } | null
}) {
  if (!enabled) {
    return (
      <Alert tone="info" title="Commissions aren’t in this plan">
        Commission balances appear here when the commissions module is enabled for your business.
      </Alert>
    )
  }

  if (loading) return <p className="text-meta text-muted">Loading commission…</p>

  if (!balance) {
    return (
      <EmptyState
        icon={<Clock className="size-5" />}
        title="No commission recorded"
        description="Completed services accrue commission once the ledger is configured."
      />
    )
  }

  return (
    <div className="space-y-[0.9rem]">
      <MetricGrid
        items={[
          { value: money(balance.outstandingAmount), label: 'Outstanding' },
          { value: money(balance.payableAmount), label: 'Ready to pay' },
          { value: money(balance.paidAmount), label: 'Paid out' },
          { value: money(balance.lifetimeEarnedAmount), label: 'Lifetime earned' },
        ]}
      />

      <SectionCard title="Breakdown">
        <DescriptionRow label="Pending" value={money(balance.pendingAmount)} />
        <DescriptionRow label="Approved" value={money(balance.approvedAmount)} />
        <DescriptionRow label="Payable" value={money(balance.payableAmount)} />
        <DescriptionRow label="Paid" value={money(balance.paidAmount)} />
        <DescriptionRow label="Currency" value={balance.currency} />
      </SectionCard>
    </div>
  )
}

