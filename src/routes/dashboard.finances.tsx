import { createFileRoute, Outlet } from '@tanstack/react-router'
import { ModulePlaceholder } from '../components/shell/ModulePlaceholder'
import { useDashboardContext } from '../lib/dashboard/dashboard-context'
import { MODULE } from '../lib/entitlements'

export const Route = createFileRoute('/dashboard/finances')({
  component: FinanceLayout,
})

/**
 * Finance — the business's own books.
 *
 * A layout, not a screen: it exists so Reconciliation, Transactions, Expenses and Cashbook
 * render inside one gate. The gate is the business's `financials` entitlement, checked here
 * as well as on every API call, so a direct link to a Finance URL with the module switched off
 * gets an explanation rather than a screen full of 403s.
 *
 * The layout deliberately adds nothing of its own — no header, no tabs — because each of the
 * four sections is a full page with its own title and its own actions, and a wrapper that
 * repeated them would just push the money further down the screen.
 *
 * The standalone Payments module is a separate entry in the sidebar: it tracks what customers
 * owe against appointments, which is an operational question, not a book-keeping one.
 */
function FinanceLayout() {
  const { hasModule } = useDashboardContext()

  if (!hasModule(MODULE.financials)) {
    return <ModulePlaceholder navKey="finances" />
  }

  return <Outlet />
}
