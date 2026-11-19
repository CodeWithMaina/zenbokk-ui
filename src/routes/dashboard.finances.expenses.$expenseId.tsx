import { createFileRoute, redirect } from '@tanstack/react-router'

/** Expenses are managed in the register; there is no separate detail screen. */
export const Route = createFileRoute('/dashboard/finances/expenses/$expenseId')({
  beforeLoad: () => {
    throw redirect({ to: '/dashboard/finances/expenses', replace: true })
  },
})
