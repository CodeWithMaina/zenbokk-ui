import { createFileRoute, redirect } from '@tanstack/react-router'

/** Reconciliation now lives in Payments; this URL is kept as a permanent redirect. */
export const Route = createFileRoute('/dashboard/finances/reconciliation')({
  beforeLoad: () => {
    throw redirect({ to: '/dashboard/finances/payments', replace: true })
  },
})
