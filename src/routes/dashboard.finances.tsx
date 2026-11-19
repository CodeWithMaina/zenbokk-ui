import { createFileRoute, Outlet } from '@tanstack/react-router'

/**
 * Finance section layout.
 *
 * Carries no chrome of its own — the dashboard shell provides the sidebar and page
 * frame. It exists so `/dashboard/finances/cashbook`, `/payments`, `/payments/$paymentId`
 * and `/expenses` nest under one path (and one active sidebar entry). Like every other
 * section (`services`, `customers`), it MUST render an `<Outlet />`: without it the child
 * routes never mount and the section renders blank.
 */
export const Route = createFileRoute('/dashboard/finances')({
  component: FinanceLayout,
})

function FinanceLayout() {
  return <Outlet />
}