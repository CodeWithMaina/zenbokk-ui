import { createFileRoute, Outlet } from '@tanstack/react-router'

/**
 * Payments section layout.
 *
 * Carries no chrome of its own — the dashboard shell provides the frame. It exists
 * so `/dashboard/finances/payments` (the register) and
 * `/dashboard/finances/payments/$paymentId` (one payment) are siblings under one
 * path, which keeps the Payments entry active on both. The list lives in the index
 * route; without this `<Outlet />` the detail route never mounts.
 */
export const Route = createFileRoute('/dashboard/finances/payments')({
  component: PaymentsLayout,
})

function PaymentsLayout() {
  return <Outlet />
}
