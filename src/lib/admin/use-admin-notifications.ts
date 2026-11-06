import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../api/query-client'
import {
  adminNotificationsApi,
  type AdminNotificationLogFilters,
} from './notifications-api'

/**
 * Admin notification module hooks.
 *
 * Reads are cached per filter set; every write invalidates the keys it can
 * change so the console never shows a stale delivery figure after a retry,
 * a cancellation or a channel override.
 */

export function useAdminNotificationLogs(filters: AdminNotificationLogFilters) {
  return useQuery({
    queryKey: queryKeys.adminNotificationLogs(filters),
    queryFn: () => adminNotificationsApi.logs(filters),
    staleTime: 15_000,
    retry: false,
  })
}

export function useAdminNotificationLog(id: string | null) {
  return useQuery({
    queryKey: queryKeys.adminNotificationLog(id ?? ''),
    queryFn: () => adminNotificationsApi.log(id!),
    enabled: Boolean(id),
    staleTime: 15_000,
    retry: false,
  })
}

export function useAdminNotificationDelivery() {
  return useQuery({
    queryKey: queryKeys.adminNotificationDelivery(),
    queryFn: () => adminNotificationsApi.delivery(),
    staleTime: 10_000,
    retry: false,
  })
}

export function useAdminNotificationProviders() {
  return useQuery({
    queryKey: queryKeys.adminNotificationProviders(),
    queryFn: () => adminNotificationsApi.providers(),
    staleTime: 30_000,
    retry: false,
  })
}

export function useAdminNotificationTemplates() {
  return useQuery({
    queryKey: queryKeys.adminNotificationTemplates(),
    queryFn: () => adminNotificationsApi.templates(),
    staleTime: 60_000,
    retry: false,
  })
}

export function useAdminNotificationBusinesses(
  filters: { search?: string | null; page?: number; pageSize?: number },
) {
  return useQuery({
    queryKey: queryKeys.adminNotificationBusinesses(filters),
    queryFn: () => adminNotificationsApi.businesses(filters),
    staleTime: 30_000,
    retry: false,
  })
}

export function useAdminNotificationBusiness(businessId: string | null) {
  return useQuery({
    queryKey: queryKeys.adminNotificationBusiness(businessId ?? ''),
    queryFn: () => adminNotificationsApi.business(businessId!),
    enabled: Boolean(businessId),
    staleTime: 20_000,
    retry: false,
  })
}

export function useAdminNotificationAnalytics(filters: { days?: number; fromUtc?: string; toUtc?: string }) {
  return useQuery({
    queryKey: queryKeys.adminNotificationAnalytics(filters),
    queryFn: () => adminNotificationsApi.analytics(filters),
    staleTime: 60_000,
    retry: false,
  })
}

/** Requeues a retry-exhausted notification. */
export function useRetryNotification() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => adminNotificationsApi.retry(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'notifications'] })
    },
  })
}

/** Cancels a notification that has not yet been claimed for delivery. */
export function useCancelNotification() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string | null }) =>
      adminNotificationsApi.cancel(id, reason),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'notifications'] })
    },
  })
}

/** Runs a live provider connectivity check. */
export function useTestNotificationProvider() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (channel: string) => adminNotificationsApi.testProvider(channel),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.adminNotificationProviders() })
    },
  })
}

/** Enables or disables a delivery channel for one business. */
export function useSetBusinessNotificationChannel() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      businessId,
      channel,
      enabled,
      reason,
    }: {
      businessId: string
      channel: string
      enabled: boolean
      reason?: string | null
    }) => adminNotificationsApi.setBusinessChannel(businessId, channel, enabled, reason),
    onSuccess: (detail) => {
      queryClient.setQueryData(queryKeys.adminNotificationBusiness(detail.businessId), detail)
      void queryClient.invalidateQueries({ queryKey: ['admin', 'notifications', 'businesses'] })
    },
  })
}

/** Resets a business's template overrides back to the platform defaults. */
export function useResetBusinessNotificationTemplates() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (businessId: string) => adminNotificationsApi.resetBusinessTemplates(businessId),
    onSuccess: (detail) => {
      queryClient.setQueryData(queryKeys.adminNotificationBusiness(detail.businessId), detail)
      void queryClient.invalidateQueries({ queryKey: ['admin', 'notifications'] })
    },
  })
}
