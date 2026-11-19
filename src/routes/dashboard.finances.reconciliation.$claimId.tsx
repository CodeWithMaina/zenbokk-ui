import { createFileRoute, redirect } from '@tanstack/react-router'

/** A claim IS a payment; open it in the new payments detail page. */
export const Route = createFileRoute('/dashboard/finances/reconciliation/$claimId')({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: '/dashboard/finances/payments/$paymentId',
      params: { paymentId: params.claimId },
      replace: true,
    })
  },
})
