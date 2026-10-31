import { apiGet } from '../api/client'
import type { MyModules } from '../api/types'

/**
 * Module entitlements for the *caller*, resolved from the JWT + the active
 * business server-side.
 *
 * `GET /v1/me/modules` is deliberately the only read this client performs: it
 * is the one endpoint that answers for every persona (Business, Staff,
 * Customer, Admin) without the client naming a business, which is exactly what
 * the dashboard shell needs to build its navigation.
 *
 * The owner-only variant `GET /v1/businesses/me/modules` (full per-module
 * entitlement detail, including sources) is intentionally not wrapped here
 * until a screen needs it — inventing an unused client would only drift.
 */
export const modulesApi = {
  /** Effective modules + permissions + plan for the signed-in caller. */
  mine(): Promise<MyModules> {
    return apiGet<MyModules>('/v1/me/modules')
  },
}
