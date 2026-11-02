import type { BusinessCustomer, PaginatedResponse } from '../api/types'

/**
 * Domain vocabulary for the Loyalty **Programs** module.
 *
 * The wire shapes below mirror the backend DTOs exactly (see
 * `PunchedApi/Application/DTOs/BusinessDTOs.cs`, `ProgramActivityDTOs.cs` and
 * `CardDesignDTOs.cs`); the names a component reasons about live here so no
 * screen has to know that "paused" is really `status: "paused"`.
 */

/** `Domain/Entities/ProgramStatus.cs`, serialised by the API as a string. */
export type ProgramStatus = 'draft' | 'active' | 'paused' | 'archived'

/** Statuses the list's filter tabs can select. `all` is the absence of a filter. */
export type ProgramStatusFilter = 'all' | 'active' | 'paused' | 'draft'

/** `Domain/Entities/ProgramTypes.cs` — the earning models the backend accepts. */
export type ProgramType = 'stamp' | 'visit' | 'service' | 'purchase'

/** `LoyaltyProgramResponse` (`GET /v1/programs/me`). */
export type LoyaltyProgram = {
  id: string
  businessId: string
  name: string
  description: string | null
  isActive: boolean
  /** `draft` | `active` | `paused` | `archived`. */
  status: string
  stampsRequired: number
  rewardValue: number
  rewardDescription: string
  rewardExpirationHours: number
  defaultEnrollmentStamps: number
  programType: string
  imageMediaId: string | null
  /** Structured `ProgramConfig` when the program uses the flexible model. */
  config: Record<string, unknown> | null
  startsAt: string | null
  endsAt: string | null
  cardDesignId: string | null
  cardDesignName: string | null
  /** Server-rendered card markup. Never injected as raw HTML — see the renderer. */
  cardDesignHtml: string | null
  cardDesignIsDefault: boolean
  cardDesignVersion: number
  createdAt: string
}

/** `ProgramDetailResponse` (`GET /v1/programs/me/{id}/details`). */
export type ProgramDetail = {
  program: LoyaltyProgram
  summary: string
  activeCustomers: number
  stampsIssued: number
  rewardsEarned: number
  rewardsRedeemed: number
  completionRate: number
  redemptionRate: number
}

/** `AvailableCardDesignResponse` (`GET /v1/card-designs/me`). */
export type AvailableCardDesign = {
  id: string
  name: string
  isDefault: boolean
  isActive: boolean
  /** The design rendered with safe sample data through the production pipeline. */
  previewHtml: string
}

/** `PreviewCardDesignResponse` (`POST /v1/card-designs/me/preview`). */
export type PreviewCardDesignResponse = {
  sanitizedTemplate: string
  renderedHtml: string
  variables: string[]
}

/** `POST /v1/programs/me` — matches `CreateLoyaltyProgramRequest`. */
export type CreateLoyaltyProgramRequest = {
  name: string
  description?: string | null
  stampsRequired: number
  rewardValue: number
  rewardDescription: string
  defaultEnrollmentStamps: number
  programType: ProgramType
  startsAt?: string | null
  endsAt?: string | null
  cardDesignId?: string | null
}

/**
 * `PATCH /v1/programs/me/{id}` — matches `UpdateLoyaltyProgramRequest`.
 *
 * `status` is the string form of `ProgramStatus` (the API registers a
 * `JsonStringEnumConverter`), so a draft is `{ status: 'Draft' }`.
 */
export type UpdateLoyaltyProgramRequest = {
  name?: string
  description?: string | null
  status?: 'Draft' | 'Active' | 'Paused' | 'Archived'
  stampsRequired?: number
  rewardValue?: number
  rewardDescription?: string
  defaultEnrollmentStamps?: number
  programType?: ProgramType
  startsAt?: string | null
  endsAt?: string | null
  cardDesignId?: string | null
  /** Explicitly revert this program to the platform default design. */
  clearCardDesign?: boolean
}

/** `POST /v1/card-designs/me/preview` — sample-data overrides for a live preview. */
export type PreviewCardDesignRequest = {
  cardDesignId?: string | null
  programName?: string
  rewardName?: string
  businessName?: string
  totalStamps?: number
  completedStamps?: number
}

/** A program's values as the creation form edits them. */
export type LoyaltyProgramDraft = {
  name: string
  description: string
  programType: ProgramType
  /** `YYYY-MM-DD`, or empty for "no date". */
  startDate: string
  endDate: string
  stampsRequired: number
  defaultEnrollmentStamps: number
  rewardDescription: string
  rewardValue: number
  cardDesignId: string | null
}

/** Roster query for the program's enrolled customers. */
export type ProgramCustomerFilters = {
  search?: string
  page?: number
  pageSize?: number
  sortBy?: 'recent' | 'stamps' | 'name'
  sortDirection?: 'asc' | 'desc'
}

export type ProgramCustomers = PaginatedResponse<BusinessCustomer>

/** One row of the program's stamp activity feed. */
export type ProgramActivityItem = {
  id: string
  cardId: string
  programId: string
  programName: string
  customerId: string
  customerName: string
  stampNumber: number
  source: string | null
  awardedByName: string | null
  awardedByRole: string | null
  stampedAt: string
}

export type ProgramActivityPage = {
  items: ProgramActivityItem[]
  total: number
  page: number
  pageSize: number
}
