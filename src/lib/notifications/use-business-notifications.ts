import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../api/query-client'
import {
  businessNotificationsApi,
  type UpdateBusinessNotificationChannels,
} from './business-api'

/**
 * Business notification workspace hooks.
 *
 * Every key is scoped to the business id, so switching tenants can never reuse
 * another business's cached configuration or statistics.
 */

export function useBusinessNotificationOverview(
  businessId: string,
  range: 'today' | '7d' | '30d' | '90d',
) {
  return useQuery({
    queryKey: queryKeys.businessNotificationOverview(businessId, range),
    queryFn: () => businessNotificationsApi.overview(businessId, range),
    staleTime: 30_000,
    retry: false,
  })
}

export function useBusinessNotificationChannels(businessId: string) {
  return useQuery({
    queryKey: queryKeys.businessNotificationChannels(businessId),
    queryFn: () => businessNotificationsApi.channels(businessId),
    staleTime: 60_000,
    retry: false,
  })
}

export function useUpdateBusinessNotificationChannels(businessId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: UpdateBusinessNotificationChannels) =>
      businessNotificationsApi.updateChannels(businessId, payload),
    onSuccess: (channels) => {
      queryClient.setQueryData(queryKeys.businessNotificationChannels(businessId), channels)
      void queryClient.invalidateQueries({
        queryKey: queryKeys.businessNotificationPreferences(businessId),
      })
      void queryClient.invalidateQueries({ queryKey: ['notifications', 'business', businessId] })
    },
  })
}

export function useBusinessNotificationPreferences(businessId: string) {
  return useQuery({
    queryKey: queryKeys.businessNotificationPreferences(businessId),
    queryFn: () => businessNotificationsApi.preferences(businessId),
    staleTime: 60_000,
    retry: false,
  })
}

export function useUpdateBusinessNotificationPreferences(businessId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (preferences: { category: string; channel: string; enabled: boolean }[]) =>
      businessNotificationsApi.updatePreferences(businessId, preferences),
    onSuccess: (resolved) => {
      queryClient.setQueryData(queryKeys.businessNotificationPreferences(businessId), resolved)
    },
  })
}

export function useBusinessNotificationTemplates(
  businessId: string,
  filters: { search?: string | null; category?: string | null; channel?: string | null },
) {
  return useQuery({
    queryKey: queryKeys.businessNotificationTemplates(businessId, filters),
    queryFn: () => businessNotificationsApi.templates(businessId, filters),
    staleTime: 30_000,
    retry: false,
  })
}

export function useBusinessNotificationVariables(businessId: string, type: string | null) {
  return useQuery({
    queryKey: queryKeys.businessNotificationVariables(businessId, type ?? ''),
    queryFn: () => businessNotificationsApi.variables(businessId, type!),
    enabled: Boolean(type),
    staleTime: 5 * 60_000,
    retry: false,
  })
}

/** Renders a template draft with realistic sample data. */
export function usePreviewBusinessNotification(businessId: string) {
  return useMutation({
    mutationFn: (payload: {
      type: string
      channel: string
      subjectTemplate?: string | null
      bodyTemplateHtml: string
      bodyTemplateText: string
    }) => businessNotificationsApi.preview(businessId, payload),
  })
}

/** Sends a one-off test message; never triggers a business workflow. */
export function useTestSendBusinessNotification(businessId: string) {
  return useMutation({
    mutationFn: (payload: { channel: string; type: string; recipient: string }) =>
      businessNotificationsApi.testSend(businessId, payload),
  })
}

export function useBusinessAutomationRules() {
  return useQuery({
    queryKey: ['notifications', 'automation-rules'],
    queryFn: () => businessNotificationsApi.automationRules(),
    staleTime: 30_000,
    retry: false,
  })
}

export function useToggleBusinessAutomationRule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, enable }: { id: string; enable: boolean }) =>
      businessNotificationsApi.toggleAutomationRule(id, enable),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications', 'automation-rules'] })
    },
  })
}
