import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '../api/query-client'
import type { CustomerOption } from '../api/types'
import { clientsApi } from '../clients/api'
import { useDebouncedValue } from '../hooks/use-debounced-value'
import { staffApi } from '../staff/api'

/**
 * Server-side search for the booking selectors.
 *
 * <para>Hundreds of customers or staff must never be shipped to the browser to fill a
 * dropdown, so the term is debounced and each settled keystroke becomes one paged
 * request. Tenancy is never named by the client: both endpoints resolve the business
 * from the caller's token.</para>
 *
 * <para><c>enabled</c> is the caller's gate. The staff search is never issued when the
 * optional Staff module is off, so turning the module off stops the request at the
 * source rather than filtering an answer the browser should not have asked for.</para>
 */

/** How many rows one selector page loads. Kept small — the list is scroll-searched. */
export const ENTITY_SEARCH_PAGE_SIZE = 20

export type StaffOption = {
  userId: string
  fullName: string
  email: string
  avatarUrl: string | null
}

/** Debounced, paged, server-side customer search across name, phone and email. */
export function useCustomerSearch(term: string, enabled = true) {
  const search = useDebouncedValue(term.trim(), 300)
  const params = { search, page: 1, pageSize: ENTITY_SEARCH_PAGE_SIZE }

  return useQuery({
    queryKey: queryKeys.customerSearch(params),
    queryFn: () =>
      clientsApi.list({ search: search || null, status: 'all', page: 1, pageSize: ENTITY_SEARCH_PAGE_SIZE }),
    enabled,
    staleTime: 30_000,
    select: (page): CustomerOption[] =>
      page.items.map((customer) => ({
        userId: customer.userId,
        fullName: customer.fullName,
        email: customer.email,
        phoneNumber: customer.phoneNumber,
        avatarUrl: customer.avatarUrl,
        enrollmentStatus: customer.enrollmentStatus,
      })),
  })
}

/** Debounced, paged, server-side staff search. Only ever call with the module on. */
export function useStaffSearch(term: string, enabled = true) {
  const search = useDebouncedValue(term.trim(), 300)
  const params = { search, page: 1, pageSize: ENTITY_SEARCH_PAGE_SIZE }

  return useQuery({
    queryKey: queryKeys.staffSearch(params),
    queryFn: () =>
      staffApi.list({ search: search || null, page: 1, pageSize: ENTITY_SEARCH_PAGE_SIZE }),
    enabled,
    staleTime: 30_000,
    select: (page): StaffOption[] =>
      page.items.map((member) => ({
        userId: member.userId,
        fullName: member.fullName,
        email: member.email,
        avatarUrl: member.avatarUrl,
      })),
  })
}
