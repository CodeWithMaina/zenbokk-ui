import { apiGet, apiRequest } from '../api/client'
import type { BusinessCustomer, PaginatedResponse } from '../api/types'
import type {
  AvailableCardDesign,
  CreateLoyaltyProgramRequest,
  LoyaltyProgram,
  PreviewCardDesignRequest,
  PreviewCardDesignResponse,
  ProgramActivityPage,
  ProgramDetail,
  UpdateLoyaltyProgramRequest,
} from './types'

/**
 * Loyalty Programs module client.
 *
 * Every route resolves the business from the caller's token — the client never
 * names its own business id, so tenant isolation stays the backend's job — and
 * each is gated server-side by the module that owns it (`loyalty` for programs
 * and card designs, `customers` for the roster), so callers check entitlements
 * before asking.
 *
 * Card artwork is never composed in the browser: the API returns fully rendered
 * HTML (`cardDesignHtml`, `previewHtml`) produced by the same server pipeline a
 * customer sees, and `LoyaltyCardRenderer` sandboxes it.
 */

const PROGRAMS_PATH = '/v1/programs'
const CARD_DESIGNS_PATH = '/v1/card-designs'
const CUSTOMERS_PATH = '/v1/businesses/me/customers'
const LOYALTY_STAMPS_PATH = '/v1/loyalty/stamps'

export const loyaltyApi = {
  /** Programs owned by the authenticated business. */
  listPrograms(): Promise<LoyaltyProgram[]> {
    return apiGet<LoyaltyProgram[]>(`${PROGRAMS_PATH}/me`)
  },

  /** One program (no metrics). */
  getProgram(programId: string): Promise<LoyaltyProgram> {
    return apiGet<LoyaltyProgram>(`${PROGRAMS_PATH}/me/${programId}`)
  },

  /** Program + live performance metrics. */
  getProgramDetail(programId: string): Promise<ProgramDetail> {
    return apiGet<ProgramDetail>(`${PROGRAMS_PATH}/me/${programId}/details`)
  },

  createProgram(payload: CreateLoyaltyProgramRequest): Promise<LoyaltyProgram> {
    return apiRequest<LoyaltyProgram>(`${PROGRAMS_PATH}/me`, {
      method: 'POST',
      body: payload,
    })
  },

  /** PATCH — a partial update, so an untouched field is never overwritten. */
  updateProgram(programId: string, payload: UpdateLoyaltyProgramRequest): Promise<LoyaltyProgram> {
    return apiRequest<LoyaltyProgram>(`${PROGRAMS_PATH}/me/${programId}`, {
      method: 'PATCH',
      body: payload,
    })
  },

  remove(programId: string): Promise<boolean> {
    return apiRequest<boolean>(`${PROGRAMS_PATH}/me/${programId}`, { method: 'DELETE' })
  },

  /** Dedicated transition routes, so each move is validated rather than inferred. */
  activateProgram(programId: string): Promise<LoyaltyProgram> {
    return apiRequest<LoyaltyProgram>(`${PROGRAMS_PATH}/me/${programId}/activate`, {
      method: 'POST',
    })
  },

  pauseProgram(programId: string): Promise<LoyaltyProgram> {
    return apiRequest<LoyaltyProgram>(`${PROGRAMS_PATH}/me/${programId}/pause`, {
      method: 'POST',
    })
  },

  archiveProgram(programId: string): Promise<LoyaltyProgram> {
    return apiRequest<LoyaltyProgram>(`${PROGRAMS_PATH}/me/${programId}/archive`, {
      method: 'POST',
    })
  },

  duplicateProgram(programId: string, newName?: string): Promise<LoyaltyProgram> {
    return apiRequest<LoyaltyProgram>(`${PROGRAMS_PATH}/me/${programId}/duplicate`, {
      method: 'POST',
      body: { newName: newName ?? null },
    })
  },

  /** Designs this business may choose from (platform default + its own). */
  listCardDesigns(): Promise<AvailableCardDesign[]> {
    return apiGet<AvailableCardDesign[]>(`${CARD_DESIGNS_PATH}/me`)
  },

  /**
   * Renders a card through the production pipeline with sample values — used for
   * the creation drawer's live preview so the card reflects the entered name,
   * reward and stamp goal before anything is saved.
   */
  previewCardDesign(payload: PreviewCardDesignRequest): Promise<PreviewCardDesignResponse> {
    return apiRequest<PreviewCardDesignResponse>(`${CARD_DESIGNS_PATH}/me/preview`, {
      method: 'POST',
      body: payload,
    })
  },

  /** Enrolled customers of one program (server-side search, sort and paging). */
  listProgramCustomers(
    programId: string,
    filters: {
      search?: string
      page?: number
      pageSize?: number
      sortBy?: string
      sortDirection?: 'asc' | 'desc'
    },
  ): Promise<PaginatedResponse<BusinessCustomer>> {
    return apiGet<PaginatedResponse<BusinessCustomer>>(CUSTOMERS_PATH, {
      programId,
      search: filters.search,
      page: filters.page,
      pageSize: filters.pageSize,
      sortBy: filters.sortBy,
      sortDirection: filters.sortDirection,
    })
  },

  /** The program's stamp activity/audit log, newest first. */
  programActivity(
    programId: string,
    page = 1,
    pageSize = 10,
  ): Promise<ProgramActivityPage> {
    return apiGet<ProgramActivityPage>(`${LOYALTY_STAMPS_PATH}/activity`, {
      programId,
      page,
      pageSize,
    })
  },
}
