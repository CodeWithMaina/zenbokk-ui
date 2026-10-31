# Business dashboard shell — architecture note

Scope of this session: the **foundation** only. API integration, dashboard
bootstrap, business-context resolution, module/permission resolution, dynamic
sidebar, layouts, routing, module placeholders, and the storefront
authenticated-user menu. No business module was implemented.

## Layers

| Concern | Location | Notes |
| --- | --- | --- |
| API configuration | `src/lib/api/config.ts` | Base URL, tenant header, refresh path, credentials, default headers, no-retry statuses. Only `client.ts` reads it. |
| HTTP client | `src/lib/api/client.ts` | Envelope unwrapping, bearer + tenant header, single-flight refresh, `ApiError`. |
| Wire types | `src/lib/api/types.ts` | Mirrors the backend `[JsonPropertyName]` values — no transformation layer. |
| Domain API clients | `src/lib/auth`, `lib/business`, `lib/modules`, `lib/dashboard`, `lib/staff`, `lib/storefront`, `lib/admin`, `lib/invitations` | One client per backend area; components never call `fetch`. |
| Module entitlements | `src/lib/modules` | `modulesApi.mine()` → `GET /v1/me/modules`. |
| Navigation config | `src/lib/navigation/config.ts` | Every menu item for every console: surface, section, module gate, permission gate, persona, nested children. |
| Navigation resolver | `src/lib/navigation/resolve.ts` | Applies the gates to a backend payload and returns renderable sections. |
| Dashboard bootstrap | `src/lib/dashboard/bootstrap.ts`, `use-dashboard-bootstrap.ts` | Role-aware business context + entitlements + permissions + plan. |
| Dashboard context | `src/lib/dashboard/dashboard-context.ts`, `DashboardProvider.tsx` | Publishes business, entitlements, permissions, plan and the resolved sidebar. |
| Layouts | `src/routes/dashboard.tsx`, `routes/staff.tsx`, `routes/admin.tsx` | Guard → bootstrap → provider → shell. |
| Placeholders | `src/routes/dashboard.*.tsx` + `src/components/shell/ModulePlaceholder.tsx` | One route per module, no module functionality. |

## Endpoints integrated

| Endpoint | Used for | Auth |
| --- | --- | --- |
| `GET /v1/businesses/me/dashboard/bootstrap` | Owner console bootstrap (business, entitlements, permissions, plan, settings) | `BusinessOwner` |
| `GET /v1/me/modules` | Role-agnostic entitlements + permissions + plan | any authenticated |
| `GET /v1/businesses/staff/my-business` | Staff console business identity | `BusinessStaff` |
| `GET /v1/businesses/{businessId}` | Storefront fields for the staff console; customer business switch | any authenticated |
| `GET /v1/businesses/me/associated` | Customer "switch business" list | `Customer` |
| `GET /v1/users/profile`, `/v1/auth/*` | Session (pre-existing) | mixed |

## How bootstrap works

`useBusinessDashboard(surface)` → `loadBusinessDashboard()`:

- **Owner** → one call to `…/me/dashboard/bootstrap`.
- **Staff** → `…/staff/my-business` + `/v1/me/modules`, then a best-effort
  `…/{businessId}` profile read for the storefront fields.

The result is normalised into `BusinessDashboardBootstrap` (business,
entitlements, permissions, plan, settings, sources) and published by
`DashboardProvider`, which resolves the sidebar once. States handled centrally:
loading, unauthenticated, unauthorized (403 / `MODULE_DISABLED`), missing
business context (404), and API error — see `ConsoleStates.tsx`.

## How module access drives the sidebar

`resolveNavigation(NAV_BY_SURFACE[surface], { surface, role, entitlements,
permissions })` keeps an entry only when the surface matches, the persona is
allowed, the business is entitled to the entry's module, **and** the caller's
role holds the entry's permission. Groups (entries with children) survive only
through a visible child, and a child is only reachable through its parent's
gates. `canSee(key)` in the dashboard context tells a page whether its own entry
survived, which is what the placeholder pages use to explain a direct visit.

## Backend gaps / contracts that shaped this

1. **No staff dashboard bootstrap.** Staff need three reads instead of one; a
   `…/staff/dashboard/bootstrap` mirroring the owner payload would remove the
   profile round trip and the `hasLoyaltyProgram: false` fallback.
2. **`StaffBusinessResponse` is thin** (`businessId`, `businessName`) — no slug,
   logo or category, so the staff console borrows `BusinessResponse`.
3. **No owner multi-business endpoint.** `GET /v1/businesses/me/associated` is
   `Customer`-only and `POST /v1/businesses` refuses a second business, so
   "Switch business" is offered to customers only.
4. **`CustomerAssociatedBusinessResponse` has no slug**, so switching requires a
   follow-up `GET /v1/businesses/{id}` before the storefront can be opened.
5. **`GET /v1/businesses/me/modules`** (full per-module entitlement detail) is
   not wrapped yet — nothing needs it while the sidebar only reads effective
   keys.

## Known follow-ups

- The module screens behind the new placeholder routes (Loyalty, Programs,
  Rewards, Stamping, Card design, Referrals, Reviews, Gallery, Analytics,
  Attendance, Payments, Notifications).
- The staff console has no staff-scoped routes for customers/reviews yet; when
  they exist, add them to `STAFF_NAV` and the resolver handles the rest.
