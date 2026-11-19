import { createFileRoute, redirect } from '@tanstack/react-router'

/** Analytics is folded into the Cashbook; this URL is kept as a permanent redirect. */
export const Route = createFileRoute('/dashboard/finances/analytics')({
  beforeLoad: () => {
    throw redirect({ to: '/dashboard/finances/cashbook', replace: true })
  },
})
