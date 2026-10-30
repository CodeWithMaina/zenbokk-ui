# Punched · Phase 1 Architecture Assessment

Scope: `punched-api` (ASP.NET Core, `/v1/*`) + `zenbokk` (Vite + React 19 + TS).
Goal: subscription-aware multi-tenant storefront, auth flow, owner/staff/admin
shells, and public booking — without inventing a second backend contract.

---

## 1. What already exists and is reusable

### Backend surfaces we build on

| Concern | Endpoint | Auth | Notes |
| --- | --- | --- | --- |
| Storefront bootstrap (one call) | `GET /v1/businesses/by-slug/{slug}/bootstrap` | anon | Returns `business` (public profile + `capabilities`), `landingPage`, `moved` (superseded slug). Output-cached 30 s. |
| Slug → tenant | `GET /v1/businesses/by-slug/{slug}` | anon | `TenantResolutionResponse` (`businessId`, `slug`, `moved`). |
| Public landing config | `GET /v1/businesses/public/{businessId}/landing-page` | anon | `[RequireModule("storefront")]`. |
| Public services | `GET /v1/services/{businessId}` | anon | `[RequireModule("serviceCatalog")]`. |
| Public eligible staff | `GET /v1/services/{businessId}/staff?serviceIds=` | anon | `EligibleStaffResponse[]`, no internal metrics. |
| Public availability (grid) | `GET /v1/businesses/{businessId}/availability/calendar?serviceIds=&staffId=&startDate=&endDate=` | anon | Per-day rollups, slot statuses (`available/booked/off_duty/past`), staff suggestions. |
| Public availability (flat) | `GET /v1/businesses/{businessId}/availability` | anon | `AvailabilitySlotResponse[]`. |
| Customer booking | `POST /v1/appointments` | `Customer` role | `customerId` forced from the JWT server-side. |
| Customer appointments | `GET /v1/appointments`, `GET /v1/appointments/{id}` | `Customer` | |
| Owner dashboard bootstrap | `GET /v1/businesses/me/dashboard/bootstrap` | `BusinessOwner` | `business`, `entitlements` (module keys), `permissions`, `plan`, `navigation`, `settings`. |
| Owner appointment console | `GET /v1/businesses/me/appointments` | `BusinessOwner` | `AppointmentDashboardResponse`: page of appointments **plus** customer/staff/service reference buckets — one call replaces four. |
| Staff appointment console | `GET /v1/businesses/staff/appointments` | `BusinessStaff` | |
| Owner staff | `GET /v1/businesses/me/staff` | `BusinessOwner` | |
| Owner customers | `GET /v1/businesses/me/customers` | `BusinessOwner` | |
| Admin | `GET /v1/admin/dashboard`, `/users`, `/businesses`, `/analytics/*` | `PlatformAdmin` | |
| Auth | `POST /v1/auth/{register,verify-email,login,refresh-token,logout,request-email,forgot-password,reset-password,change-password}` | mixed | Refresh token also set as a shared HttpOnly cookie for cross-subdomain hydration. |
| Profile | `GET/PATCH /v1/users/profile` | any authenticated | |

**Envelope (every response):** `{ success: boolean, data: T | null, error: { code, message } | null }`.

### Tenancy

- Tenant is resolved **server-side** from `X-Punched-Tenant` (page host), falling back to the API host → `ITenantContext`. It only *narrows*; authorization still comes from identity + `business_memberships` via `MembershipPolicies`.
- `TenantConsistencyMiddleware` rejects page/tenant mismatches.
- Client contract: **send `X-Punched-Tenant: <slug>` on every request made from a tenant surface** (and `businessSlug` in `login` / `register` / `refresh-token` so the JWT carries `biz`/`bizRole`).
- Superseded slugs still resolve (`moved: true`), so the client must redirect to the canonical slug rather than 404.

### Entitlements (three axes, one source)

1. `ModuleEntitlementService.GetEffectiveModuleKeysAsync` — plan grants, purchases, trials, admin overrides, promos.
2. `CustomerCapabilityCatalog` — module keys → customer capabilities (`services`, `appointments`, `loyalty`, `rewards`, `reviews`, `gallery`, `galleryReviews`, `referrals`, `payments`, `notifications`), dependency closure applied.
3. `[RequireModule("…")]` — server-side gate on the endpoint itself.

The storefront receives `business.capabilities` (always every key, `false` when absent), so **the UI must render from the capability map, not from hardcoded feature flags**, and must still tolerate `403 MODULE_NOT_ENABLED` from any module-gated call.

### Frontend foundations already in the repo

- Token system in `src/index.css` (light/dark, semantic colours, control heights, `[data-status]` mapping) + `src/theme/*`.
- `src/components/ui` — 60+ primitives already used by design work: `Button`, `Card`, `SectionCard`, `Field`/`Input`, `StatusPill`/`Badge`, `Avatar`, `Tabs`, `SegmentedControl`, `EmptyState`, `Skeleton`, `PageHeader`/`EntityHeader`, `MetricTile`, `StatTile`, `ServiceCard`, `AppointmentCard`, `Drawer`, `BookingSheet`, `BookingConfirmation`.
- `cn`, `money`, `formatDuration`, `getInitials`.
- Installed but not yet wired: `@tanstack/react-router`, `@tanstack/react-query`, `zod`, `react-hook-form`, `sonner`, `recharts`, `lucide-react`.

### Design mapping

- **Nuru Studio (storefront)**: sage/forest palette → existing `--accent` / `--accent-soft` / `--bg` / `--surface` tokens; serif display headings → new `--font-display` token + `.display` recipe (no hardcoded colours).
- **Auth Flow**: warm neutral surfaces → `--bg` / `--surface` / `--line`; serif headings share `--font-display`; large radius panels map to `--radius-panel`.
- Neither design introduces a colour the token system cannot express, so both themes (light/dark) keep working.


---

## 2. Gaps (and how this build handles them)

| Gap | Impact | Resolution in this build |
| --- | --- | --- |
| **No anonymous booking endpoint.** `POST /v1/appointments` is `[Authorize(Roles="Customer")]` and forces `customerId` from the JWT. | "Unauthenticated booking" cannot create an appointment without an identity. | The whole wizard is anonymous (browse → service → staff → date → time → review); only the final **Confirm** requires an account. The draft is persisted (`sessionStorage`) and resumed after sign-in/sign-up, so the visitor never re-picks. Adding true guest booking is a backend change (guest customer creation + OTP + payment intent) and is deliberately **not** improvised here. |
| No public "business directory" endpoint. | The platform root page cannot list real businesses. | The root page is a product entry page + tenant-address lookup, not a directory. |
| `capabilities` may be `false` for a module whose endpoint is still reachable. | 403s mid-flow. | Every module-gated query is wrapped in an entitlement check *and* surfaces the API error code. |
| Owner "today" metrics are not a dedicated endpoint. | The overview needs derived numbers. | Derived client-side from `me/appointments` + `me/staff` + `me/customers`; no fabricated fields. |
| No cross-tab token refresh. | A second tab can hold a stale access token. | Single-flight refresh in `apiFetch` + a `storage` listener that drops the in-memory token so the next call re-hydrates from the shared HttpOnly cookie. |
| Cross-subdomain cookies need `credentials: 'include'` + a CORS allow-list. | Storefront auth will not hydrate on `*.localhost`. | All requests are same-origin through the Vite `/api` proxy in dev; production already handles business origins via `CorsOriginPolicy`. |

---

## 3. Conventions this build follows

- Routes are **file-based** (`src/routes`), generated by `@tanstack/router-plugin`.
- All server state goes through React Query; no `useEffect` fetching.
- API access only via `src/lib/api/client.ts` (envelope unwrapping, bearer + tenant header, single-flight refresh).
- Session shape is owned by `src/lib/auth` (`useAuth()`), never read from `localStorage` in components.
- Tenant context is owned by `src/lib/tenant` (`useStorefront()`, `useTenantSlug()`).
- Entitlements are read through `src/lib/entitlements.ts` helpers (`hasCapability`, `hasModule`, `can`).
- UI is composed from `src/components/ui` + tokens only; no new colour literals.

---

## 4. Phase plan status

| Phase | Content | Status |
| --- | --- | --- |
| 1 | Repository assessment (this document) | done |
| 2 | Foundations: router, query client, typed API client, auth session, tenant context, entitlements, route guards, layout shells | this change |
| 3 | Owner + staff + admin dashboards | owner overview/appointments/services/staff/settings, staff console, admin console |
| 4 | Public storefront + 5-step booking | this change (confirm gated behind sign-in, see gap 1) |
| 5 | Auth Flow pages | sign in / sign up / verify / forgot / reset, mapped to tokens |
