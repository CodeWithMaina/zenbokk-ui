import { createFileRoute } from '@tanstack/react-router'
import { TransactionDetail } from '../components/finances/TransactionDetail'

export const Route = createFileRoute('/dashboard/finances/transactions/$transactionId')({
  component: TransactionDetailPage,
})

/**
 * One recognised transaction, in full.
 *
 * The id is the LEDGER row id, so the Cashbook, the Transactions register and a refund's
 * "original receipt" link all land on the same record — there is no second financial record for a
 * detail page to disagree with.
 */
function TransactionDetailPage() {
  const { transactionId } = Route.useParams()
  return <TransactionDetail transactionId={transactionId} mode="transaction" />
}
