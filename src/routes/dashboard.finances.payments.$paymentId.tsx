import { createFileRoute } from '@tanstack/react-router'
import { PaymentDetailPage } from '../components/finance/payment-detail-page'

export const Route = createFileRoute('/dashboard/finances/payments/$paymentId')({
  component: PaymentDetailRoute,
})

function PaymentDetailRoute() {
  const { paymentId } = Route.useParams()
  return <PaymentDetailPage paymentId={paymentId} />
}