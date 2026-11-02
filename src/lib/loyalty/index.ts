/**
 * Loyalty Programs module: the owner-facing program catalogue, its card
 * designs and its enrolled customers.
 *
 * `api.ts` is the only place that talks to the loyalty endpoints, `mappers.ts`
 * owns every label/derivation, `card-template.ts` owns card-markup safety, and
 * the hooks own the query keys — so the pages and components stay
 * presentational.
 */
export { loyaltyApi } from './api'
export {
  CARD_TEMPLATE_VARIABLES,
  hasUnresolvedPlaceholders,
  prepareCardHtml,
  renderCardTemplate,
  sanitizeCardHtml,
} from './card-template'
export type { CardTemplateValues } from './card-template'
export {
  PROGRAM_STATUS_FILTERS,
  PROGRAM_TYPE_OPTIONS,
  emptyProgramDraft,
  normalizeProgramStatus,
  programScheduleNote,
  programStatusDataStatus,
  programStatusFilterLabel,
  programStatusHint,
  programStatusLabel,
  programStatusTone,
  programSubtitle,
  programTypeLabel,
  rewardSummary,
  rewardValidityLabel,
} from './mappers'
export {
  useCardDesignPreview,
  useCardDesigns,
  useChangeCardDesign,
  useCreateProgram,
  useProgram,
  useProgramActivity,
  useProgramCustomers,
  useProgramDetail,
  useProgramLifecycle,
  usePrograms,
  useUpdateProgram,
} from './use-loyalty'
export type {
  AvailableCardDesign,
  CreateLoyaltyProgramRequest,
  LoyaltyProgram,
  LoyaltyProgramDraft,
  PreviewCardDesignRequest,
  PreviewCardDesignResponse,
  ProgramActivityItem,
  ProgramActivityPage,
  ProgramCustomerFilters,
  ProgramCustomers,
  ProgramDetail,
  ProgramStatus,
  ProgramStatusFilter,
  ProgramType,
  UpdateLoyaltyProgramRequest,
} from './types'
