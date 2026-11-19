import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiRequest } from '../api/client'

/** One working period, in minutes from business-local midnight. */
export type SchedulePeriod = { startMinute: number; endMinute: number }

export type ScheduleDay = {
  /** 0 = Sunday ... 6 = Saturday. */
  dayOfWeek: number
  isClosed: boolean
  periods: SchedulePeriod[]
}

export type ScheduleException = {
  id: string
  /** Business-local date, yyyy-MM-dd. */
  date: string
  isClosed: boolean
  reason: string | null
  periods: SchedulePeriod[]
}

export type BusinessSchedule = {
  businessId: string
  timeZoneId: string
  days: ScheduleDay[]
  exceptions: ScheduleException[]
}

export type SaveScheduleInput = { timeZoneId?: string; days: ScheduleDay[] }
export type SaveExceptionInput = {
  date: string
  isClosed: boolean
  reason?: string | null
  periods: SchedulePeriod[]
}

const key = (businessId: string | undefined) => ['business-schedule', businessId ?? 'none'] as const

export const scheduleApi = {
  get(businessId: string): Promise<BusinessSchedule> {
    return apiGet<BusinessSchedule>(`/v1/businesses/${businessId}/schedule`)
  },
  save(businessId: string, body: SaveScheduleInput): Promise<BusinessSchedule> {
    return apiRequest<BusinessSchedule>(`/v1/businesses/${businessId}/schedule`, {
      method: 'PUT',
      body,
    })
  },
  saveException(businessId: string, body: SaveExceptionInput): Promise<ScheduleException> {
    return apiRequest<ScheduleException>(`/v1/businesses/${businessId}/schedule/exceptions`, {
      method: 'POST',
      body,
    })
  },
  deleteException(businessId: string, exceptionId: string): Promise<boolean> {
    return apiRequest<boolean>(`/v1/businesses/${businessId}/schedule/exceptions/${exceptionId}`, {
      method: 'DELETE',
    })
  },
}

export function useBusinessSchedule(businessId: string | undefined) {
  return useQuery({
    queryKey: key(businessId),
    queryFn: () => scheduleApi.get(businessId as string),
    enabled: Boolean(businessId),
    staleTime: 30_000,
  })
}

export function useSaveBusinessSchedule(businessId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: SaveScheduleInput) => scheduleApi.save(businessId as string, body),
    onSuccess: (data) => queryClient.setQueryData(key(businessId), data),
  })
}

export function useSaveScheduleException(businessId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: SaveExceptionInput) => scheduleApi.saveException(businessId as string, body),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: key(businessId) }),
  })
}

export function useDeleteScheduleException(businessId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (exceptionId: string) => scheduleApi.deleteException(businessId as string, exceptionId),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: key(businessId) }),
  })
}

/** Minutes from midnight → `HH:mm` for a time input. */
export function minutesToTime(minutes: number): string {
  const safe = Math.min(1440, Math.max(0, Math.round(minutes)))
  const hours = Math.floor(safe / 60)
  const mins = safe % 60
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
}

/** `HH:mm` → minutes from midnight. */
export function timeToMinutes(value: string): number {
  const [hours, mins] = value.split(':').map(Number)
  return (Number.isFinite(hours) ? hours : 0) * 60 + (Number.isFinite(mins) ? mins : 0)
}
