# Storefront Completion — Increment 1

> Status: implemented and verified. This document records exactly what changed,
> the evidence that it works, and what deliberately remains — with the reason and
> the required next action. It is not a claim of full completion of the ten-phase
> programme.

Repositories touched: `PunchedApi/` (backend, its own git repo) and
`zenbokk-ui/` (frontend, its own git repo). Both on branch `main`.
`punched-pwd/` was not modified.

---

## 1. What was implemented

### 1.1 Business gallery (public) — Phase 4

Previously impossible: the bootstrap exposed `business.galleryMediaIds` with no
URLs and there was no bulk public media endpoint, so a gallery would have cost
one request per image. (The code said so; see the old comment in
`src/lib/storefront/sections.ts`.)

**Backend**

| File | Change |
| --- | --- |
| `Application/DTOs/StorefrontGalleryDTOs.cs` | new — `PublicGalleryResponse`, `PublicGalleryImageResponse` |
| `Domain/Interfaces/IStorefrontGalleryService.cs` | new |
| `Application/Services/StorefrontGalleryService.cs` | new |
| `API/Controllers/StorefrontController.cs` | new — `GET /v1/businesses/{businessId}/gallery` |
| `Program.cs` | DI registration |
| `PunchedApi.Tests/AuthorizationPostureTests.cs` | allow-list entry |

Public definition (enforced in the service, not the client): a media row is
visible only when the owner attached it to the business gallery
(`business_media`), the row belongs to the same business, its purpose is
`business-gallery`, and it has finished processing (`MediaStatus.Ready`).
Variants are filtered to `webp`/`jpeg` with a URL and a width. The object-store
source key, provider and credentials are never returned.

The `gallery` module entitlement is checked against the business the request
named (an anonymous caller has no token for `[RequireModule]`), returning
`MODULE_DISABLED` → 403 so the storefront can tell "no gallery" from "no such
business".

**Frontend**

| File | Change |
| --- | --- |
| `src/lib/api/types.ts` | `PublicGallery`, `PublicGalleryImage` |
| `src/lib/storefront/api.ts` | `storefrontApi.gallery()` |
| `src/lib/api/query-client.ts` | `queryKeys.storefrontGallery()` |
| `src/lib/storefront/use-storefront-public.ts` | new — `useStorefrontGallery()` |
| `src/components/storefront/StorefrontGallery.tsx` | new — grid + accessible lightbox |
| `src/components/storefront/pages/GalleryPage.tsx` | new |
| `src/routes/$slug.gallery.tsx`, `src/routes/gallery.tsx` | new routes |
| `src/lib/storefront/sections.ts` | `gallery` is now renderable; `sectionPath('gallery') → '/gallery'` |

The lightbox is keyboard-complete (Escape closes, arrow keys navigate, focus
moves in on open and returns on close, background scroll locked), and the grid
has loading, empty and error states.

### 1.2 Structured opening hours (public) — Phase 3

**Backend**

| File | Change |
| --- | --- |
| `Application/DTOs/StorefrontHoursDTOs.cs` | new |
| `Domain/Interfaces/IStorefrontHoursService.cs` | new |
| `Application/Services/StorefrontHoursService.cs` | new |
| `API/Controllers/StorefrontController.cs` | `GET /v1/businesses/{businessId}/opening-hours` |

Derived from the **existing** scheduling domain — no second scheduler, no new
table:

- weekly hours = the union of the business's active staff working patterns
  (`staff_availability`), merged into periods per weekday;
- when the business has recorded no roster at all, the hours fall back to the
  business's own booking window (`BookingOpenHour`–`BookingCloseHour`), which is
  the availability engine's own fallback — so the page cannot advertise hours the
  engine would refuse;
- a break is reported only when **every** shift contributing to a period declares
  the same break (otherwise the business is genuinely covered through the
  interval);
- a weekday nobody works is `isClosed`;
- dated exceptions come from the dated `staff_shifts` rows within a 90-day
  horizon: a date the whole team has taken off is a closure; a date with one-off
  working hours is a special opening. One member's day off never closes the
  business.

Times are business-local wall-clock (`HH:mm`) because the stored minutes are
already minutes-from-local-midnight; `timeZoneId` is reported alongside.

**Frontend**

| File | Change |
| --- | --- |
| `src/lib/api/types.ts` | `PublicOpeningHours` and friends |
| `src/lib/storefront/api.ts` | `storefrontApi.openingHours()` |
| `src/lib/api/query-client.ts` | `queryKeys.storefrontHours()` |
| `src/lib/storefront/use-storefront-public.ts` | `useStorefrontOpeningHours()` |
| `src/components/storefront/StorefrontOpeningHours.tsx` | new |
| `src/components/shell/StorefrontChrome.tsx` | footer column |
| `src/components/storefront/pages/ContactPage.tsx` | contact section |

The contact page states the distinction explicitly: these are the business's
opening hours, and the exact bookable times appear when a service is chosen. No
hours are hardcoded anywhere.

### 1.3 Server-side search — Phase 5

**Backend**

| File | Change |
| --- | --- |
| `Application/DTOs/StorefrontSearchDTOs.cs` | new |
| `Domain/Interfaces/IStorefrontSearchService.cs` | new |
| `Application/Services/StorefrontSearchService.cs` | new |
| `API/Controllers/StorefrontController.cs` | `GET /v1/businesses/{businessId}/search` |

- services are filtered **in the database** to the published set (`IsActive`,
  `Showcase`, `!IsArchived`) and matched on name, description or category
  (case-insensitive `lower(...) LIKE`, portable across PostgreSQL and SQLite —
  no provider-specific `ILIKE`);
- staff come from the business's own active **and public** roster, matched on
  name, biography, current job title and the services they perform; the roster
  read is bounded (200) and never leaves the business;
- only publicly visible services are attributed to staff, matching the roster
  endpoint exactly;
- `type` narrows to `services` | `team`; results are paged (`page`, `pageSize`,
  clamped to 24) with `totalCount`/`totalPages`;
- the `serviceCatalog` and `staff` module entitlements gate each entity type;
- tenant narrowing (`X-Punched-Tenant`) is applied first.

**Frontend**

| File | Change |
| --- | --- |
| `src/lib/api/types.ts` | `StorefrontSearchResponse`, `StorefrontSearchResult` |
| `src/lib/storefront/api.ts` | `storefrontApi.search()` |
| `src/lib/api/query-client.ts` | `queryKeys.storefrontSearch()` |
| `src/lib/storefront/use-storefront-public.ts` | `useStorefrontSearch()` (`keepPreviousData`) |
| `src/components/storefront/StorefrontSearchPage.tsx` | rewritten against the endpoint |

The page debounces typing (300 ms), shows loading/empty/error states, pages with
Previous/Next, caches per `(business, query, scope, page)`, and renders category
chips from the server's own facet list. It no longer downloads the whole
catalogue and roster to filter them in the browser.

### 1.4 SEO, sharing and structured data — Phase 8

`zenbokk-ui` is a Vite + React SPA with no server rendering, so there is no
per-request `<head>`. `src/lib/storefront/use-storefront-seo.ts` writes
tenant-specific metadata once the tenant has resolved (the earliest moment the
data is trustworthy), and emits **nothing** before that — so an unresolved or
suspended address is never indexed as a business.

Emitted: `document.title`, `meta[name=description]`,
`meta[name=robots][content=index,follow]`, `link[rel=canonical]` (the canonical
tenant host, with the path-based fallback's slug segment stripped), Open Graph
(`og:type/site_name/title/description/url/image`), Twitter card, and a
`LocalBusiness` JSON-LD block. Only backend-returned values are used — no
fabricated ratings, reviews, prices or hours; `openingHoursSpecification` appears
only once the hours endpoint has answered.


---

## 2. Verification actually run

Backend (`PunchedApi/`):

```
dotnet build                                 → Build succeeded. 0 Warning(s), 0 Error(s)
dotnet test PunchedApi.Tests/PunchedApi.Tests.csproj
                                             → Passed! Failed: 0, Passed: 1280, Skipped: 18, Total: 1298
```

The 18 skips are the pre-existing Docker/PostgreSQL-gated fixtures
(`RequiresDockerFact`); Docker is not available in this environment.

New tests: `PunchedApi.Tests/StorefrontPublicReadTests.cs` (9 tests, all passing)
covering gallery visibility and ordering, gallery module gating and unknown
business, opening-hours fallback to the booking window, roster union with a
shared break and closed days, whole-team closure, service search excluding
inactive/unadvertised/archived/other-business rows, staff search by name,
biography and job title excluding non-public staff, blank-query category facets,
type narrowing, and module gating.

Frontend (`zenbokk-ui/`):

```
npx tsc -b        → clean
npm run build     → tsc -b + vite build, "✓ built in 15.78s"
npm run lint      → clean (oxlint, no findings)
```

---

## 3. Outstanding — and why

### 3.1 Phase 1 — Guest booking (NOT implemented)

This is the largest remaining item and it is a **security-critical** backend
change, not a UI change: it needs an anonymous booking workflow, OTP issuance and
verification bound to a purpose, customer creation/resolution without duplicating
an identity, idempotency, availability re-validation immediately before insert,
a short-lived lookup token, and rate limits on the new endpoints.

It was deliberately not improvised in this increment. The current behaviour is
unchanged and honest: the five-step wizard is fully anonymous, the draft is
persisted in `sessionStorage`, and only **Confirm** asks for an account.

Required next action: implement `IStorefrontGuestBookingService` with an OTP
record (a dedicated table, since `user_auths` is 1:1 with a real identity),
reusing the existing notification pipeline for delivery and the existing
`IIdempotencyService` for replay protection, then wire the wizard's final step.

### 3.2 Phase 2 — Staff profile enrichment (PARTIAL, pre-existing)

`BusinessMembership` already carries `Bio`, `IsPublic`, `IsBookable` and
`PositionId`, and the roster endpoint already projects `positionName`,
`serviceIds` and `avatarUrl`. What does **not** exist: specialities and years of
experience. Adding them is additive columns + a migration + owner form fields.
Not done here to keep this increment's database changes at zero.

### 3.3 Phase 6 — Enquiry email delivery (config-gated, pre-existing)

`storefront.enquiry` is delivered as an **in-app** notification to the business
owner, scoped to the business (`StorefrontEnquiryService`). Email delivery to the
owner is not enabled: the pipeline's email channel is reported as unavailable in
this deployment, and enabling it is an operational decision (SMTP sender
identity), not a code change. No credentials were invented.

### 3.4 Gallery captions

`business_media` has `role`, `sort_order` and `is_featured` but **no caption
column**, and the owner gallery UI has no caption field. Supporting captions
therefore needs a nullable column + migration + owner form field. Not done here;
the public DTO has no caption field rather than a permanently-null one.

### 3.5 Sitemap

No sitemap endpoint was added. A meaningful sitemap needs a list of published
storefronts, and the platform intentionally has no public business-directory
endpoint. Required decision: either add a public, rate-limited `/sitemap.xml`
that enumerates active businesses (a product/privacy decision), or generate it at
deploy time from the database.

### 3.6 Frontend tests

`zenbokk-ui` has **no test runner** (no `test` script, no Vitest/Jest/Playwright
in its `devDependencies`; Playwright exists only in the legacy `punched-pwd`
app). Frontend tests could not be added without introducing a new dependency,
which is out of scope for this increment. Required next action: choose a runner
(Vitest + Testing Library for unit tests, or Playwright for the storefront flows)
and add it deliberately.

### 3.7 Not attempted in this increment

Phase 7 (storefront content/configuration completeness), Phase 9 (full
accessibility/responsiveness audit) and Phase 10 (full performance/security
review) are review-and-verify phases over the whole storefront. They were not
performed as a standalone audit here; the changes above were written to respect
the existing tokens, entitlement gates, tenant narrowing and rate-limit
infrastructure.

### 3.8 Database changes

**None.** This increment added no table, column or migration. Every new read is
derived from existing tables (`business_media`, `media`, `staff_availability`,
`staff_shifts`, `business_memberships`, `users`, `service_catalog_items`,
`service_categories`, `staff_service_assignments`, `staff_position_history`), so
there is nothing to migrate and nothing to roll back.

---
---

# Storefront Completion — Increment 2

> Status: implemented and verified. Continues the record above; it does not
> replace it. Same repositories, same branch (`main`), nothing committed.

## 4. What this increment implemented

### 4.1 Guest booking — Phase 1 (the account-free flow)

The design decision that made this tractable **and** safe: a guest is not a
special kind of customer. The visitor proves control of an inbox with a one-time
code, the platform resolves or creates the *ordinary* customer record behind that
identity, and hands back an **ordinary short-lived customer access token** scoped
to the business. The booking is then made through the existing
`POST /v1/appointments`, so availability, staff eligibility, working hours,
booking windows, payment rules and module entitlements are enforced exactly as
they are for a signed-in customer. Nothing is bypassed, and no parallel booking
path was introduced.

**No new table and no migration.** The identity lives in `users` + `user_auths`,
the code lives in the same `verification_code` columns the account-verification
flow uses, and the customer's relationship to the business is the canonical
`business_memberships` row.

| File | Change |
| --- | --- |
| `Application/Services/OneTimeCode.cs` | new — six-digit codes from a cryptographic RNG, stored as a SHA-256 hash, compared in constant time |
| `Application/DTOs/GuestBookingDTOs.cs` | new |
| `Domain/Interfaces/IGuestBookingService.cs` | new |
| `Application/Services/GuestBookingService.cs` | new |
| `API/Controllers/GuestBookingController.cs` | new — `POST …/guest-booking/{start,verify}` |
| `Program.cs` | DI + `guest-booking-start` / `guest-booking-verify` rate-limit policies |
| `PunchedApi.Tests/AuthorizationPostureTests.cs` | the two new anonymous endpoints added to the allow-list |
| `PunchedApi.Tests/GuestBookingTests.cs` | new — 9 tests |

Security properties, each asserted by a test:

- a token exists **only** after a code that was emailed to the address on the
  record has been presented and accepted;
- codes expire (10 min), are attempt-limited (5), are stored hashed, and are
  compared with `CryptographicOperations.FixedTimeEquals`;
- a resend is bounded by a 60-second cooldown, reported as `RESEND_TOO_SOON` →
  429 rather than as a failure;
- verification is **single-use** — the code is cleared in the same save that
  marks the identity verified, so replaying it cannot mint a second session;
- an address or number that already belongs to a **verified** account is refused
  (`ACCOUNT_EXISTS` → 409) rather than verified, so this can never become an
  account-takeover path;
- an existing *unverified* record is reused only when the verification address
  matches — an anonymous caller cannot re-point somebody else's record;
- no internal identifier is returned (asserted against the serialised payload);
- tenant narrowing (`X-Punched-Tenant`), the `appointments` module gate, and
  `NOT_FOUND` for an unknown business;
- per-IP rate limits on both endpoints, with the per-identity limits enforced on
  the row itself.

**Frontend**

| File | Change |
| --- | --- |
| `src/lib/api/types.ts` | `GuestBooking*` types |
| `src/lib/storefront/api.ts` | `guestBookingApi.start/verify`; `bookingApi.*` accept an optional guest token |
| `src/lib/storefront/guest-session.ts` | new — the guest token in `sessionStorage`, per business, **not** in the app session |
| `src/components/storefront/booking/GuestVerifyPanel.tsx` | new — details → code, with every server refusal surfaced as its own message |
| `src/routes/$slug.book.tsx` | the payment step's "sign in to confirm" alert is replaced by verification for guests; the booking mutation sends the guest token when there is no session; a 401 mid-flow clears the token and returns the visitor to verification |
| `src/components/storefront/booking/GuestVerifyPanel.test.tsx` | new — 5 tests |

### 4.2 Staff professional profiles — Phase 2

`specialities` and `years_of_experience` added to `business_memberships`, plus a
CHECK constraint bounding experience to 0–80. `bio`, `IsPublic`, `IsBookable`,
`PositionId`, `positionName`, `serviceIds` and `avatarUrl` already existed.

| File | Change |
| --- | --- |
| `Domain/Entities/BusinessMembership.cs` | the two properties |
| `Infrastructure/Data/Configurations/BusinessMembershipConfiguration.cs` | columns + `ck_business_memberships_years_experience` |
| `Migrations/20261103124327_AddStaffSpecialitiesAndExperience.*` | new — two nullable columns + one check constraint (additive; existing rows are `NULL` = "not stated") |
| `Application/DTOs/StaffManagementDTOs.cs` | `StaffDetailResponse` + `UpdateStaffRequest` |
| `Application/DTOs/ServiceDTOs.cs` | `EligibleStaffResponse` (public roster) |
| `Application/Services/StaffManagementService.cs` | read + write, with `clearYearsOfExperience` so an omitted field never erases a stated value |
| `Application/Services/ServiceCatalogService.cs` | the public roster now publishes bio/specialities/experience, for members who already passed the public+bookable filter |
| `PunchedApi.Tests/StaffProfileTests.cs` | new — 7 tests |
| `src/lib/api/types.ts`, `src/lib/validation/staff.ts`, `src/lib/staff/mappers.ts` | types, validation (0–80), completeness checklist |
| `src/components/storefront/StorefrontTeamMemberDetail.tsx` | biography, speciality chips and experience; every absent section is omitted rather than filled in |
| `src/components/storefront/StorefrontTeamCard.tsx` | stated experience on the tile |
| `src/components/staff/StaffProfileDrawer.tsx` | the two editable fields |
| `src/components/storefront/StorefrontTeamMemberDetail.test.tsx` | new — 4 tests |

### 4.3 Gallery captions and publication — Phase 3

`caption` (nullable, 200) and `is_visible` (default `true`) added to
`business_media`, plus `PATCH /v1/media/business/gallery/{mediaId}` and an owner
management screen that replaces the placeholder route.

| File | Change |
| --- | --- |
| `Domain/Entities/Media.cs` | `BusinessMedia.Caption`, `BusinessMedia.IsVisible` |
| `Infrastructure/Data/Configurations/BusinessMediaConfiguration.cs` | columns |
| `Migrations/20261103125943_AddGalleryCaptionAndVisibility.*` | new — nullable caption + `is_visible` defaulting to true (existing rows stay published) |
| `Application/DTOs/MediaDTOs.cs` | `BusinessMediaResponse` + `UpdateGalleryEntryRequest` |
| `Domain/Interfaces/IMediaService.cs`, `Application/Services/MediaService.Relationships.cs` | `UpdateGalleryEntryAsync` (caption, publication, position), reusing the existing attach authorization |
| `API/Controllers/MediaController.cs` | the `PATCH` action |
| `Application/DTOs/StorefrontGalleryDTOs.cs`, `Application/Services/StorefrontGalleryService.cs` | the public gallery returns captions and **excludes unpublished images** |
| `PunchedApi.Tests/GalleryEntryTests.cs` | new — 5 tests |
| `src/lib/media/api.ts`, `src/lib/media/index.ts` | the gallery client (list, capacity, attach, update, reorder, detach) |
| `src/components/settings/GalleryManager.tsx` | new — upload, caption on blur, publish/hide, reorder, remove |
| `src/routes/dashboard.gallery.tsx` | the placeholder is replaced by the manager |
| `src/components/storefront/StorefrontGallery.tsx` | captions in the lightbox, read with the tile |
| `src/components/settings/GalleryManager.test.tsx` | new — 6 tests |

### 4.4 Enquiry email notification — Phase 4

The one-time-code and enquiry templates already existed for every channel; the
enquiry type was declared `InAppOnly`. It now declares
`{ in-app, email, push }`, so delivery is governed entirely by the existing,
configurable layers — `Email.Enabled` + `Email.FromAddress` for the sender, and
the notification preference matrix for the owner's consent. No second switch was
invented, and no credentials or sender identity were fabricated.

- `Application/Notifications/NotificationTypes.cs` — the `storefront.enquiry`
  entry and a documented `OperatorAlertChannels` set (SMS is deliberately
  excluded: it is opt-in and cost-bearing).
- `appsettings.json` — `Email.Enabled: false` made explicit (it was already the
  default), so the operational requirement is visible in configuration.
- `PunchedApi.Tests/StorefrontEnquiryNotificationTests.cs` — new, 4 tests: an
  in-app row **and** an email outbox row; the queued email carries the visitor's
  name, the reference and the reply number; a repeated intent with the same key
  queues exactly one email; and an enquiry still succeeds (with a real reference)
  when the notification pipeline throws, so a delivery fault never loses it.

### 4.5 Frontend testing framework — Phase 5

Vitest 5 + React Testing Library 16 + `user-event` 14 + `jest-dom` 7 + MSW 3 +
jsdom 30, all as devDependencies.

| File | Change |
| --- | --- |
| `vitest.config.ts` | new — jsdom at a non-local hostname (so tenant resolution is exercisable), deterministic `VITE_*` host config, coverage, setup file |
| `src/test/setup.ts` | new — jest-dom matchers, MSW lifecycle, per-test cleanup and storage resets, `matchMedia`/`scrollIntoView` polyfills |
| `src/test/handlers.ts`, `src/test/server.ts` | new — the real endpoints, served as the real envelope, with `onUnhandledFrame: 'error'` so an undeclared request fails the test |
| `src/test/render.tsx` | new — `renderStorefront`, mounting the same provider stack the app does |
| `src/test/fixtures.ts` | new — wire-shaped builders |
| `package.json` | `test`, `test:watch`, `test:coverage` |

**55 tests across 12 files**, all behaviour-level: gallery grid + lightbox
(keyboard, focus, captions, empty/error/module-disabled), opening hours
(closed days, shared break, special hours, fallback caption, footer degradation),
server-side search (debounce, one request per word, scope, paging, failure retry,
empty state), the enquiry form (four steps, normalised number, validation without
a request, server error preserved), staff profiles (published fields, omitted
sections, zero experience, unknown member), the owner gallery manager (caption on
blur, publish/hide, remove, empty, failure), guest verification (code step,
wrong code issues no token, success stores the token, account-exists, resend
cooldown), theme switching, entitlement-aware sections, tenant switching, and the
booking draft.

## 5. Verification actually run (increment 2)

```
PunchedApi:  dotnet build                                  → 0 warnings, 0 errors
             dotnet test PunchedApi.Tests                   → Passed! Failed: 0, Passed: 1305, Skipped: 18, Total: 1323
zenbokk-ui:  npx tsc -b                                     → clean
             npm run build                                  → tsc -b + vite build, ✓ built in 16.81s
             npm run lint                                   → Found 85 warnings and 0 errors
             npm run test                                   → Test Files 12 passed, Tests 55 passed
```

Backend test count moved 1280 → 1305 (+25: 9 guest booking, 7 staff profile,
5 gallery entry, 4 enquiry notification). The 18 skips remain the pre-existing
Docker/PostgreSQL-gated fixtures.

## 6. Environment and configuration

No new environment variables. Two operational switches matter:

| Setting | Default | Effect |
| --- | --- | --- |
| `Email:Enabled` | `false` | Turns on the SMTP sender. Required for **guest booking** (the code is emailed) and for the owner's **enquiry email**. With it off, guest booking returns a clear failure and the enquiry is still recorded in-app. |
| `Email:FromAddress` | empty | The sender identity. Required alongside `Email:Enabled`; no address is invented. |
| `RateLimiting:guest-booking-start:PermitLimit` | 10/hour/IP | Optional tuning. |
| `RateLimiting:guest-booking-verify:PermitLimit` | 30/hour/IP | Optional tuning. |

## 7. Database migrations added

| Migration | Change | Rollback |
| --- | --- | --- |
| `20261103124327_AddStaffSpecialitiesAndExperience` | `business_memberships.specialities varchar(300) NULL`, `.years_of_experience int NULL`, `ck_business_memberships_years_experience` | `Down` drops the constraint then the two columns. Existing rows are unaffected in both directions. |
| `20261103125943_AddGalleryCaptionAndVisibility` | `business_media.caption varchar(200) NULL`, `.is_visible boolean NOT NULL DEFAULT true` | `Down` drops both columns. The `true` default means every pre-existing gallery image stayed published, so the upgrade changed no visible behaviour. |

Both are additive, preserve every existing row, and were verified against the
EF model (`dotnet ef migrations add` produced no other changes).

## 8. What still remains

1. **Phase 6 — storefront content management.** The owner-facing landing-page
   editor and section system already exist (`LandingPageController`,
   `dashboard.storefront`). A dedicated audit that every listed surface is
   editable end-to-end from the console was **not** performed.
2. **Phase 7 — full accessibility, performance and security audit.** Not
   performed as a standalone audit. The new surfaces were built to the existing
   standard (semantic landmarks, labelled controls, focus management, `aria-live`
   regions, keyboard-complete lightbox and wizard step, token-only styling), but
   a whole-storefront pass — contrast measurements, reduced-motion coverage,
   bundle analysis, PostgreSQL query plans — remains.
3. **End-to-end runs against a live API + database.** Not executed: Docker/
   PostgreSQL is unavailable in this environment, so the 18 gated fixtures are
   skipped and no browser-driven journey was run. Every assertion above is from a
   real execution of the test suites.
4. **A sitemap.** Still absent, for the reason recorded in increment 1: it needs
   a list of published storefronts, which the platform deliberately does not
   expose. That is a product/privacy decision.
5. **Environment note.** A `dotnet watch` session and a `PunchedApi.exe`
   instance from earlier work were holding the build output; both were stopped to
   allow builds and tests to run. They were not restarted.

