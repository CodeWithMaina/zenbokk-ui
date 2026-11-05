import { createFileRoute, Outlet } from '@tanstack/react-router'

/**
 * Storefront module layout.
 *
 * Carries no chrome of its own — the dashboard shell provides the sidebar and
 * page frame. It exists so `/dashboard/storefront`,
 * `/dashboard/storefront/templates` and `/dashboard/storefront/builder` are
 * siblings under one path, which keeps the Storefront entry in the sidebar active
 * on all of them.
 */
export const Route = createFileRoute('/dashboard/storefront')({
  component: StorefrontLayout,
})

function StorefrontLayout() {
  return <Outlet />
}
