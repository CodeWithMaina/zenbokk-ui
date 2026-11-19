import { apiGet, apiRequest } from '../api/client'
import type {
  CreateServiceRequest,
  PaginatedResponse,
  ServiceCatalogItem,
  ServiceImage,
  SetServiceImagesRequest,
  UpdateServiceRequest,
} from '../api/types'
import { toServiceQuery } from './service.utils'
import type { ServiceFilters, ServiceQuery, ServiceStatusAction } from './types'

/**
 * Services (service catalog) module client.
 *
 * Every route resolves the business from the caller's token — the client never
 * names its own business id — and each one is gated server-side by the
 * `serviceCatalog` module, so callers check entitlements before asking.
 */

const SERVICES_PATH = '/v1/services'

/** Server aggregates for the header, the tabs and the price-range slider. */
export type ServiceCounts = {
  active: number
  paused: number
  archived: number
  total: number
  /** Real price bounds of this business's catalogue; null when it has no services. */
  minPrice: number | null
  maxPrice: number | null
}

const STATUS_ROUTES: Record<ServiceStatusAction, string> = {
  pause: 'pause',
  resume: 'resume',
  archive: 'archive',
  restore: 'restore',
}

export const servicesApi = {
  /**
   * DB-first filtered, sorted and paginated list. Search, status, price,
   * duration and storefront visibility are all applied server-side, so the
   * browser never downloads a catalogue it then filters locally.
   */
  list(filters: ServiceFilters, page: number, pageSize: number): Promise<PaginatedResponse<ServiceCatalogItem>> {
    return apiGet<PaginatedResponse<ServiceCatalogItem>>(`${SERVICES_PATH}/me/query`, toServiceQuery(filters, page, pageSize))
  },

  /** One-off count for a filter set, used by the header and the chips. */
  async count(filters: ServiceFilters): Promise<number> {
    const page = await servicesApi.list(filters, 1, 1)
    return page.totalCount
  },

  /**
   * Counts per lifecycle state, the total, and the catalogue's real price bounds —
   * one grouped read (`GET /v1/services/me/facets`).
   *
   * This used to be four one-row list requests; the tabs, the header summary and the
   * range slider all need these numbers at once, so they come from one endpoint that
   * the database computes. The bounds are the business's own prices, never a
   * hardcoded ceiling.
   */
  facets(): Promise<ServiceCounts> {
    return apiGet<ServiceCounts>(`${SERVICES_PATH}/me/facets`)
  },

  /**
   * Counts per lifecycle state plus the total.
   *
   * Kept as the module's name for the aggregates; it now reads the facets endpoint,
   * so the header, the tabs and the filter panel can never disagree with the list.
   */
  statusCounts(): Promise<ServiceCounts> {
    return servicesApi.facets()
  },

  get(serviceId: string): Promise<ServiceCatalogItem> {
    return apiGet<ServiceCatalogItem>(`${SERVICES_PATH}/me/${serviceId}`)
  },

  create(payload: CreateServiceRequest): Promise<ServiceCatalogItem> {
    return apiRequest<ServiceCatalogItem>(`${SERVICES_PATH}/me`, {
      method: 'POST',
      body: payload,
    })
  },

  /** PATCH — a partial update, so an untouched field is never overwritten. */
  update(serviceId: string, payload: UpdateServiceRequest): Promise<ServiceCatalogItem> {
    return apiRequest<ServiceCatalogItem>(`${SERVICES_PATH}/me/${serviceId}`, {
      method: 'PATCH',
      body: payload,
    })
  },

  /** Dedicated transition route, so the move is validated rather than inferred. */
  setStatus(serviceId: string, action: ServiceStatusAction): Promise<ServiceCatalogItem> {
    return apiRequest<ServiceCatalogItem>(`${SERVICES_PATH}/me/${serviceId}/${STATUS_ROUTES[action]}`, {
      method: 'POST',
    })
  },

  remove(serviceId: string): Promise<boolean> {
    return apiRequest<boolean>(`${SERVICES_PATH}/me/${serviceId}`, { method: 'DELETE' })
  },

  /** The service's images in gallery order; index 0 is the cover. */
  images(serviceId: string): Promise<ServiceImage[]> {
    return apiGet<ServiceImage[]>(`${SERVICES_PATH}/me/${serviceId}/images`)
  },

  /**
   * Replaces the ordered image set. The array order is the display order, so
   * this single call covers adding, removing, replacing, reordering and
   * re-picking the cover, and the three-image ceiling is enforced server-side.
   */
  setImages(serviceId: string, mediaIds: string[]): Promise<ServiceImage[]> {
    const body: SetServiceImagesRequest = { mediaIds }
    return apiRequest<ServiceImage[]>(`${SERVICES_PATH}/me/${serviceId}/images`, {
      method: 'PUT',
      body,
    })
  },
}

/** Exported for callers that need the exact query the endpoint will receive. */
export type { ServiceQuery }
