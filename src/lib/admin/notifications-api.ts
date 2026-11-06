import { apiGet, apiRequest } from '../api/client'
import type { PaginatedResponse } from '../api/types'

/**
 * Admin notification management client.
 *
 * Every endpoint requires the `PlatformAdmin` policy server-side; hiding a
 * control in the console is never the authorization. Recipients arrive already
 * masked from the API, so this module never sees a raw address.
 */

export type AdminNotificationLogItem = {
  id: string
  businessId: string | null
  businessName: string | null
  channel: string
  notificationType: string
  templateKey: string | null
  status: string
  classification: string
  recipientMasked: string
  attempts: number
  retryEligible: boolean
  cancellable: boolean
  ruleId: string | null
  sourceJobId: string | null
  errorSummary: string | null
  createdAtUtc: string
  updatedAtUtc: string
  nextAttemptAtUtc: string | null
  deliveredAtUtc: string | null
  deadLetteredAtUtc: string | null
}

export type AdminNotificationAttempt = {
  startedAtUtc: string
  completedAtUtc: string | null
  outcome: string
}

export type AdminNotificationLogDetail = AdminNotificationLogItem & {
  recipientUserId: string
  sanitizedError: string | null
  idempotencyKey: string | null
  sanitizedPayloadJson: string
  deliveryAttempts: AdminNotificationAttempt[]
  templateSource: string
  templateVersion: number | null
}

export type AdminNotificationProviderHealth = {
  state: string
  evidence: string
  recentAttempts: number
  recentFailures: number
  lastSuccessfulDeliveryAtUtc: string | null
}

export type AdminNotificationProvider = {
  channel: string
  registered: boolean
  configured: boolean
  status: string
  settings: Record<string, string>
  maskedCredentials: Record<string, string>
  health: AdminNotificationProviderHealth
  supportsConnectionTest: boolean
}

export type AdminNotificationProviderTestResult = {
  channel: string
  succeeded: boolean
  message: string
  checkedAtUtc: string
}

export type AdminNotificationBacklogBucket = { bucket: string; count: number }

export type AdminNotificationDeliveryMonitoring = {
  updatedAtUtc: string
  queueDepth: number
  pending: number
  processing: number
  failed: number
  deadLettered: number
  retryScheduled: number
  oldestPendingAgeSeconds: number | null
  retryActivity24h: number
  lastSuccessfulDeliveryAtUtc: string | null
  lastWorkerActivityAtUtc: string | null
  workerState: string
  workerEvidence: string
  channels: AdminNotificationProvider[]
  backlog: AdminNotificationBacklogBucket[]
}

export type AdminNotificationTemplate = {
  type: string
  category: string
  channel: string
  subject: string
  title: string
  body: string
  defaultChannels: string[]
  protected: boolean
  availableVariables: string[]
  overrideCount: number
}

export type AdminNotificationChannelOverride = {
  channel: string
  enabled: boolean
  updatedAtUtc: string | null
}

export type AdminNotificationBusinessSummary = {
  businessId: string
  businessName: string
  totalNotifications: number
  sent: number
  failed: number
  pending: number
  deliverySuccessRatePercent: number | null
  channelOverrides: AdminNotificationChannelOverride[]
  deliveryDisabled: boolean
  lastNotificationAtUtc: string | null
}

export type AdminNotificationAnalyticsCount = {
  key: string
  label: string
  total: number
  sent: number
  failed: number
  pending: number
  successRatePercent: number | null
}

export type AdminNotificationTrendPoint = {
  date: string
  sent: number
  failed: number
  pending: number
}

export type AdminNotificationBusinessDetail = AdminNotificationBusinessSummary & {
  enabledChannels: string[]
  preferences: {
    category: string
    channel: string
    enabled: boolean
    adminOverride: boolean
  }[]
  templates: {
    id: string
    type: string
    channel: string
    version: number
    updatedBy: string
    updatedAtUtc: string
  }[]
  automationRules: {
    id: string
    name: string
    trigger: string
    enabled: boolean
    updatedAtUtc: string
  }[]
  recentNotifications: AdminNotificationLogItem[]
  recentFailures: AdminNotificationLogItem[]
  statistics: {
    byChannel: AdminNotificationAnalyticsCount[]
    byType: AdminNotificationAnalyticsCount[]
    dailyTrend: AdminNotificationTrendPoint[]
  }
}

export type AdminNotificationProviderPerformance = {
  channel: string
  total: number
  sent: number
  failed: number
  averageDeliverySeconds: number | null
  successRatePercent: number | null
}

export type AdminNotificationAnalytics = {
  fromUtc: string
  toUtc: string
  updatedAtUtc: string
  totalNotifications: number
  sent: number
  failed: number
  pending: number
  processing: number
  deliverySuccessRatePercent: number | null
  failureRatePercent: number | null
  totalSmsSegments: number
  byChannel: AdminNotificationAnalyticsCount[]
  byType: AdminNotificationAnalyticsCount[]
  byBusiness: AdminNotificationAnalyticsCount[]
  providerPerformance: AdminNotificationProviderPerformance[]
  dailyTrend: AdminNotificationTrendPoint[]
}

export type AdminNotificationActionResponse = {
  id: string
  accepted: boolean
  code: string
  message: string
}

export type AdminNotificationLogFilters = {
  search?: string | null
  businessId?: string | null
  channel?: string | null
  notificationType?: string | null
  status?: string | null
  fromUtc?: string | null
  toUtc?: string | null
  notificationId?: string | null
  page?: number
  pageSize?: number
}

export const adminNotificationsApi = {
  logs(
    filters: AdminNotificationLogFilters = {},
  ): Promise<PaginatedResponse<AdminNotificationLogItem>> {
    return apiGet<PaginatedResponse<AdminNotificationLogItem>>(
      '/v1/admin/notifications/logs',
      filters as never,
    )
  },

  log(id: string): Promise<AdminNotificationLogDetail> {
    return apiGet<AdminNotificationLogDetail>(`/v1/admin/notifications/logs/${id}`)
  },

  retry(id: string): Promise<AdminNotificationActionResponse> {
    return apiRequest<AdminNotificationActionResponse>(`/v1/admin/notifications/logs/${id}/retry`, {
      method: 'POST',
    })
  },

  cancel(id: string, reason?: string | null): Promise<AdminNotificationActionResponse> {
    return apiRequest<AdminNotificationActionResponse>(`/v1/admin/notifications/logs/${id}/cancel`, {
      method: 'POST',
      body: { reason: reason ?? null },
    })
  },

  delivery(): Promise<AdminNotificationDeliveryMonitoring> {
    return apiGet<AdminNotificationDeliveryMonitoring>('/v1/admin/notifications/delivery')
  },

  providers(): Promise<AdminNotificationProvider[]> {
    return apiGet<AdminNotificationProvider[]>('/v1/admin/notifications/providers')
  },

  testProvider(channel: string): Promise<AdminNotificationProviderTestResult> {
    return apiRequest<AdminNotificationProviderTestResult>(
      `/v1/admin/notifications/providers/${channel}/test`,
      { method: 'POST' },
    )
  },

  templates(): Promise<AdminNotificationTemplate[]> {
    return apiGet<AdminNotificationTemplate[]>('/v1/admin/notifications/templates')
  },

  businesses(
    filters: { search?: string | null; page?: number; pageSize?: number } = {},
  ): Promise<PaginatedResponse<AdminNotificationBusinessSummary>> {
    return apiGet<PaginatedResponse<AdminNotificationBusinessSummary>>(
      '/v1/admin/notifications/businesses',
      filters as never,
    )
  },

  business(businessId: string): Promise<AdminNotificationBusinessDetail> {
    return apiGet<AdminNotificationBusinessDetail>(
      `/v1/admin/notifications/businesses/${businessId}`,
    )
  },

  setBusinessChannel(
    businessId: string,
    channel: string,
    enabled: boolean,
    reason?: string | null,
  ): Promise<AdminNotificationBusinessDetail> {
    return apiRequest<AdminNotificationBusinessDetail>(
      `/v1/admin/notifications/businesses/${businessId}/channels/${channel}`,
      { method: 'PUT', body: { enabled, reason: reason ?? null } },
    )
  },

  resetBusinessTemplates(businessId: string): Promise<AdminNotificationBusinessDetail> {
    return apiRequest<AdminNotificationBusinessDetail>(
      `/v1/admin/notifications/businesses/${businessId}/templates/reset`,
      { method: 'POST' },
    )
  },

  analytics(
    filters: { fromUtc?: string | null; toUtc?: string | null; days?: number } = {},
  ): Promise<AdminNotificationAnalytics> {
    return apiGet<AdminNotificationAnalytics>('/v1/admin/notifications/analytics', filters as never)
  },
}
