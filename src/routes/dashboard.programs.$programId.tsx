import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { LoyaltyProgramDetails, PROGRAM_TABS } from '../components/loyalty'
import type { ProgramTab } from '../components/loyalty'
import { useDashboardContext } from '../lib/dashboard/dashboard-context'
import { MODULE } from '../lib/entitlements'

/** Optional, so a link to a program never has to name a tab. */
type ProgramDetailsSearch = { tab?: ProgramTab }

/**
 * The open tab lives in the URL, so a program's customers or settings view is a
 * link someone can share, refresh or bookmark — and the back button steps
 * through tabs.
 */
function validateSearch(search: Record<string, unknown>): ProgramDetailsSearch {
  return {
    tab: (PROGRAM_TABS as readonly string[]).includes(String(search.tab))
      ? (search.tab as ProgramTab)
      : 'overview',
  }
}

export const Route = createFileRoute('/dashboard/programs/$programId')({
  validateSearch,
  component: ProgramDetailsPage,
})

function ProgramDetailsPage() {
  const { programId } = Route.useParams()
  const { tab: tabParam } = Route.useSearch()
  const tab = tabParam ?? 'overview'
  const navigate = useNavigate({ from: Route.fullPath })
  const { hasModule } = useDashboardContext()

  return (
    <LoyaltyProgramDetails
      programId={programId}
      tab={tab}
      onTabChange={(next) => void navigate({ search: { tab: next }, replace: true })}
      onOpenProgram={(nextProgramId) =>
        void navigate({
          to: '/dashboard/programs/$programId',
          params: { programId: nextProgramId },
          search: { tab: 'overview' },
          replace: true,
        })
      }
      onBack={() => void navigate({ to: '/dashboard/programs' })}
      onOpenCustomer={(customerId) =>
        void navigate({
          to: '/dashboard/customers/$clientId',
          params: { clientId: customerId },
          search: { tab: 'loyalty' },
        })
      }
      customersEnabled={hasModule(MODULE.customers)}
    />
  )
}
