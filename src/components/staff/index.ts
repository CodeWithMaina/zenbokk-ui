/**
 * Staff module components. Every piece here is composed from the shared UI kit
 * in `components/ui`, so the module inherits the theme's tokens, focus
 * behaviour and responsive rules rather than restating them.
 */
export { StaffCard } from './StaffCard'
export type { StaffCardProps, StaffRow } from './StaffCard'
export { StaffTable } from './StaffTable'
export type { StaffTableProps } from './StaffTable'
export { StaffRosterFilters } from './StaffRosterFilters'
export type { StaffRosterFilterCounts, StaffRosterFiltersProps } from './StaffRosterFilters'
export { StaffToolbar } from './StaffToolbar'
export type { StaffToolbarProps, StaffView } from './StaffToolbar'
export { StaffSelectionDock } from './StaffSelectionDock'
export type { StaffSelectionDockProps } from './StaffSelectionDock'
export { StaffExportDrawer } from './StaffExportDrawer'
export type { StaffExportDrawerProps } from './StaffExportDrawer'
export { StaffInviteDrawer } from './StaffInviteDrawer'
export type { StaffInviteDrawerProps } from './StaffInviteDrawer'
export { StaffProfileDrawer } from './StaffProfileDrawer'
export type { StaffProfileDrawerProps } from './StaffProfileDrawer'
export { StaffDetailsHeader } from './StaffDetailsHeader'
export type { StaffDetailsHeaderProps } from './StaffDetailsHeader'
export {
  StaffAttendanceTab,
  StaffBookingsTab,
  StaffCommissionTab,
  StaffOverviewTab,
  StaffProfileTab,
  StaffScheduleTab,
  StaffServicesTab,
} from './StaffDetailTabs'
