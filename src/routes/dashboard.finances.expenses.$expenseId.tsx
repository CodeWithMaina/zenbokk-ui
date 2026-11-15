import { createFileRoute } from '@tanstack/react-router'
import { TransactionDetail } from '../components/finances/TransactionDetail'

export const Route = createFileRoute('/dashboard/finances/expenses/$expenseId')({
  component: ExpenseDetailPage,
})

/**
 * One expense, in full.
 *
 * An expense IS a ledger row, so this route renders the same record as
 * `/dashboard/finances/transactions/{id}` with the expense lens — the edit and void actions, and
 * the expense vocabulary. Duplicating the row into an "expense" table would give the Cashbook two
 * places to disagree with itself.
 */
function ExpenseDetailPage() {
  const { expenseId } = Route.useParams()
  return <TransactionDetail transactionId={expenseId} mode="expense" />
}
