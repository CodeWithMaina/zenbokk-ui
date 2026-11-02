import { createFileRoute, Outlet } from '@tanstack/react-router'

/**
 * Services section layout.
 *
 * Carries no chrome of its own — the dashboard shell already provides the
 * sidebar and page frame. It exists so `/dashboard/services`,
 * `/dashboard/services/new`, `/dashboard/services/$serviceId` and
 * `/dashboard/services/$serviceId/edit` are siblings under one path, which keeps
 * the Services entry in the sidebar active on all of them.
 */
export const Route = createFileRoute('/dashboard/services')({
  component: ServicesLayout,
})

function ServicesLayout() {
  return <Outlet />
}
