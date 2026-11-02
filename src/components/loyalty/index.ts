/**
 * Loyalty Programs module components.
 *
 * Presentation only: these read data through `src/lib/loyalty` and compose the
 * shared kit in `src/components/ui`, so the module stays inside the Punched
 * theme rather than carrying a look of its own.
 *
 * The one exception is `LoyaltyCardRenderer`, which renders the HTML template
 * the backend owns inside a sandboxed iframe — the module never re-creates a
 * card design in JSX.
 */
export { ChangeLoyaltyDesignDrawer } from './ChangeLoyaltyDesignDrawer'
export type { ChangeLoyaltyDesignDrawerProps } from './ChangeLoyaltyDesignDrawer'
export { CreateLoyaltyProgramDrawer } from './CreateLoyaltyProgramDrawer'
export type { CreateLoyaltyProgramDrawerProps } from './CreateLoyaltyProgramDrawer'
export { CustomerLoyaltyCard } from './CustomerLoyaltyCard'
export type { CustomerLoyaltyCardProps } from './CustomerLoyaltyCard'
export { EditLoyaltyProgramDrawer } from './EditLoyaltyProgramDrawer'
export type { EditLoyaltyProgramDrawerProps } from './EditLoyaltyProgramDrawer'
export { LoyaltyCardGallery } from './LoyaltyCardGallery'
export type { LoyaltyCardGalleryProps } from './LoyaltyCardGallery'
export { LoyaltyCardRenderer } from './LoyaltyCardRenderer'
export type { LoyaltyCardRendererProps } from './LoyaltyCardRenderer'
export { LoyaltyDatePicker } from './LoyaltyDatePicker'
export type { LoyaltyDatePickerProps } from './LoyaltyDatePicker'
export { LoyaltyProgramCard } from './LoyaltyProgramCard'
export type { LoyaltyProgramCardProps } from './LoyaltyProgramCard'
export { LoyaltyProgramCustomers } from './LoyaltyProgramCustomers'
export type { LoyaltyProgramCustomersProps } from './LoyaltyProgramCustomers'
export { LoyaltyProgramDetails, PROGRAM_TABS } from './LoyaltyProgramDetails'
export type { LoyaltyProgramDetailsProps, ProgramTab } from './LoyaltyProgramDetails'
export { LoyaltyProgramFilters } from './LoyaltyProgramFilters'
export type { LoyaltyProgramFiltersProps } from './LoyaltyProgramFilters'
export { LoyaltyProgramForm } from './LoyaltyProgramForm'
export type { LoyaltyProgramFormErrors, LoyaltyProgramFormProps } from './LoyaltyProgramForm'
export { LoyaltyProgramList } from './LoyaltyProgramList'
export type { LoyaltyProgramListProps } from './LoyaltyProgramList'
export { LoyaltyProgramOverview } from './LoyaltyProgramOverview'
export type { LoyaltyProgramOverviewProps } from './LoyaltyProgramOverview'
export { LoyaltyProgramSettings } from './LoyaltyProgramSettings'
export type { LoyaltyProgramSettingsProps } from './LoyaltyProgramSettings'
export { LoyaltyProgramStatistics } from './LoyaltyProgramStatistics'
export type { LoyaltyProgramStatisticsProps } from './LoyaltyProgramStatistics'
export { LoyaltyProgramsPage } from './LoyaltyProgramsPage'
export type { LoyaltyProgramsPageProps } from './LoyaltyProgramsPage'
export { ProgramConfirmationDialog } from './ProgramConfirmationDialog'
export type { ProgramConfirmationDialogProps } from './ProgramConfirmationDialog'
export { ProgramStatusBadge } from './ProgramStatusBadge'
export type { ProgramStatusBadgeProps } from './ProgramStatusBadge'
