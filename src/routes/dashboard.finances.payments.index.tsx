import { createFileRoute } from '@tanstack/react-router'
import { PaymentsPage } from '../components/finance/payments-page'

export const Route = createFileRoute('/dashboard/finances/payments/')({
  component: PaymentsPage,
})
