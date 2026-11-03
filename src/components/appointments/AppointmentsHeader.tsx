import { CalendarDays, LayoutGrid, Plus, Table2 } from 'lucide-react'
import type { ReactNode } from 'react'
import type { AppointmentView } from '../../lib/appointments'
import { pluralize } from '../../lib/format'
import { Button } from '../ui/button'
import { PageHeader } from '../ui/page-header'
import { SegmentedControl } from '../ui/segmented-control'

const VIEW_OPTIONS: readonly { value: AppointmentView; label: string; icon: ReactNode }[] = [
  { value: 'calendar', label: 'Calendar', icon: <CalendarDays className="size-3.5" aria-hidden="true" /> },
  { value: 'table', label: 'Table', icon: <Table2 className="size-3.5" aria-hidden="true" /> },
  { value: 'cards', label: 'Cards', icon: <LayoutGrid className="size-3.5" aria-hidden="true" /> },
]

const VIEW_NOUN: Record<AppointmentView, string> = {
  calendar: 'Calendar',
  table: 'Table',
  cards: 'Cards',
}

export type AppointmentsHeaderProps = {
  view: AppointmentView
  onViewChange: (view: AppointmentView) => void
  /** Appointments today, excluding cancelled ones — the header's headline count. */
  todayCount: number
  onNewBooking: () => void
  /** False when the caller's role may view but not book. */
  canBook: boolean
  busy?: boolean
}

/**
 * Page heading from the reference design: the title, a one-line summary of what
 * the current view is showing, the view switch and the primary action.
 *
 * The count comes from the same loaded rows as the list below it, so the header
 * can never claim a number the screen is not showing.
 */
export function AppointmentsHeader({
  view,
  onViewChange,
  todayCount,
  onNewBooking,
  canBook,
  busy = false,
}: AppointmentsHeaderProps) {
  return (
    <PageHeader
      title="Appointments"
      description={`${VIEW_NOUN[view]} view · ${pluralize(todayCount, 'appointment')} today`}
      actions={
        <>
          <SegmentedControl
            label="Appointment view"
            value={view}
            onValueChange={onViewChange}
            options={VIEW_OPTIONS.map((option) => ({
              value: option.value,
              icon: option.icon,
              label: <span className="max-sm:sr-only">{option.label}</span>,
            }))}
          />
          {canBook ? (
            <Button variant="primary" onClick={onNewBooking} disabled={busy}>
              <Plus className="size-4" aria-hidden="true" />
              New booking
            </Button>
          ) : null}
        </>
      }
    />
  )
}
