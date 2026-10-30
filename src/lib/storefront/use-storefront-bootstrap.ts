import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '../api/query-client'
import { storefrontApi } from './api'

/**
 * Storefront bootstrap query, owned by the `$slug` layout so that layout can
 * render its own loading and "no such business" states.
 */
export function useStorefrontBootstrap(slug: string) {
  return useQuery({
    queryKey: queryKeys.storefront(slug),
    queryFn: () => storefrontApi.bootstrap(slug),
    // A wrong, suspended or unknown address must surface an error, not retry.
    retry: false,
  })
}
