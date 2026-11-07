import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { errorMessage } from '../api/client'
import { queryKeys } from '../api/query-client'
import type {
  StorefrontBuilderState,
  StorefrontConfig,
  StorefrontRevisionFilters,
} from '../api/types'
import { storefrontBuilderApi } from './api'

/**
 * Owner-side Storefront Builder data access.
 *
 * The builder state is one query (draft + published + metadata). Every mutation
 * invalidates it, so the editor and the overview always agree. The public
 * storefront query is keyed per business, so a tenant switch cannot reuse another
 * business's cached storefront.
 */
export function useStorefrontBuilder(enabled = true) {
  return useQuery({
    queryKey: queryKeys.storefrontBuilder(),
    queryFn: () => storefrontBuilderApi.get(),
    enabled,
    staleTime: 15_000,
  })
}

/** The published storefront for a business (used by the editor's live preview). */
export function usePublicStorefront(businessId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.storefrontBuilderPublic(businessId),
    queryFn: () => storefrontBuilderApi.publicStorefront(businessId),
    enabled: enabled && Boolean(businessId),
  })
}

/** Invalidate both the builder state and the tenant's public storefront. */
function useBuilderInvalidate() {
  const queryClient = useQueryClient()
  return (businessId?: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.storefrontBuilder() })
    if (businessId) queryClient.invalidateQueries({ queryKey: queryKeys.storefrontBuilderPublic(businessId) })
    // The public storefront shell reads the bootstrap payload; refresh it too.
    queryClient.invalidateQueries({ queryKey: ['storefront'] })
  }
}

export function useSaveStorefrontDraft(businessId?: string) {
  const invalidate = useBuilderInvalidate()
  return useMutation({
    mutationFn: (variables: { config: StorefrontConfig; expectedVersion?: number }) =>
      storefrontBuilderApi.saveDraft(variables.config, variables.expectedVersion),
    onSuccess: (state: StorefrontBuilderState) => {
      invalidate(businessId)
      toast.success('Draft saved.')
      void state
    },
    onError: (error) => toast.error(errorMessage(error, 'The draft could not be saved.')),
  })
}

export function usePublishStorefront(businessId?: string) {
  const invalidate = useBuilderInvalidate()
  return useMutation({
    mutationFn: (variables: { config?: StorefrontConfig; expectedVersion?: number } | void) =>
      storefrontBuilderApi.publish(variables?.config, variables?.expectedVersion),
    onSuccess: () => {
      invalidate(businessId)
      toast.success('Your storefront is live.')
    },
    onError: (error) => toast.error(errorMessage(error, 'The storefront could not be published.')),
  })
}

export function useUnpublishStorefront(businessId?: string) {
  const invalidate = useBuilderInvalidate()
  return useMutation({
    mutationFn: () => storefrontBuilderApi.unpublish(),
    onSuccess: () => {
      invalidate(businessId)
      toast.success('Storefront unpublished.')
    },
    onError: (error) => toast.error(errorMessage(error, 'The storefront could not be unpublished.')),
  })
}

export function useResetStorefrontDraft(businessId?: string) {
  const invalidate = useBuilderInvalidate()
  return useMutation({
    mutationFn: () => storefrontBuilderApi.reset(),
    onSuccess: () => {
      invalidate(businessId)
      toast.success('Draft restored from the published version.')
    },
    onError: (error) => toast.error(errorMessage(error, 'The draft could not be restored.')),
  })
}

export function useApplyStorefrontTemplate(businessId?: string) {
  const invalidate = useBuilderInvalidate()
  return useMutation({
    mutationFn: (templateId: string) => storefrontBuilderApi.applyTemplate(templateId),
    onSuccess: () => {
      invalidate(businessId)
      toast.success('Template applied.')
    },
    onError: (error) => toast.error(errorMessage(error, 'The template could not be applied.')),
  })
}

/** One page of the builder's revision history (metadata only, newest first). */
export function useStorefrontRevisions(filters: StorefrontRevisionFilters, enabled = true) {
  return useQuery({
    queryKey: queryKeys.storefrontRevisions(filters as Record<string, unknown>),
    queryFn: () => storefrontBuilderApi.revisions(filters),
    enabled,
    // Keep the current page visible while the next one loads, so paging the
    // history never flashes an empty panel.
    placeholderData: (previous) => previous,
  })
}

/** One historical revision, with its full configuration snapshot. */
export function useStorefrontRevision(revisionId: string | null, enabled = true) {
  return useQuery({
    queryKey: queryKeys.storefrontRevision(revisionId ?? ''),
    queryFn: () => storefrontBuilderApi.revision(revisionId as string),
    enabled: enabled && Boolean(revisionId),
  })
}

/** Structured differences between two revisions. */
export function useStorefrontRevisionComparison(
  from: string | null,
  to: string | null,
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.storefrontRevisionCompare(from ?? '', to ?? ''),
    queryFn: () => storefrontBuilderApi.compareRevisions(from as string, to as string),
    enabled: enabled && Boolean(from) && Boolean(to) && from !== to,
  })
}

/**
 * Restores a historical revision into the working draft.
 *
 * The published storefront is deliberately not touched — publishing stays a
 * separate, explicit action — so both the builder state and the history are
 * invalidated (a rollback appends a revision and moves the draft).
 */
export function useRestoreStorefrontRevision(businessId?: string) {
  const invalidate = useBuilderInvalidate()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (variables: { revisionId: string; expectedVersion?: number }) =>
      storefrontBuilderApi.restoreRevision(variables.revisionId, {
        confirm: true,
        expectedVersion: variables.expectedVersion,
      }),
    onSuccess: (result) => {
      invalidate(businessId)
      queryClient.invalidateQueries({ queryKey: ['storefront-builder', 'revisions'] })
      toast.success(
        `Restored version #${result.revision.revisionNumber}. Your live storefront is unchanged.`,
      )
    },
    onError: (error) => toast.error(errorMessage(error, 'That version could not be restored.')),
  })
}
