/**
 * Staff module: the owner's team roster and every per-member management
 * surface.
 *
 * `api.ts` is the only place that talks to the staff endpoints, `mappers.ts`
 * owns every label/tone/time mapping, and the hooks own the query keys — so the
 * pages and components stay presentational.
 */
export { STAFF_SORT, staffApi } from './api'
export type { StaffActivityFeed, StaffActivityItem, StaffAnalyticsPeriod, StaffSort } from './api'
export {
  STAFF_ROSTER_FILTERS,
  WEEK_ORDER,
  availabilitySourceLabel,
  formatWindow,
  groupTimeOff,
  minutesToTime,
  sortWeek,
  staffActivityDataStatus,
  staffActivityLabel,
  staffCompleteness,
  staffMembershipDataStatus,
  staffMembershipLabel,
  staffMembershipTone,
  staffRosterFilterLabel,
  staffRosterFilterQuery,
  timeToMinutes,
  weeklyMinutes,
  workingMinutes,
} from './mappers'
export type { StaffCompleteness, StaffRosterFilter, StaffTimeOffRange } from './mappers'
export {
  useStaffAnalytics,
  useStaffAvailability,
  useStaffConsoleAppointments,
  useStaffDetail,
  useStaffInvitations,
  useStaffMemberActivity,
  useStaffMemberAnalytics,
  useStaffMutations,
  useStaffOverview,
  useStaffPositions,
  useStaffRoster,
  useStaffServices,
} from './use-staff'
