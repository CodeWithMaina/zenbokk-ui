import { apiGet, apiRequest } from '../api/client'
import type {
  PublicStorefront,
  SaveStorefrontDraftRequest,
  StorefrontBuilderState,
  StorefrontConfig,
} from '../api/types'

/**
 * The Storefront Builder API.
 *
 * Owner endpoints are gated server-side by the `storefront` module + Owner policy;
 * the business is always derived from the caller's membership, never sent by the
 * client. The public read is anonymous, tenant-narrowed and returns only the
 * published configuration.
 */
export const storefrontBuilderApi = {
  /** Owner builder state: draft + published + publication metadata. */
  get(): Promise<StorefrontBuilderState> {
    return apiGet<StorefrontBuilderState>('/v1/storefront/builder')
  },

  /** Replaces the working draft. Never touches the published storefront. */
  saveDraft(config: StorefrontConfig): Promise<StorefrontBuilderState> {
    const body: SaveStorefrontDraftRequest = { config }
    return apiRequest<StorefrontBuilderState>('/v1/storefront/builder/draft', { method: 'PUT', body })
  },

  /** Publishes the given config, or the current draft when omitted. */
  publish(config?: StorefrontConfig): Promise<StorefrontBuilderState> {
    return apiRequest<StorefrontBuilderState>('/v1/storefront/builder/publish', {
      method: 'POST',
      body: { config: config ?? null },
    })
  },

  unpublish(): Promise<StorefrontBuilderState> {
    return apiRequest<StorefrontBuilderState>('/v1/storefront/builder/unpublish', { method: 'POST' })
  },

  /** Discards the draft, restoring it from the published configuration. */
  reset(): Promise<StorefrontBuilderState> {
    return apiRequest<StorefrontBuilderState>('/v1/storefront/builder/reset', { method: 'POST' })
  },

  /** Applies a template's design to the draft (content preserved). */
  applyTemplate(templateId: string): Promise<StorefrontBuilderState> {
    return apiRequest<StorefrontBuilderState>(
      `/v1/storefront/builder/template/${encodeURIComponent(templateId)}`,
      { method: 'POST' },
    )
  },

  /** The published storefront for a business (public, read-only). */
  publicStorefront(businessId: string): Promise<PublicStorefront> {
    return apiGet<PublicStorefront>(`/v1/storefront/public/${businessId}`)
  },
}
