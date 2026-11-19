import { createFileRoute } from '@tanstack/react-router'
import { CashbookPage } from '../components/finance/cashbook-page'

export const Route = createFileRoute('/dashboard/finances/cashbook')({
  component: CashbookPage,
})
