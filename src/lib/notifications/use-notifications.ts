import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../api/query-client'
import type {
  NotificationPreferenceItem,
  ResolvedNotificationPreference,
} from '../api/types'
import { notificationsApi } from './api'

/**
 * The caller's resolved notification preference matrix.
 *
 * `businessId` scopes the read (and any override written from it) to the
 * business the caller is acting in; pass `null` for the global user preference.
 */
export function useNotificationPreferences(businessId: string | null) {
  return useQuery<ResolvedNotificationPreference[]>({
    queryKey: queryKeys.notificationPreferences(businessId),
    queryFn: () => notificationsApi.preferences(businessId),
    staleTime: 60_000,
    retry: false,
  })
}

/**
 * Persist preference changes. Only the changed cells are sent — the server
 * deletes rows equal to the default so the table stays sparse. The response is
 * the freshly resolved matrix, written straight into the cache so the UI cannot
 * drift from what the backend now believes.
 */
export function useUpdateNotificationPreferences(businessId: string | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (preferences: NotificationPreferenceItem[]) =>
      notificationsApi.updatePreferences({ businessId, preferences }),
    onSuccess: (resolved) => {
      queryClient.setQueryData(queryKeys.notificationPreferences(businessId), resolved)
    },
  })
}
