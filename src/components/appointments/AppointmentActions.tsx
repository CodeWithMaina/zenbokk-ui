import { Ban, CalendarClock, CalendarPlus, Check, Eye, RotateCcw, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import type { ReactNode } from 'react'
import { CANCELLATION_REASONS, allowedTransitions, appointmentReference } from '../../lib/appointments'
import type { AppointmentRow } from '../../lib/appointments'
import { formatDate, formatTime } from '../../lib/format'
import { LinkButton } from '../ui/button'
import { ConfirmDialog } from '../ui/confirm-dialog'
import { Field, Select, Textarea } from '../ui/field'
import type { MenuItem } from '../ui/menu'

/**
 * The one place an appointment's actions are decided.
 *
 * `availableActions` mirrors the server's transition table
 * (`AppointmentStatusMachine`), so a menu can never offer a move the API will
 * refuse, and a terminal appointment shows only the read-only actions.
 */
export type AppointmentAction =
  | 'view'
  | 'confirm'
  | 'complete'
  | 'no_show'
  | 'reschedule'
  | 'rebook'
  | 'cancel'

export const APPOINTMENT_ACTION_LABELS: Record<AppointmentAction, string> = {
  view: 'View details',
  confirm: 'Confirm',
  complete: 'Mark completed',
  no_show: 'Mark no-show',
  reschedule: 'Reschedule',
  rebook: 'Rebook',
  cancel: 'Cancel appointment',
}

const ACTION_ICONS: Record<AppointmentAction, ReactNode> = {
  view: <Eye className="size-4" aria-hidden="true" />,
  confirm: <Check className="size-4" aria-hidden="true" />,
  complete: <Check className="size-4" aria-hidden="true" />,
  no_show: <TriangleAlert className="size-4" aria-hidden="true" />,
  reschedule: <CalendarClock className="size-4" aria-hidden="true" />,
  rebook: <RotateCcw className="size-4" aria-hidden="true" />,
  cancel: <Ban className="size-4" aria-hidden="true" />,
}

/** Actions legal from this status, in menu order. */
export function availableActions(status: string): AppointmentAction[] {
  const transitions = allowedTransitions(status)
  const actions: AppointmentAction[] = ['view']

  if (transitions.includes('confirmed')) actions.push('confirm')
  if (transitions.includes('completed')) actions.push('complete')
  if (transitions.includes('no_show')) actions.push('no_show')
  if (transitions.length > 0) actions.push('reschedule')
  actions.push('rebook')
  if (transitions.includes('cancelled')) actions.push('cancel')

  return actions
}

/** True when this row can be confirmed in bulk. */
export function isBulkConfirmable(status: string): boolean {
  return status === 'booked'
}

/** True when this row can be cancelled in bulk. */
export function isBulkCancellable(status: string): boolean {
  return status === 'booked' || status === 'confirmed'
}

export function appointmentActionItems(
  status: string,
  onAction: (action: AppointmentAction) => void,
): MenuItem[] {
  return availableActions(status).map((action) => ({
    label: APPOINTMENT_ACTION_LABELS[action],
    icon: ACTION_ICONS[action],
    destructive: action === 'cancel',
    separatorBefore: action === 'cancel',
    onSelect: () => onAction(action),
  }))
}

/** Inline quick actions for a card: the next legal move, and nothing more. */
export function AppointmentQuickActions({
  status,
  onAction,
  disabled,
}: {
  status: string
  onAction: (action: AppointmentAction) => void
  disabled?: boolean
}) {
  const transitions = allowedTransitions(status)

  return (
    <div className="flex flex-wrap items-center gap-[0.5rem]">
      {transitions.includes('confirmed') ? (
        <LinkButton onClick={() => onAction('confirm')} disabled={disabled}>
          Confirm
        </LinkButton>
      ) : null}
      {transitions.includes('completed') ? (
        <LinkButton onClick={() => onAction('complete')} disabled={disabled}>
          Complete
        </LinkButton>
      ) : null}
      {transitions.includes('cancelled') ? (
        <LinkButton
          onClick={() => onAction('cancel')}
          disabled={disabled}
          className="text-danger-ink"
        >
          Cancel
        </LinkButton>
      ) : null}
      {transitions.length === 0 ? (
        <LinkButton onClick={() => onAction('rebook')} disabled={disabled}>
          <CalendarPlus className="size-3.5" aria-hidden="true" />
          Rebook
        </LinkButton>
      ) : null}
    </div>
  )
}

export type AppointmentCancelDialogProps = {
  open: boolean
  row: AppointmentRow | null
  pending: boolean
  error?: string | null
  onCancel: () => void
  onConfirm: (input: { reason: string; note: string | null }) => void
}

/**
 * Cancellation confirmation.
 *
 * The reason is written to the appointment's status history through the API's
 * `note` field, which is where the audit trail lives. There is deliberately no
 * "notify the customer" switch: the backend queues the cancellation notice
 * itself and honours the business's channel and preference settings, so a
 * toggle here would promise something the API does not accept.
 */
export function AppointmentCancelDialog({
  open,
  row,
  pending,
  error,
  onCancel,
  onConfirm,
}: AppointmentCancelDialogProps) {
  const [reason, setReason] = useState<string>(CANCELLATION_REASONS[0])
  const [note, setNote] = useState('')

  return (
    <ConfirmDialog
      open={open}
      tone="danger"
      title="Cancel this appointment?"
      confirmLabel={pending ? 'Cancelling…' : 'Cancel appointment'}
      cancelLabel="Keep appointment"
      onCancel={onCancel}
      onConfirm={() => onConfirm({ reason, note: note.trim() || null })}
    >
      {row ? (
        <div className="space-y-[0.8rem]">
          <p className="rounded-lg border border-line bg-hover px-[0.9rem] py-[0.7rem] text-meta">
            <b>{row.customerName}</b> · {row.serviceName}
            <br />
            {formatDate(row.scheduledAt)}, {formatTime(row.scheduledAt)}–{formatTime(row.endAt)} with{' '}
            {row.staffName ?? 'an unassigned staff member'}
            <br />
            <span className="text-muted">{appointmentReference(row.id)}</span>
          </p>

          <Field label="Reason" htmlFor="appointment-cancel-reason">
            <Select
              id="appointment-cancel-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            >
              {CANCELLATION_REASONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Note for the team" htmlFor="appointment-cancel-note" optional>
            <Textarea
              id="appointment-cancel-note"
              rows={2}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Anything the team should know"
            />
          </Field>

          <p className="text-meta text-muted">
            The customer is notified through your business’s notification settings. Cancelled
            appointments are kept, never deleted.
          </p>

          {error ? (
            <p className="text-meta font-semibold text-danger-ink" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}
    </ConfirmDialog>
  )
}
