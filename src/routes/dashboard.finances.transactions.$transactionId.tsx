import { createFileRoute, redirect } from '@tanstack/react-router'

/** A transaction is a cashbook row; the Cashbook replaces the per-row screen. */
export const Route = createFileRoute('/dashboard/finances/transactions/$transactionId')({
  beforeLoad: () => {
    throw redirect({ to: '/dashboard/finances/cashbook', replace: true })
  },
})
