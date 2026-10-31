import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '../api/query-client'
import { modulesApi } from './api'

/**
 * The caller's module entitlements and permissions.
 *
 * Entitlements change when a plan changes, an admin toggles a module override,
 * or a trial ends — all server-side events — so this is cached briefly rather
 * than for the session, and a failed read is never retried: a 403/404 here is a
 * membership answer, not a flaky network.
 */
export function useMyModules(enabled = true) {
  return useQuery({
    queryKey: queryKeys.myModules(),
    queryFn: modulesApi.mine,
    enabled,
    staleTime: 5 * 60_000,
    retry: false,
  })
}
