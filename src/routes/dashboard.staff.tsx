import { createFileRoute, Outlet } from '@tanstack/react-router'

/**
 * Staff section layout.
 *
 * Carries no chrome of its own — the dashboard shell already provides the
 * sidebar and page frame. It exists so `/dashboard/staff` and
 * `/dashboard/staff/$staffId` are sibling routes under one path, which keeps the
 * Staff entry in the sidebar active on both.
 */
export const Route = createFileRoute('/dashboard/staff')({
  component: StaffLayout,
})

function StaffLayout() {
  return <Outlet />
}
