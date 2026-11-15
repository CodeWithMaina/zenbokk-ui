# Finance & Payments module migration

> Branch: `feat/finance-payments-redesign` · Design source: `html-designs/Finance · Aurelia Luxe Hair Atelier.html`
>
> The task brief assumes Next.js + Zustand. This codebase is **Vite + React 19 + TanStack
> Router + TanStack Query** (see `package.json` — no Next.js, no Zustand). The Customer module's
> data layer is TanStack Query on `src/lib/api/client.ts` (`apiGet`/`apiRequest` unwrapping the
> `{ success, data, error }` envelope into a typed `ApiError`). The new module matches it exactly;
> no new dependency is introduced. The brief's `/finance/*` URLs therefore map onto the
> authenticated console as `/dashboard/finances/*`.

## 1. Delete list (finance/payments-only; verified no importers outside the module)

Routes (replaced by redirect stubs where a permanent redirect is required):

| File | Fate |
| --- | --- |
| `src/routes/dashboard.payments.tsx` | Delete → redirect stub to `/dashboard/finances/payments` |
| `src/routes/dashboard.finances.analytics.tsx` | Delete → redirect stub to `/dashboard/finances/cashbook` |
| `src/routes/dashboard.finances.reconciliation.tsx` | Delete → redirect stub to `/dashboard/finances/payments` |
| `src/routes/dashboard.finances.reconciliation.$claimId.tsx` | Delete → redirect stub to `/dashboard/finances/payments/$paymentId` |
| `src/routes/dashboard.finances.transactions.tsx` | Delete → redirect stub to `/dashboard/finances/cashbook` |
| `src/routes/dashboard.finances.transactions.$transactionId.tsx` | Delete → redirect stub to `/dashboard/finances/cashbook` |
| `src/routes/dashboard.finances.expenses.$expenseId.tsx` | Delete → redirect stub to `/dashboard/finances/expenses` |
| `src/routes/dashboard.finances.cashbook.tsx` | Rewritten to the new design |
| `src/routes/dashboard.finances.expenses.tsx` | Rewritten to the new design |

Components (`src/components/finances/`) — all deleted; the new module lives in `src/components/finance/`:

`AddIncomeDialog`, `AddIncomeFields`, `badges`, `BreakdownList`, `ClaimDialogs`, `ClaimsBoard`,
`ExpenseFields`, `FinanceFilterBar`, `FinanceTable`, `MpesaMessage`, `PeriodPicker`,
`RecordExpenseDialog`, `RefundDialog`, `RefundFields`, `TransactionDetail`, `TrendChart`,
`VoidExpenseDialog` (+ their test files, which the "no tests" rule leaves to the later test task).

Libraries (`src/lib/finances/`): `claims.ts`, `claim-status.ts`, `period.ts`, `labels.ts` deleted;
`api.ts` kept but trimmed to the surface the new module uses (overview, cashbook, expense
categories, expenses list/create/update/void, record income, claim verify/reject).

Nav: the standalone **Payments** entry (`/dashboard/payments`, `src/lib/navigation/config.ts`) is
removed; the Finance group's children become exactly **Cashbook, Payments, Expenses**. The
Reconciliation/Transactions children are removed.

## 2. Keep-and-reuse list

Shared (imported from outside finance/payments — never deleted):

- `src/lib/api/client.ts` — `ApiError`, `apiGet`, `apiRequest`, `errorMessage` (all modules).
- `src/lib/payments/api.ts` — payments register/dashboard/verification client, used by
  appointments, storefront checkout and clients. Extended, not replaced.
- `src/lib/format.ts`, `src/lib/cn.ts`, `src/lib/entitlements.ts`, `src/lib/navigation/*`,
  `src/lib/dashboard/*`, `src/lib/clients/*`.
- UI kit (`src/components/ui/`): `PageHeader`/`EntityHeader`, `Button`/`LinkButton`/`BackLink`,
  `StatusPill`/`Badge`/`CountBadge`, `Avatar`, `Checkbox`, `Menu`, `Drawer` (side sheet → bottom
  sheet under 40rem), `FilterDrawer` + `FilterSummary`, `ConfirmDialog`, `EmptyState`,
  `SearchField`, `PaginationBar`, `SelectionBar`, `Skeleton`, `Chip`, `Alert`, `Field`,
  `Portal`, `useOverlay`, `sonner` toasts.
- `src/components/shell/*` (`ConsoleShell`, `ConsoleNavList`, `NavDrawer`, `ModulePlaceholder`)
  — extended with an optional warning badge channel for the Payments entry.
## 3. Redirect map (permanent)

| Old URL | New URL |
| --- | --- |
| `/dashboard/payments` | `/dashboard/finances/payments` |
| `/dashboard/finances` | `/dashboard/finances/cashbook` (existing behaviour, kept) |
| `/dashboard/finances/reconciliation` | `/dashboard/finances/payments?tab=claims` |
| `/dashboard/finances/reconciliation/`$claimId | `/dashboard/finances/payments/`$paymentId |
| `/dashboard/finances/transactions` | `/dashboard/finances/cashbook` |
| `/dashboard/finances/transactions/`$transactionId | `/dashboard/finances/cashbook` |
| `/dashboard/finances/analytics` | `/dashboard/finances/cashbook` |
| `/dashboard/finances/expenses/`$expenseId | `/dashboard/finances/expenses` |

New canonical routes:

- `/dashboard/finances/cashbook`
- `/dashboard/finances/payments`
- `/dashboard/finances/payments/`$paymentId (full page, never a drawer)
- `/dashboard/finances/expenses`

## 4. Mutation endpoints (found in `PunchedApi/API/Controllers`)

| Flow | Endpoint |
| --- | --- |
| Verify claim | `POST /v1/finances/reconciliation/claims/{paymentId}/verify` (also `POST /v1/payments/{id}/verification/approve`) |
| Reject claim | `POST /v1/finances/reconciliation/claims/{paymentId}/reject` (body `{ reason }`) |
| Void entry | `POST /v1/finances/expenses/{id}/void` (body `{ reason }`) - expenses only; no void endpoint exists for other cashbook entries (gap, section 6) |
| Create expense | `POST /v1/finances/expenses` (perm `finances.manage_expenses`) |
| Record income | `POST /v1/finances/income` (perm `finances.record_income`) |

Read endpoints: `GET /v1/payments`, `GET /v1/payments/{id}`, `GET /v1/payments/dashboard`,
`GET /v1/finances/overview`, `GET /v1/finances/cashbook`, `GET /v1/finances/expenses`,
`GET /v1/finances/expense-categories`, `GET /v1/finances/reconciliation/claims/{paymentId}`.

## 5. Query parameters the backend actually supports (checked in the controllers)

- `GET /v1/payments`: `appointmentId, customerId, status, method, type, from, to, page, pageSize`. **No `search`, no `sort`.**
- `GET /v1/payments/dashboard`: none. Returns `todayCollected, todayCount, monthCollected, monthCount, pendingCount, pendingAmount, failedCount, cashCollectedToday, mpesaCollectedToday, awaitingVerificationCount, awaitingVerificationAmount, unmatchedCallbackCount`.
- `GET /v1/finances/cashbook`: `from, to, type, direction, source, category, paymentMethod, search, recordedByUserId, recordedBy, customer, minAmount, maxAmount, includeVoided, page, pageSize`. **No `sort`/`sortDirection`.**
- `GET /v1/finances/expenses`: `category, paymentMethod, minAmount, maxAmount, from, to, search, sort, sortDirection, recordedByUserId, payee, excludeVoided, page, pageSize`.
- `GET /v1/finances/overview`: `period, from, to`.

## 6. Backend gaps (not faked; listed in the final report)

1. **Payments search** - the design searches name, M-Pesa code, phone and reference; the list endpoint has no `search` param. The search box is not rendered on Payments until the backend supports it.
2. **Payments sorting** - no `sort` param; the register is server-ordered newest-first. The sort group is omitted on Payments.
3. **Cashbook sorting** - no `sort`/`sortDirection` params; same treatment.
4. **Void cashbook entry** - only expenses can be voided. The Void row action appears on expense-typed rows only.
5. **Cashbook - payment deep link** - `CashbookEntryResponse` carries no `sourcePaymentId`, so a cashbook row that came from a payment cannot link to it yet.
6. `PaymentListResponse` has no `totalPages` (page count is derived from `totalCount`/`pageSize` - presentation only, never money arithmetic).

## 7. Status mapping (wire - pill)

Wire statuses (`PaymentStatuses.ToWire`): `created`, `pending`, `awaiting_customer`, `processing`, `submitted`, `under_review`, `flagged`, `verified`, `success`, `rejected`, `failed`, `expired`, `cancelled`, `reversed`, `refunded`.

- **Paid** (success): `success`, `verified`
- **Needs verification** (warning): `submitted`, `under_review`, `flagged`
- **Pending** (warning): `created`, `pending`, `awaiting_customer`, `processing`
- **Failed** (danger): `failed`, `rejected`, `expired`, `cancelled`, `reversed`
- **Refunded** (neutral): `refunded`
- anything else: neutral pill with the raw status text - never a crash.

## 8. Permissions used

`finances.view` (pages), `finances.verify` (verify/reject claim, owner only), `finances.record_income` (record income), `finances.manage_expenses` (record/void expense). Pages render the existing module placeholder when the gate fails; action buttons are hidden, not disabled.
