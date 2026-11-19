import { createFileRoute, redirect } from '@tanstack/react-router'

/** The standalone Payments module moved under Finance; keep the old URL as a redirect. */
export const Route = createFileRoute('/dashboard/payments')({
  beforeLoad: () => {
    throw redirect({ to: '/dashboard/finances/payments', replace: true })
  },
})
