export { attendanceApi } from './api'
export { useAttendanceClock, useAttendanceHistory, useAttendanceOverview } from './use-attendance'

/** `CLOCK_IN` / `CLOCK_OUT` → readable copy. */
export function attendanceEventLabel(eventType: string): string {
  if (eventType === 'CLOCK_IN') return 'Clocked in'
  if (eventType === 'CLOCK_OUT') return 'Clocked out'
  return eventType
}

/** The overview's per-member state → readable copy. */
export function attendanceStateLabel(state: string): string {
  if (state === 'clocked_in') return 'Clocked in'
  if (state === 'clocked_out') return 'Clocked out'
  return 'Not clocked in'
}
