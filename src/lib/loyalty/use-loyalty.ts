import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../api/query-client'
import { loyaltyApi } from './api'
import type {
  CreateLoyaltyProgramRequest,
  LoyaltyProgram,
  PreviewCardDesignRequest,
  ProgramCustomerFilters,
  UpdateLoyaltyProgramRequest,
} from './types'

/**
 * Loyalty Programs module data access.
 *
 * Reads are keyed under the existing `['loyalty', …]` prefix, so one
 * `invalidateQueries({ queryKey: ['loyalty'] })` after a mutation refreshes the
 * list, every program's details, the design gallery and the customer roster —
 * and the `['customers']` prefix is invalidated too, because enrolling a
 * customer (or stamping a card) changes the roster counts the Clients module
 * shows.
 */

/** Programs owned by the business. */
export function usePrograms(enabled = true) {
  return useQuery({
    queryKey: queryKeys.loyaltyPrograms(),
    queryFn: () => loyaltyApi.listPrograms(),
    enabled,
    staleTime: 30_000,
  })
}

/** One program, without metrics. */
export function useProgram(programId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.loyaltyProgram(programId),
    queryFn: () => loyaltyApi.getProgram(programId),
    enabled: enabled && programId.length > 0,
    staleTime: 30_000,
  })
}

/** One program plus live performance metrics (the details Overview). */
export function useProgramDetail(programId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.loyaltyProgramDetail(programId),
    queryFn: () => loyaltyApi.getProgramDetail(programId),
    enabled: enabled && programId.length > 0,
    staleTime: 30_000,
  })
}

/** Designs this business may choose from. */
export function useCardDesigns(enabled = true) {
  return useQuery({
    queryKey: queryKeys.loyaltyCardDesigns(),
    queryFn: () => loyaltyApi.listCardDesigns(),
    enabled,
    staleTime: 60_000,
  })
}

/** Enrolled customers of one program (server-side search, sort, paging). */
export function useProgramCustomers(
  programId: string,
  filters: ProgramCustomerFilters,
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.loyaltyProgramCustomers(programId, filters as Record<string, unknown>),
    queryFn: () => loyaltyApi.listProgramCustomers(programId, filters),
    enabled: enabled && programId.length > 0,
    staleTime: 20_000,
  })
}

/** A program's stamp activity/audit feed. */
export function useProgramActivity(
  programId: string,
  filters: { page: number; pageSize: number },
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.loyaltyProgramActivity(programId, filters),
    queryFn: () => loyaltyApi.programActivity(programId, filters.page, filters.pageSize),
    enabled: enabled && programId.length > 0,
    staleTime: 20_000,
  })
}

/**
 * Live card preview for the creation drawer.
 *
 * The values are sent to the backend, which renders them through the same
 * pipeline a customer sees — so the preview can never drift from production.
 * The previous render is kept while a new one is in flight, which stops the
 * card flickering on every keystroke.
 */
export function useCardDesignPreview(request: PreviewCardDesignRequest, enabled = true) {
  return useQuery({
    queryKey: ['loyalty', 'card-designs', 'preview', request] as const,
    queryFn: () => loyaltyApi.previewCardDesign(request),
    enabled,
    staleTime: 30_000,
    placeholderData: (previous) => previous,
  })
}

/**
 * Create a program.
 *
 * The API has no "create as draft" flag, so a draft is two supported calls:
 * create (the API persists it Active) then PATCH the lifecycle status to
 * `Draft`. Launching is the single create call. Nothing is reported as saved
 * until the final call resolves.
 */
export function useCreateProgram() {
  const queryClient = useQueryClient()

  return useMutation<
    LoyaltyProgram,
    Error,
    { payload: CreateLoyaltyProgramRequest; draft: boolean }
  >({
    mutationFn: async ({ payload, draft }) => {
      const program = await loyaltyApi.createProgram(payload)
      if (!draft) return program
      return loyaltyApi.updateProgram(program.id, { status: 'Draft' })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['loyalty'] })
    },
  })
}

/** Persist edits to a program's configuration. */
export function useUpdateProgram(programId: string) {
  const queryClient = useQueryClient()

  return useMutation<LoyaltyProgram, Error, UpdateLoyaltyProgramRequest>({
    mutationFn: (payload) => loyaltyApi.updateProgram(programId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['loyalty'] })
    },
  })
}

/**
 * Lifecycle transitions (activate / pause / archive / duplicate) plus delete.
 * Each is a dedicated backend route, so the move is validated rather than
 * inferred from a boolean.
 */
export function useProgramLifecycle() {
  const queryClient = useQueryClient()
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['loyalty'] })

  const setStatus = useMutation<
    LoyaltyProgram,
    Error,
    { programId: string; action: 'activate' | 'pause' | 'archive' }
  >({
    mutationFn: ({ programId, action }) =>
      action === 'activate'
        ? loyaltyApi.activateProgram(programId)
        : action === 'pause'
          ? loyaltyApi.pauseProgram(programId)
          : loyaltyApi.archiveProgram(programId),
    onSuccess: invalidate,
  })

  const duplicate = useMutation<LoyaltyProgram, Error, { programId: string; newName?: string }>({
    mutationFn: ({ programId, newName }) => loyaltyApi.duplicateProgram(programId, newName),
    onSuccess: invalidate,
  })

  const remove = useMutation<boolean, Error, string>({
    mutationFn: (programId) => loyaltyApi.remove(programId),
    onSuccess: () => {
      invalidate()
      void queryClient.invalidateQueries({ queryKey: ['customers'] })
    },
  })

  return { setStatus, duplicate, remove }
}

/** Change a program's card design (or revert it to the platform default). */
export function useChangeCardDesign(programId: string) {
  const queryClient = useQueryClient()

  return useMutation<LoyaltyProgram, Error, { cardDesignId: string | null }>({
    mutationFn: ({ cardDesignId }) =>
      loyaltyApi.updateProgram(
        programId,
        cardDesignId ? { cardDesignId } : { clearCardDesign: true },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['loyalty'] })
    },
  })
}
