import { createFileRoute, Outlet } from '@tanstack/react-router'

/**
 * Service detail section.
 *
 * A pass-through layout so `/dashboard/services/$serviceId` (the detail page)
 * and `/dashboard/services/$serviceId/edit` (the form) are siblings — which
 * keeps the id in the path for both without the detail page having to render an
 * outlet of its own.
 */
export const Route = createFileRoute('/dashboard/services/$serviceId')({
  component: ServiceDetailsLayout,
})

function ServiceDetailsLayout() {
  return <Outlet />
}
