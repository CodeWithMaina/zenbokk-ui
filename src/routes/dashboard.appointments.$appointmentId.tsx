import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import {
  AppointmentBookingForm,
  AppointmentCancelDialog,
  AppointmentDetail,
  AppointmentEmptyState,
} from '../components/appointments'
import type {
  AppointmentAction,
  BookingMode,
  BookingPrefill,
  BookingSubmission,
} from '../components/appointments'
import { errorMessage } from '../lib/api/client'
import { addDays } from '../lib/appointments'
import {
  DEFAULT_APPOINTMENT_FILTERS,
  useAppointment,
  useAppointmentMutations,
  useAppointmentPage,
} from '../lib/appointments'
import { useDashboardContext } from '../lib/dashboard/dashboard-context'
import { MODULE } from '../lib/entitlements'

/**
 * One appointment's details page.
 *
 * Tapping a booking anywhere in the console (the Appointments list, a card, or a
 * client's own bookings tab) lands here, so the record is a real, shareable page
 * rather than a panel that only exists while the list happens to be mounted. The
 * record, its service lines, its status history, the customer's other visits and
 * the staff member's day are all read from the same `['appointments', …]`
 * queries the list uses, so a change made here is reflected everywhere the
 * moment it lands.
 */
export const Route = createFileRoute('/dashboard/appointments/$appointmentId')({
  component: AppointmentDetailsPage,
})

function AppointmentDetailsPage() {
  const { appointmentId } = Route.useParams()
  const navigate = useNavigate({ from: Route.fullPath })
  const { business, hasModule, hasPermission } = useDashboardContext()
  const enabled = hasModule(MODULE.appointments)
  const customersEnabled = hasModule(MODULE.customers)
  const canBook =
    hasPermission('appointments.create') || hasPermission('appointments.manage')

  const detail = useAppointment(appointmentId, enabled)
  const appointment = detail.data ?? null

  // The dashboard reference (customers, services, staff) backs the reschedule
  // and rebook drawer; the endpoint returns the same reference on every page.
  const reference = useAppointmentPage(DEFAULT_APPOINTMENT_FILTERS, 1, 1, enabled)
  const mutations = useAppointmentMutations()

  const [booking, setBooking] = useState<{
    mode: BookingMode
    prefill?: BookingPrefill
  } | null>(null)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [noteError, setNoteError] = useState<string | null>(null)

  const busy =
    mutations.confirm.isPending ||
    mutations.complete.isPending ||
    mutations.markNoShow.isPending ||
    mutations.cancel.isPending ||
    mutations.create.isPending ||
    mutations.reschedule.isPending ||
    mutations.updateNote.isPending

  /** Open the drawer pre-filled for a reschedule or a rebooking. */
  const openBookingFor = useCallback(
    (mode: BookingMode) => {
      if (!appointment) return
      if (!canBook) {
        toast.error('You do not have permission to change bookings.')
        return
      }
      const [first] = appointment.services
      setBooking({
        mode,
        prefill: {
          appointmentId: appointment.id,
          customerId: appointment.customerId,
          serviceId: first?.serviceCatalogItemId ?? null,
          staffUserId: appointment.staffUserId,
          start:
            mode === 'rebook'
              ? addDays(new Date(appointment.scheduledAt), 7)
              : new Date(appointment.scheduledAt),
        },
      })
    },
    [appointment, canBook],
  )

  const handleAction = useCallback(
    (action: AppointmentAction) => {
      if (!appointment) return
      const id = appointment.id

      switch (action) {
        case 'view':
          return
        case 'confirm':
        case 'complete':
        case 'no_show': {
          const mutation =
            action === 'confirm'
              ? mutations.confirm
              : action === 'complete'
                ? mutations.complete
                : mutations.markNoShow
          mutation.mutate(id, {
            onSuccess: () =>
              toast.success(
                action === 'confirm'
                  ? 'Appointment confirmed.'
                  : action === 'complete'
                    ? 'Appointment marked completed.'
                    : 'Appointment marked as a no-show.',
              ),
            onError: (error) => toast.error(errorMessage(error)),
          })
          return
        }
        case 'reschedule':
          openBookingFor('reschedule')
          return
        case 'rebook':
          openBookingFor('rebook')
          return
        case 'cancel':
          setCancelOpen(true)
          return
      }
    },
    [
      appointment,
      mutations.complete,
      mutations.confirm,
      mutations.markNoShow,
      openBookingFor,
    ],
  )

  const submitBooking = useCallback(
    (submission: BookingSubmission) => {
      const scheduledAt = submission.start.toISOString()
      const note = submission.note

      const done = (message: string) => {
        setBooking(null)
        toast.success(message)
      }
      const failed = (error: unknown) => toast.error(errorMessage(error))

      if (submission.mode === 'reschedule' && submission.appointmentId) {
        mutations.reschedule.mutate(
          {
            appointmentId: submission.appointmentId,
            payload: {
              scheduledAt,
              serviceIds: [submission.serviceId],
              staffUserId: submission.staffUserId,
              note,
            },
          },
          { onSuccess: () => done('Appointment rescheduled.'), onError: failed },
        )
        return
      }

      mutations.create.mutate(
        {
          businessId: business.id,
          customerId: submission.customerId,
          serviceIds: [submission.serviceId],
          staffUserId: submission.staffUserId,
          scheduledAt,
          note,
        },
        {
          onSuccess: () =>
            done(submission.mode === 'rebook' ? 'Rebooking created.' : 'Booking created.'),
          onError: failed,
        },
      )
    },
    [business.id, mutations.create, mutations.reschedule],
  )

  const saveNote = useCallback(
    (note: string | null) => {
      setNoteError(null)
      mutations.updateNote.mutate(
        { appointmentId, note },
        {
          onSuccess: () => toast.success('Note saved.'),
          onError: (error) => setNoteError(errorMessage(error)),
        },
      )
    },
    [appointmentId, mutations.updateNote],
  )

  if (!enabled) {
    return (
      <div className="card">
        <AppointmentEmptyState filtered={false} />
      </div>
    )
  }

  return (
    <>
      <AppointmentDetail
        appointmentId={appointmentId}
        row={null}
        onBack={() => void navigate({ to: '/dashboard/appointments' })}
        onAction={handleAction}
        onOpenAppointment={(nextId) =>
          void navigate({
            to: '/dashboard/appointments/$appointmentId',
            params: { appointmentId: nextId },
          })
        }
        onOpenCustomer={
          customersEnabled
            ? (customerId) =>
                void navigate({
                  to: '/dashboard/customers/$clientId',
                  params: { clientId: customerId },
                  search: { tab: 'appointments' },
                })
            : undefined
        }
        onSaveNote={saveNote}
        noteSaving={mutations.updateNote.isPending}
        noteError={noteError}
        busy={busy}
      />

      {booking ? (
        <AppointmentBookingForm
          open
          onClose={() => setBooking(null)}
          mode={booking.mode}
          businessId={business.id}
          customers={reference.data?.customers ?? []}
          services={reference.data?.services ?? []}
          staff={reference.data?.staff ?? []}
          prefill={booking.prefill}
          busy={mutations.create.isPending || mutations.reschedule.isPending}
          error={
            mutations.create.isError
              ? errorMessage(mutations.create.error)
              : mutations.reschedule.isError
                ? errorMessage(mutations.reschedule.error)
                : null
          }
          onSubmit={submitBooking}
        />
      ) : null}

      <AppointmentCancelDialog
        open={cancelOpen}
        row={null}
        pending={mutations.cancel.isPending}
        error={mutations.cancel.isError ? errorMessage(mutations.cancel.error) : null}
        onCancel={() => setCancelOpen(false)}
        onConfirm={({ reason, note }) => {
          mutations.cancel.mutate(
            { appointmentId, note: note ? `${reason} · ${note}` : reason },
            {
              onSuccess: () => {
                setCancelOpen(false)
                toast.success('Appointment cancelled.')
              },
              onError: (error) => toast.error(errorMessage(error)),
            },
          )
        }}
      />
    </>
  )
}
