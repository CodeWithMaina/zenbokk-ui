import { ApiError } from '../api/client'
import type {
  BusinessResponse,
  CallerPlanInfo,
  DashboardBootstrap,
  DashboardBusiness,
  MyModules,
  UserRole,
} from '../api/types'
import { businessApi } from '../business/api'
import { modulesApi } from '../modules/api'
import type { NavSurface } from '../navigation/types'
import { staffApi } from '../staff/api'
import { ownerApi } from './api'

/**
 * The business dashboard bootstrap.
 *
 * One call site resolves, in order: *who* is signed in (the caller's role),
 * *which* business they are acting in (server-side, from their membership — the
 * client never names a business), what that business is entitled to, and what
 * the caller is allowed to do inside it. Everything the shell needs to render —
 * brand, plan, sidebar — comes out of here, so no page has to work out business
 * access for itself.
 *
 * The backend has two surfaces for this, and each is authoritative for its own
 * persona:
 *
 *  - **Owner** → `GET /v1/businesses/me/dashboard/bootstrap`
 *    (business + entitlements + permissions + plan + navigation + settings in
 *    one round trip).
 *  - **Staff** → `GET /v1/businesses/staff/my-business` + `GET /v1/me/modules`
 *    (+ `GET /v1/businesses/{id}` for the storefront-facing fields the staff
 *    payload does not carry). Staff have no single-call bootstrap yet — see the
 *    handoff notes for that backend gap.
 */

export type DashboardBootstrapFailureKind =
  | 'unauthenticated'
  | 'unauthorized'
  | 'no-business'
  | 'api'

/** Bootstrap failed in a way the shell can explain to the user. */
export class DashboardBootstrapError extends Error {
  readonly kind: DashboardBootstrapFailureKind
  readonly reason: unknown

  constructor(kind: DashboardBootstrapFailureKind, message: string, reason?: unknown) {
    super(message)
    this.name = 'DashboardBootstrapError'
    this.kind = kind
    this.reason = reason
  }
}

export type BusinessDashboardBootstrap = {
  /** Console this payload was resolved for. */
  surface: NavSurface
  /** Persona the backend reported for this session. */
  role: UserRole
  /** Business the caller is acting in (identity + storefront fields). */
  business: DashboardBusiness
  /** Effective module keys (plan + purchases + trials + overrides). */
  entitlements: string[]
  /** Permission codes granted to the caller's role. */
  permissions: string[]
  plan: CallerPlanInfo | null
  /** Reminder policy; only the owner bootstrap returns it. */
  settings: DashboardBootstrap['settings'] | null
  /** Endpoints that produced this payload (diagnostics). */
  sources: readonly string[]
}

export type BootstrapInput = {
  surface: NavSurface
  /** Role from the session; only used to pick the surface's read path. */
  role: UserRole
}

function emptySettings(): DashboardBootstrap['settings'] {
  return { reminderPolicyEnabled: false, reminderOffsetMinutes: null, reminderChannels: null }
}

/**
 * Best-effort classification of a bootstrap failure into something the shell
 * can render: a sign-in prompt, a "not your workspace" explanation, a missing
 * business context, or a plain API error.
 */
export function classifyBootstrapFailure(error: unknown): DashboardBootstrapFailureKind {
  if (error instanceof DashboardBootstrapError) return error.kind
  if (error instanceof ApiError) {
    if (error.status === 401) return 'unauthenticated'
    if (error.status === 403 || error.isModuleDisabled) return 'unauthorized'
    if (error.status === 404) return 'no-business'
  }
  return 'api'
}

/** Message shown for a bootstrap failure, in the user's terms. */
export function bootstrapFailureMessage(
  kind: DashboardBootstrapFailureKind,
  error: unknown,
  console: string,
): string {
  switch (kind) {
    case 'unauthenticated':
      return 'Your session ended. Sign in again to open your workspace.'
    case 'unauthorized':
      return `This account is not a member of a business workspace with access to the ${console}. Ask an owner to invite you, or sign in with a different account.`
    case 'no-business':
      return 'No business workspace is linked to this account yet. Create one from the platform site, or sign in with the account that owns the business.'
    default:
      return error instanceof Error && error.message
        ? error.message
        : 'We could not load your workspace. Try again in a moment.'
  }
}

/** Owner bootstrap: the backend already answers everything in one call. */
async function loadOwnerBootstrap(): Promise<BusinessDashboardBootstrap> {
  const data = await ownerApi.bootstrap()
  return {
    surface: 'dashboard',
    role: 'Business',
    business: data.business,
    entitlements: data.entitlements,
    permissions: data.permissions,
    plan: data.plan,
    settings: data.settings ?? emptySettings(),
    sources: ['/v1/businesses/me/dashboard/bootstrap'],
  }
}

/** Business identity as the staff console needs it, from the owner-shaped DTO. */
function toDashboardBusiness(
  source: BusinessResponse | null,
  fallback: { id: string; name: string },
): DashboardBusiness {
  return {
    id: source?.id ?? fallback.id,
    name: source?.name ?? fallback.name,
    // A staff membership carries no storefront address in its own payload; the
    // profile read supplies it when the caller is allowed to see the business.
    slug: source?.slug ?? '',
    category: source?.category ?? null,
    location: source?.location ?? null,
    description: source?.description ?? null,
    logoUrl: source?.logoUrl ?? null,
    phoneNumber: source?.phoneNumber ?? null,
    email: source?.email ?? null,
    // Not exposed on `BusinessResponse`; the owner bootstrap is the only place
    // that reports the loyalty-program flag.
    hasLoyaltyProgram: false,
    hasReferralProgram: source?.hasReferralProgram ?? false,
  }
}

async function loadStaffBootstrap(): Promise<BusinessDashboardBootstrap> {
  let identity
  try {
    identity = await staffApi.myBusiness()
  } catch (error) {
    throw new DashboardBootstrapError(
      classifyBootstrapFailure(error) === 'unauthorized' ? 'unauthorized' : 'no-business',
      'Your staff account is not attached to a business right now.',
      error,
    )
  }

  const modules: MyModules = await modulesApi.mine()

  // The staff identity payload is deliberately thin (id + name). Reading the
  // business profile is a bonus, not a requirement: without it the shell still
  // renders with the name the membership already gave us.
  let profile: BusinessResponse | null = null
  try {
    profile = await businessApi.byId(identity.businessId)
  } catch {
    profile = null
  }

  return {
    surface: 'staff',
    role: 'Staff',
    business: toDashboardBusiness(profile, { id: identity.businessId, name: identity.businessName }),
    entitlements: modules.entitlements,
    permissions: modules.permissions,
    plan: modules.plan,
    settings: null,
    sources: [
      '/v1/businesses/staff/my-business',
      '/v1/me/modules',
      ...(profile ? ['/v1/businesses/{id}'] : []),
    ],
  }
}

/** Resolve the business context for a dashboard surface. */
export async function loadBusinessDashboard(
  input: BootstrapInput,
): Promise<BusinessDashboardBootstrap> {
  return input.surface === 'staff' ? loadStaffBootstrap() : loadOwnerBootstrap()
}
