import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '../api/query-client'
import { useAuth } from '../auth'
import type { NavSurface } from '../navigation/types'
import {
  bootstrapFailureMessage,
  classifyBootstrapFailure,
  loadBusinessDashboard,
} from './bootstrap'
import type {
  BusinessDashboardBootstrap,
  DashboardBootstrapFailureKind,
} from './bootstrap'

/**
 * The one hook every console uses to bootstrap.
 *
 * It owns the whole state machine — signed out, in flight, failed (with the
 * *kind* of failure), ready — so a layout only has to render what it is told.
 * Pages never call the API to find out about business access.
 */

export type DashboardBootstrapState =
  /** No session: the route guard should already have redirected. */
  | { status: 'unauthenticated'; retry: () => void }
  | { status: 'loading'; retry: () => void }
  | {
      status: 'error'
      kind: DashboardBootstrapFailureKind
      message: string
      error: unknown
      retry: () => void
    }
  | { status: 'ready'; data: BusinessDashboardBootstrap; retry: () => void }

const CONSOLE_LABEL: Record<NavSurface, string> = {
  dashboard: 'business dashboard',
  staff: 'staff console',
  admin: 'platform console',
}

export function useBusinessDashboard(surface: NavSurface): DashboardBootstrapState {
  const { isAuthenticated, isRestoring, role } = useAuth()

  const query = useQuery({
    queryKey: queryKeys.businessDashboard(surface),
    queryFn: () => loadBusinessDashboard({ surface, role: role ?? 'Business' }),
    enabled: isAuthenticated,
    staleTime: 5 * 60_000,
    // A failed bootstrap is a membership/role answer, not a flaky network.
    retry: false,
  })

  const retry = () => {
    void query.refetch()
  }

  if (!isAuthenticated) {
    return { status: isRestoring ? 'loading' : 'unauthenticated', retry }
  }

  if (query.isPending) return { status: 'loading', retry }

  if (query.isError) {
    const kind = classifyBootstrapFailure(query.error)
    return {
      status: 'error',
      kind,
      message: bootstrapFailureMessage(kind, query.error, CONSOLE_LABEL[surface]),
      error: query.error,
      retry,
    }
  }

  return { status: 'ready', data: query.data, retry }
}
