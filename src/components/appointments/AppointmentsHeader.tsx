import { CalendarDays, ChevronLeft, ChevronRight, ListOrdered, Plus, Table2 } from 'lucide-react'
import type { ReactNode } from 'react'
import type { AppointmentView } from '../../lib/appointments'
import { pluralize } from '../../lib/format'
import { Button } from '../ui/button'
import { SegmentedControl } from '../ui/segmented-control'

const VIEW_OPTIONS: readonly { value: AppointmentView; label: string; icon: ReactNode }[] = [
  { value: 'calendar', label: 'Calendar', icon: <CalendarDays className="size-3.5" aria-hidden="true" /> },
  { value: 'table', label: 'Table', icon: <Table2 className="size-3.5" aria-hidden="true" /> },
  { value: 'timeline', label: 'Timeline', icon: <ListOrdered className="size-3.5" aria-hidden="true" /> },
]

const VIEW_NOUN: Record<AppointmentView, string> = {
  calendar: 'Calendar',
  table: 'Table',
  timeline: 'Timeline',
}

/** The date navigation the header owns. Every view steps through dates the same way. */
export type AppointmentsHeaderNavigation = {
  label: string
  onPrevious: () => void
  onNext: () => void
  onToday: () => void
  /** Jump straight to a date (`yyyy-MM-dd`). */
  onPickDate?: (value: string) => void
  /** The date shown in the picker — the first day of the period on screen. */
  dateValue?: string
  /** An unbounded period ("all dates") has nothing to step to. */
  disabled?: boolean
  /** True when the period already contains today, so "Today" changes nothing. */
  isToday?: boolean
}

export type AppointmentsHeaderProps = {
  view: AppointmentView
  onViewChange: (view: AppointmentView) => void
  /** Appointments today, excluding cancelled ones — the header's headline count. */
  todayCount: number
  onNewBooking: () => void
  /** False when the caller's role may view but not book. */
  canBook: boolean
  /** Which dates the screen is showing, and how to move them. */
  navigation?: AppointmentsHeaderNavigation
  busy?: boolean
}

/**
 * The Appointments page heading.
 *
 * The redesign gives the top of the page one job each:
 *
 * 1. **Where you are** — a dedicated period bar with large prev/next targets, the period
 *    name, a date jump and Today. This is the control an operator uses constantly, so it
 *    is the most prominent thing on the page rather than a cluster of small buttons at the
 *    end of a toolbar.
 * 2. **What you are looking at** — the view switch, grouped with the heading.
 * 3. **What you can do** — the primary "New booking" action, visually distinct.
 *
 * Filters and search deliberately live below, in the secondary controls, so the header
 * never becomes the crowded toolbar the old layout had.
 */
export function AppointmentsHeader({
  view,
  onViewChange,
  todayCount,
  onNewBooking,
  canBook,
  navigation,
  busy = false,
}: AppointmentsHeaderProps) {
  return (
    <header className="mb-[0.9rem]">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <h1 className="text-title font-bold tracking-tight">Appointments</h1>
          <p className="mt-[0.15rem] text-meta text-muted">
            {VIEW_NOUN[view]} view · {pluralize(todayCount, "appointment")} today
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-[0.5rem] max-sm:w-full">
          <SegmentedControl
            label="Appointment view"
            className="max-sm:hidden"
            value={view}
            onValueChange={onViewChange}
            options={VIEW_OPTIONS.map((option) => ({
              value: option.value,
              icon: option.icon,
              label: <span className="max-md:sr-only">{option.label}</span>,
            }))}
          />
          {canBook ? (
            <Button variant="primary" onClick={onNewBooking} disabled={busy} className="max-sm:flex-1">
              <Plus className="size-4" aria-hidden="true" />
              New booking
            </Button>
          ) : null}
        </div>
      </div>

      {navigation ? (
        <div className="period-bar mt-[0.8rem]">
          <div className="period-bar-buttons">
            <Button
              size="icon"
              aria-label="Previous period"
              onClick={navigation.onPrevious}
              disabled={busy || navigation.disabled}
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
            </Button>
            <Button
              size="icon"
              aria-label="Next period"
              onClick={navigation.onNext}
              disabled={busy || navigation.disabled}
            >
              <ChevronRight className="size-4" aria-hidden="true" />
            </Button>
          </div>

          <p className="period-bar-label" aria-live="polite">
            {navigation.label}
          </p>

          <div className="period-bar-actions">
            <Button
              onClick={navigation.onToday}
              disabled={busy}
              aria-pressed={navigation.isToday || undefined}
              className={navigation.isToday ? "is-current" : undefined}
            >
              Today
            </Button>
            {navigation.onPickDate ? (
              <>
                <label className="sr-only" htmlFor="appointments-jump-date">
                  Jump to date
                </label>
                <input
                  id="appointments-jump-date"
                  type="date"
                  className="input period-bar-date"
                  value={navigation.dateValue ?? ""}
                  onChange={(event) => {
                    if (event.target.value) navigation.onPickDate?.(event.target.value)
                  }}
                />
              </>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Phones cannot fit three labelled views beside the heading: keep the switch on its
          own line, where it stays a comfortable tap target. */}
      <div className="mt-[0.6rem] sm:hidden">
        <SegmentedControl
          label="Appointment view"
          className="w-full"
          value={view}
          onValueChange={onViewChange}
          options={VIEW_OPTIONS.map((option) => ({
            value: option.value,
            icon: option.icon,
            label: option.label,
          }))}
        />
      </div>
    </header>
  )
}
