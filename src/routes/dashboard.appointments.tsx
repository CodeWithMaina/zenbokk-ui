import { createFileRoute, Outlet } from '@tanstack/react-router'

/**
 * Appointments section layout.
 *
 * Carries no chrome of its own — the dashboard shell already provides the
 * sidebar and page frame. It exists so `/dashboard/appointments` and
 * `/dashboard/appointments/$appointmentId` are sibling routes under one path,
 * which keeps the Appointments entry in the sidebar active on both.
 */
export const Route = createFileRoute('/dashboard/appointments')({
  component: AppointmentsLayout,
})

function AppointmentsLayout() {
  return <Outlet />
}
