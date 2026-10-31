import { createFileRoute, Outlet } from '@tanstack/react-router'

/**
 * Clients section layout.
 *
 * Carries no chrome of its own — the dashboard shell already provides the
 * sidebar and page frame. It exists so `/dashboard/customers` and
 * `/dashboard/customers/$clientId` are sibling routes under one path, which
 * keeps the Clients entry in the sidebar active on both.
 */
export const Route = createFileRoute('/dashboard/customers')({
  component: ClientsLayout,
})

function ClientsLayout() {
  return <Outlet />
}
