import { createFileRoute, redirect } from '@tanstack/react-router'

/** The whole Transactions screen is folded into the Cashbook. */
export const Route = createFileRoute('/dashboard/finances/transactions')({
  beforeLoad: () => {
    throw redirect({ to: '/dashboard/finances/cashbook', replace: true })
  },
})
