import { apiGet, apiRequest } from '../api/client'

/**
 * Business notification workspace client.
 *
 * Tenant-scoped: every path carries the business id, and the API re-checks that
 * the caller owns (or may manage) that business. Platform-owned provider
 * credentials never appear in any response here.
 */

export type BusinessNotificationActivity = {
  id: string
  channel: string
  notificationType: string
  status: string
  recipientMasked: string
  isTest: boolean
  createdAtUtc: string
  deliveredAtUtc: string | null
}

export type BusinessNotificationCount = {
  key: string
  label: string
  total: number
  sent: number
  failed: number
  pending: number
  successRatePercent: number | null
}

export type BusinessNotificationTrendPoint = {
  date: string
  sent: number
  failed: number
  pending: number
}

export type BusinessNotificationOverview = {
  businessId: string
  fromUtc: string
  toUtc: string
  updatedAtUtc: string
  systemStatus: string
  statusDetail: string
  enabledChannels: string[]
  availableChannels: string[]
  totalNotifications: number
  delivered: number
  failed: number
  pending: number
  processing: number
  deliverySuccessRatePercent: number | null
  byChannel: BusinessNotificationCount[]
  dailyTrend: BusinessNotificationTrendPoint[]
  recentActivity: BusinessNotificationActivity[]
}

export type BusinessNotificationChannel = {
  channel: string
  available: boolean
  enabled: boolean
  settings: Record<string, string | null>
  platformNotes: string[]
  verificationStatus: string
  verificationDetail: string
}

export type UpdateBusinessNotificationChannels = {
  displayName?: string | null
  replyTo?: string | null
  contactEmail?: string | null
  contactPhone?: string | null
  website?: string | null
  primaryColor?: string | null
  secondaryColor?: string | null
  footerNote?: string | null
  logoMediaId?: string | null
  timezone?: string | null
  enabledChannels?: string[]
}

export type BusinessNotificationPreference = {
  category: string
  channel: string
  enabled: boolean
  available: boolean
  source: string
  adminOverride: boolean
}

export type BusinessNotificationTemplate = {
  type: string
  category: string
  channel: string
  title: string
  source: string
  overrideId: string | null
  version: number | null
  protected: boolean
  updatedAtUtc: string | null
  availableVariables: string[]
}

export type BusinessNotificationVariable = {
  token: string
  label: string
  sampleValue: string
}

export type BusinessNotificationPreview = {
  subject: string
  title: string
  body: string
  bodyHtml: string
  unknownTokens: string[]
  hasUnknownTokens: boolean
}

export type BusinessNotificationTestSend = {
  accepted: boolean
  channel: string
  message: string
  renderedSubject: string | null
  renderedBody: string | null
}

export type BusinessAutomationRule = {
  id: string
  name: string
  description: string | null
  trigger: string
  enabled: boolean
  version: number
  dailyActionCap: number | null
  frequencyCapMinutes: number | null
  conditionsJson: string
  actionsJson: string
  recipientsJson: string
  updatedAt: string
}

const base = (businessId: string) => `/v1/businesses/${businessId}/notifications`

export const businessNotificationsApi = {
  overview(
    businessId: string,
    range: 'today' | '7d' | '30d' | '90d' = '30d',
  ): Promise<BusinessNotificationOverview> {
    return apiGet<BusinessNotificationOverview>(`${base(businessId)}/overview`, { range })
  },

  channels(businessId: string): Promise<BusinessNotificationChannel[]> {
    return apiGet<BusinessNotificationChannel[]>(`${base(businessId)}/channels`)
  },

  updateChannels(
    businessId: string,
    payload: UpdateBusinessNotificationChannels,
  ): Promise<BusinessNotificationChannel[]> {
    return apiRequest<BusinessNotificationChannel[]>(`${base(businessId)}/channels`, {
      method: 'PUT',
      body: payload,
    })
  },

  preferences(businessId: string): Promise<BusinessNotificationPreference[]> {
    return apiGet<BusinessNotificationPreference[]>(`${base(businessId)}/preferences`)
  },

  updatePreferences(
    businessId: string,
    preferences: { category: string; channel: string; enabled: boolean }[],
  ): Promise<BusinessNotificationPreference[]> {
    return apiRequest<BusinessNotificationPreference[]>(`${base(businessId)}/preferences`, {
      method: 'PUT',
      body: { preferences },
    })
  },

  templates(
    businessId: string,
    filters: { search?: string | null; category?: string | null; channel?: string | null } = {},
  ): Promise<BusinessNotificationTemplate[]> {
    return apiGet<BusinessNotificationTemplate[]>(`${base(businessId)}/templates`, filters as never)
  },

  variables(businessId: string, type: string): Promise<BusinessNotificationVariable[]> {
    return apiGet<BusinessNotificationVariable[]>(
      `${base(businessId)}/variables/${encodeURIComponent(type)}`,
    )
  },

  preview(
    businessId: string,
    payload: {
      type: string
      channel: string
      subjectTemplate?: string | null
      bodyTemplateHtml: string
      bodyTemplateText: string
    },
  ): Promise<BusinessNotificationPreview> {
    return apiRequest<BusinessNotificationPreview>(`${base(businessId)}/preview`, {
      method: 'POST',
      body: payload,
    })
  },

  testSend(
    businessId: string,
    payload: { channel: string; type: string; recipient: string },
  ): Promise<BusinessNotificationTestSend> {
    return apiRequest<BusinessNotificationTestSend>(`${base(businessId)}/test-send`, {
      method: 'POST',
      body: payload,
    })
  },

  /** Automation rules reuse the existing automation module (no second engine). */
  automationRules(): Promise<BusinessAutomationRule[]> {
    return apiGet<BusinessAutomationRule[]>('/v1/automation/rules')
  },

  toggleAutomationRule(id: string, enable: boolean): Promise<BusinessAutomationRule> {
    return apiRequest<BusinessAutomationRule>(
      `/v1/automation/rules/${id}/toggle?enable=${enable ? 'true' : 'false'}`,
      { method: 'POST' },
    )
  },

  /**
   * Template overrides are written through the existing template-override
   * controller, which validates tokens against the type's payload schema and
   * records a durable version — so an edit here reaches the delivery pipeline.
   */
  createTemplateOverride(
    businessId: string,
    payload: TemplateOverridePayload,
  ): Promise<TemplateOverrideRecord> {
    return apiRequest<TemplateOverrideRecord>(
      `/v1/admin/businesses/${businessId}/notification-templates/overrides`,
      { method: 'POST', body: payload },
    )
  },

  updateTemplateOverride(
    businessId: string,
    overrideId: string,
    payload: TemplateOverridePayload,
  ): Promise<TemplateOverrideRecord> {
    return apiRequest<TemplateOverrideRecord>(
      `/v1/admin/businesses/${businessId}/notification-templates/overrides/${overrideId}`,
      { method: 'PUT', body: payload },
    )
  },

  deleteTemplateOverride(businessId: string, overrideId: string): Promise<unknown> {
    return apiRequest<unknown>(
      `/v1/admin/businesses/${businessId}/notification-templates/overrides/${overrideId}`,
      { method: 'DELETE' },
    )
  },

  effectiveTemplate(
    businessId: string,
    type: string,
    channel: string,
  ): Promise<EffectiveTemplate> {
    return apiGet<EffectiveTemplate>(
      `/v1/admin/businesses/${businessId}/notification-templates/effective/${encodeURIComponent(type)}/${encodeURIComponent(channel)}`,
    )
  },
}

export type TemplateOverridePayload = {
  type: string
  channel: string
  subjectTemplate?: string | null
  bodyTemplateHtml: string
  bodyTemplateText: string
  updatedBy: string
}

export type TemplateOverrideRecord = {
  id: string
  businessId: string
  type: string
  channel: string
  subjectTemplate: string | null
  bodyTemplateHtml: string
  bodyTemplateText: string
  version: number
  updatedBy: string
  createdAt: string
  updatedAt: string
}

export type EffectiveTemplate = {
  type: string
  channel: string
  source: string
  subject: string | null
  title: string
  body: string
  bodyHtml: string
  overrideId: string | null
  overrideVersion: number | null
}
