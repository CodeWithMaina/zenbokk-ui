import { createFileRoute } from '@tanstack/react-router'
import { ExpensesPage } from '../components/finance/expenses-page'

export const Route = createFileRoute('/dashboard/finances/expenses')({
  component: ExpensesPage,
})
