import { apiGet, apiRequest } from '../api/client'
import type {
  PublicStorefront,
  RestoreStorefrontRevisionResult,
  SaveStorefrontDraftRequest,
  StorefrontBuilderState,
  StorefrontConfig,
  StorefrontRevisionDetail,
  StorefrontRevisionFilters,
  StorefrontRevisionPage,
  StorefrontRevisionComparison,
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
  saveDraft(config: StorefrontConfig, expectedVersion?: number): Promise<StorefrontBuilderState> {
    const body: SaveStorefrontDraftRequest = { config, expectedVersion }
    return apiRequest<StorefrontBuilderState>('/v1/storefront/builder/draft', { method: 'PUT', body })
  },

  /** Publishes the given config, or the current draft when omitted. */
  publish(config?: StorefrontConfig, expectedVersion?: number): Promise<StorefrontBuilderState> {
    return apiRequest<StorefrontBuilderState>('/v1/storefront/builder/publish', {
      method: 'POST',
      body: { config: config ?? null, expectedVersion },
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

  /** One page of the revision history, newest first. Metadata only. */
  revisions(filters: StorefrontRevisionFilters = {}): Promise<StorefrontRevisionPage> {
    return apiGet<StorefrontRevisionPage>('/v1/storefront/builder/revisions', {
      ...filters,
    })
  },

  /** One historical revision with its complete configuration snapshot. */
  revision(revisionId: string): Promise<StorefrontRevisionDetail> {
    return apiGet<StorefrontRevisionDetail>(
      `/v1/storefront/builder/revisions/${encodeURIComponent(revisionId)}`,
    )
  },

  /** Structured differences between two revisions. */
  compareRevisions(from: string, to: string): Promise<StorefrontRevisionComparison> {
    return apiGet<StorefrontRevisionComparison>('/v1/storefront/builder/revisions/compare', { from, to })
  },

  /**
   * Restores a revision into the working draft. `confirm` must be true — the API
   * refuses an accidental restore — and the published storefront is untouched.
   */
  restoreRevision(
    revisionId: string,
    options: { confirm: boolean; expectedVersion?: number },
  ): Promise<RestoreStorefrontRevisionResult> {
    return apiRequest<RestoreStorefrontRevisionResult>(
      `/v1/storefront/builder/revisions/${encodeURIComponent(revisionId)}/restore`,
      { method: 'POST', body: options },
    )
  },

  /** The published storefront for a business (public, read-only). */
  publicStorefront(businessId: string): Promise<PublicStorefront> {
    return apiGet<PublicStorefront>(`/v1/storefront/public/${businessId}`)
  },
}
