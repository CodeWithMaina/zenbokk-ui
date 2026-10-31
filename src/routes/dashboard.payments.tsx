import { createFileRoute } from '@tanstack/react-router'
import { ModulePlaceholder } from '../components/shell/ModulePlaceholder'

/** Payments — placeholder (`payments` module, `payments.view`). */
export const Route = createFileRoute('/dashboard/payments')({
  component: PaymentsPlaceholder,
})

function PaymentsPlaceholder() {
  return <ModulePlaceholder navKey="payments" />
}
