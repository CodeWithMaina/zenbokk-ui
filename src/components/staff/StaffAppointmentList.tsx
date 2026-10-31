import { useMutation } from '@tanstack/react-query'
import { CalendarX2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '../../lib/cn'
import type { Appointment } from '../../lib/api/types'
import { errorMessage } from '../../lib/api/client'
import { queryClient } from '../../lib/api/query-client'
import {
  appointmentActions,
  appointmentStatusLabel,
  appointmentStatusTone,
} from '../../lib/dashboard/appointment-status'
import { formatDay, formatDuration, formatTimeRange, money } from '../../lib/format'
import { staffApi } from '../../lib/staff/api'
import { StatusPill } from '../ui/badge'
import { Button } from '../ui/button'
import { EmptyState } from '../ui/empty-state'

type Action = 'confirm' | 'complete' | 'no_show' | 'cancel'

const ACTION_LABEL: Record<Action, string> = {
  confirm: 'Confirm',
  complete: 'Complete',
  no_show: 'No-show',
  cancel: 'Cancel',
}

/**
 * Staff appointment list with the server's state transitions.
 *
 * The actions offered come from `appointmentActions(status)`, which mirrors the
 * server's transition table, so the console can never present a button the API
 * will reject. Every mutation invalidates the whole staff appointment bucket so
 * the Today view and the full list agree after one action.
 */
export function StaffAppointmentList({
  appointments,
  emptyTitle = 'Nothing booked',
  emptyDescription,
}: {
  appointments: readonly Appointment[]
  emptyTitle?: string
  emptyDescription?: string
}) {
  const transition = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: Action }) => {
      switch (action) {
        case 'confirm':
          return staffApi.confirm(id)
        case 'complete':
          return staffApi.complete(id)
        case 'no_show':
          return staffApi.markNoShow(id)
        case 'cancel':
          return staffApi.cancel(id)
      }
    },
    onSuccess: (_appointment, variables) => {
      toast.success(`${ACTION_LABEL[variables.action]}d.`)
      void queryClient.invalidateQueries({ queryKey: ['appointments', 'staff'] })
    },
    onError: (error, variables) => {
      toast.error(errorMessage(error, `We could not ${ACTION_LABEL[variables.action].toLowerCase()} that appointment.`))
    },
  })

  if (appointments.length === 0) {
    return (
      <EmptyState
        icon={<CalendarX2 className="size-5" />}
        title={emptyTitle}
        description={emptyDescription}
      />
    )
  }

  return (
    <ul className="m-0 list-none divide-y divide-line p-0">
      {appointments.map((appointment) => {
        const actions = appointmentActions(appointment.status)
        const duration = appointment.services.reduce((sum, line) => sum + line.durationMinutes, 0)
        const total = appointment.services.reduce((sum, line) => sum + line.price, 0)
        const busy = transition.isPending && transition.variables?.id === appointment.id

        return (
          <li
            key={appointment.id}
            className="flex flex-wrap items-center justify-between gap-x-4 gap-y-[0.5rem] py-[0.7rem] first:pt-0 last:pb-0"
          >
            <div className="min-w-0 flex-1">
              <p className="text-label font-semibold">
                {appointment.services.map((line) => line.name).join(' + ') || 'Appointment'}
                {duration > 0 ? (
                  <span className="font-normal text-muted"> · {formatDuration(duration)}</span>
                ) : null}
              </p>
              <p className="text-caption text-muted">
                {formatDay(appointment.scheduledAt)} ·{' '}
                {formatTimeRange(appointment.scheduledAt, appointment.endAt)}
                {total > 0 ? ` · ${money(total)}` : ''}
              </p>
            </div>

            <StatusPill tone={appointmentStatusTone(appointment.status)}>
              {appointmentStatusLabel(appointment.status)}
            </StatusPill>

            {actions.length > 0 ? (
              <div className={cn('flex flex-wrap items-center gap-[0.35rem] max-sm:w-full')}>
                {actions.map((action) => (
                  <Button
                    key={action}
                    variant={action === 'cancel' ? 'danger' : action === 'complete' ? 'primary' : 'default'}
                    size="sm"
                    disabled={busy}
                    onClick={() => transition.mutate({ id: appointment.id, action })}
                  >
                    {ACTION_LABEL[action]}
                  </Button>
                ))}
              </div>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}
