import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { errorMessage } from '../api/client'
import { queryKeys } from '../api/query-client'
import type { StorefrontBuilderState, StorefrontConfig } from '../api/types'
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
    mutationFn: (config: StorefrontConfig) => storefrontBuilderApi.saveDraft(config),
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
    mutationFn: (config?: StorefrontConfig) => storefrontBuilderApi.publish(config),
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
