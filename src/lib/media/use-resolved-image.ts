import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '../api/query-client'
import { imageSources, mediaApi } from './api'

export type ResolvedImage = {
  /** The best URL to render, or null when there is nothing to show. */
  src: string | null
  /** True while the media record for a known id is still being fetched. */
  isLoading: boolean
  isError: boolean
}

/**
 * Resolve a stored media id (avatar / logo / cover) to a renderable URL.
 *
 * Uploads are stored as a *media id*, not a URL, so the source of truth is the
 * media record's processed variants. When no id is set (or the record cannot be
 * read), the caller's fallback URL — the legacy `avatarUrl` / `logoUrl` — is
 * used instead, so a business that predates the media pipeline still renders.
 */
export function useResolvedImage(input: {
  mediaId?: string | null
  url?: string | null
}): ResolvedImage {
  const mediaId = input.mediaId ?? null

  const query = useQuery({
    queryKey: queryKeys.media(mediaId ?? ''),
    queryFn: () => mediaApi.get(mediaId as string),
    enabled: Boolean(mediaId),
    staleTime: 5 * 60_000,
    retry: false,
  })

  const fromMedia = mediaId && query.data ? (imageSources(query.data.variants).src ?? null) : null

  return {
    src: fromMedia ?? input.url ?? null,
    isLoading: Boolean(mediaId) && query.isPending,
    isError: Boolean(mediaId) && query.isError,
  }
}
