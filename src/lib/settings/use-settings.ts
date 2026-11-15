import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { QueryClient } from '@tanstack/react-query'
import { queryKeys } from '../api/query-client'
import type {
  BusinessModulesResponse,
  BusinessResponse,
  SupportContact,
  UpdateBusinessDailyGoalRequest,
  UpdateBusinessReminderPolicyRequest,
  UpdateBusinessRequest,
} from '../api/types'
import { settingsApi, supportApi } from './api'

/**
 * Invalidate everything a business-profile write can change: the shell
 * bootstrap (brand, plan banner, navigation) and the settings read itself.
 * One helper so every mutation refreshes the same surfaces.
 */
function refreshBusiness(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard() })
  void queryClient.invalidateQueries({ queryKey: queryKeys.settingsBusiness() })
}

/** The owner's full business record (reminder policy + daily goals + media ids). */
export function useSettingsBusiness() {
  return useQuery({
    queryKey: queryKeys.settingsBusiness(),
    queryFn: settingsApi.business,
    staleTime: 60_000,
    retry: false,
  })
}

/** Every module with its effective entitlement (owner view). */
export function useSettingsModules() {
  return useQuery<BusinessModulesResponse>({
    queryKey: queryKeys.settingsModules(),
    queryFn: settingsApi.modules,
    staleTime: 5 * 60_000,
    retry: false,
  })
}

/** Platform support channels, resolved from server configuration. */
export function useSupportContact() {
  return useQuery<SupportContact>({
    queryKey: queryKeys.supportContact(),
    queryFn: supportApi.contact,
    staleTime: 30 * 60_000,
    retry: false,
  })
}

/** Patch the business profile. */
export function useUpdateBusiness() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: UpdateBusinessRequest) => settingsApi.updateBusiness(payload),
    onSuccess: (business: BusinessResponse) => {
      queryClient.setQueryData(queryKeys.settingsBusiness(), business)
      refreshBusiness(queryClient)
    },
  })
}

/** Change the storefront address. */
export function useUpdateSlug() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (slug: string) => settingsApi.updateSlug(slug),
    onSuccess: (business: BusinessResponse) => {
      queryClient.setQueryData(queryKeys.settingsBusiness(), business)
      refreshBusiness(queryClient)
    },
  })
}

/** Update the appointment reminder ladder. */
export function useUpdateReminderPolicy() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: UpdateBusinessReminderPolicyRequest) =>
      settingsApi.updateReminderPolicy(payload),
    onSuccess: (business: BusinessResponse) => {
      queryClient.setQueryData(queryKeys.settingsBusiness(), business)
      refreshBusiness(queryClient)
    },
  })
}

/** Update the business daily goal (metric + targets). */
export function useUpdateDailyGoal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: UpdateBusinessDailyGoalRequest) => settingsApi.updateDailyGoal(payload),
    onSuccess: (business: BusinessResponse) => {
      queryClient.setQueryData(queryKeys.settingsBusiness(), business)
      refreshBusiness(queryClient)
    },
  })
}

/**
 * Enable or disable one module for the caller's business.
 *
 * Turning a module off must reach *every* surface at once — the sidebar entry, the route
 * guard, and the cached reads that module backs — so this invalidates the shell bootstrap
 * (which carries the entitlement list the navigation resolves against) as well as the
 * settings read. It deliberately does not clear feature data: disabling Finance hides the
 * screens, it does not delete a book of record.
 */
export function useSetModuleEnabled() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: { moduleKey: string; enabled: boolean }) =>
      settingsApi.setModuleEnabled(input.moduleKey, input.enabled),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.settingsModules() })
      refreshBusiness(queryClient)
      void queryClient.invalidateQueries({ queryKey: ['finances'] })
    },
  })
}
