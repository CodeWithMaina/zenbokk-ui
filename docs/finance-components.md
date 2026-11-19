# Finance components and conventions

> Module: `src/components/finance/` · Data layer: `src/lib/finances/api.ts` (+ `src/lib/payments/api.ts`)
> Visual source: `html-designs/Finance · Aurelia Luxe Hair Atelier.html` → recipes in `finance.css`.

The Finance module is four pages (Cashbook, Payments, Payment detail, Expenses) built from a small,
reusable component set. Everything reads money from the server — nothing in these components computes
a financial total from a partial page.

## Pages

| Component | Route | Props |
| --- | --- | --- |
| `CashbookPage` | `/dashboard/finances/cashbook` | — |
| `PaymentsPage` | `/dashboard/finances/payments` | — |
| `PaymentDetailPage` | `/dashboard/finances/payments/$paymentId` | `{ paymentId: string }` |
| `ExpensesPage` | `/dashboard/finances/expenses` | — |

Pages read URL search parameters on render (`type`, `method`, `status`, `search`, `from`, `to`, `page`,
`pageSize`, `voided`, `tab`) so a refresh or a shared link reproduces the view. Filters are written
back with `history.replaceState`, and a re-render follows a state change so the query refetches.

## Status pills and small controls — `pills.tsx`

```tsx
<PaymentStatusPill status={payment.status} />
<MethodPill label="M-Pesa" cash={false} />
<CopyButton value={payment.reference} label="Copy reference" />
```

- `PaymentStatusPill({ status, className? })` maps every backend wire status to one of the approved
  tones via `paymentStatusDisplay` (`src/lib/finances/status.ts`). Unknown statuses render a neutral
  pill with the raw text — never a crash.
- `MethodPill({ label, cash? })` is a neutral pill; `cash` adds the banknote glyph.
- `CopyButton({ value, label? })` writes to the clipboard, shows an inline tick for 1.6s, and falls
  back to a toast when the Clipboard API is unavailable. It stops click propagation so it can live
  inside a clickable row.

## Statistics — `stats.tsx`

```tsx
<StatsBand>
  <PremiumStatCard
    label="Net cash movement"
    amount={cashbook.data?.netCashMovement ?? 0}
    badge={`${cashbook.data?.totalCount ?? 0} entries`}
    first={{ label: 'Income', amount: incoming, swatch: 'mpesa' }}
    second={{ label: 'Expenses', amount: outgoing, swatch: 'cash' }}
  />
  <StatTileGrid>
    <StatTile label="Verified income" value={money(totals.verifiedIncome)} hint="This period" />
    <StatTile label="Awaiting verification" value={money(pending)} hot={pendingCount > 0}
      to="/dashboard/finances/payments?tab=claims" goLabel="Review claims" />
  </StatTileGrid>
</StatsBand>
```

- `PremiumStatCard` shows a headline amount, a two-part split bar and a legend. Amounts arrive as
  props; the component only derives the bar widths.
- `StatTile` renders a `<div>`, a `<Link>` (when `to` is set) or a `<button>` (when `onClick` is set).
  `hot` marks the attention state (claims waiting on the owner).
- `StatsBand` / `StatTileGrid` are layout wrappers that collapse to one column under the container
  breakpoint.

Loading/empty is owned by the page: it renders `FinanceTableSkeleton` while the query is pending and
the populated band once data arrives. The stats components have no internal fetch.

## Table — `table.tsx`

`FinanceTable<T>` renders a desktop grid table and a mobile card grid from one row model. The card
grid appears under a `52rem` container (`@container main (max-width:52rem)`).

```tsx
<FinanceTable
  rows={rows}
  rowId={(r) => r.id}
  columns={columns}          // readonly FinanceColumn<T>[]
  card={cardConfig}          // FinanceCardConfig<T>
  selected={selectedIds}     // ReadonlySet<string>
  onToggleRow={toggleRow}
  onTogglePage={togglePageSelect}   // (selectAll: boolean) => void
  rowMenuItems={rowMenuItems}       // optional
  onOpen={openRow}                  // optional
  isVoided={(r) => r.isVoided}
  ariaLabel="Cashbook entries"
/>
```

- `FinanceColumn<T> = { id: string; header: ReactNode; align?: 'right'; render: (row: T) => ReactNode }`.
- `FinanceCardConfig<T>` describes the mobile card: `edge`, `avatar`, `title`, `subtitle`, `amount`,
  `amountCaption?`, `field1`, `field2`, `footer`, `footerMeta?`.
- Row actions use the shared `Menu` (`src/components/ui/menu.tsx`): keyboard navigation, focus
  management, Escape, click-outside, and a portal so it never clips inside a scrolling table.
- `FinanceTableSkeleton({ rows? })` is the loading placeholder.
- Provide an empty state from the page (the pages render their own `EmptyState` above the table when
  the list is empty); the table itself renders only the header when `rows` is empty.

## Selection — `select-bar.tsx`

```tsx
<SelectBar
  selectedCount={selectedIds.size}
  totalCount={rows.length}
  page={page}
  pageSize={pageSize}
  filteredCount={rows.length}
  pageCount={totalPages}
  onSelectAll={() => togglePageSelect(true)}
  onClear={() => setSelectedIds(new Set())}
/>
<SelectionDock
  selectedCount={selectedIds.size}
  selectedTotal={selectedTotal}
  onExportCsv={exportCsv}
  onClear={() => setSelectedIds(new Set())}
/>
```

`SelectBar` sits above the register and shows the page checkbox, "n selected", a select-all action,
Clear and the visible range. `SelectionDock` is the floating bar with bulk verify (payments) and CSV
export. Selecting a row clears when the page or filters change — the pages call
`setSelectedIds(new Set())` in every pagination/filter handler.

## Row menu — `row-menu.tsx`

```tsx
<RowMenu
  triggerLabel="Actions"
  items={rowMenuItems(row)}
/>
```

`RowMenuItem = { label; icon?; onSelect; destructive?; disabled?; separatorBefore? }`. The component
renders `role="menu"` with `role="menuitem"` children, focuses the first item on open, and closes on
Escape, click-outside or item select while returning focus to the trigger. The trigger stays in place;
only the panel is portalled. Permission-aware items are decided by the caller (e.g. "Void expense"
only appears for `finances.manage_expenses`).

## Filter drawer — `filter-drawer.tsx`

```tsx
<FilterToolbar activeCount={activeFilters.length} onOpen={() => setFilterOpen(true)} />
<FinanceFilterDrawer
  open={filterOpen}
  onClose={() => setFilterOpen(false)}
  sorts={sorts}            // SortOption[] — leave [] where the endpoint has no sort
  sort={sort}
  onSortChange={applySort}
  presets={presets}        // DatePreset[]
  preset={preset}
  onPresetChange={applyPreset}
  from={fromFilter ?? ''}
  to={toFilter ?? ''}
  onFromChange={(v) => applyDate('from', v)}
  onToChange={(v) => applyDate('to', v)}
  groups={groups}          // custom filter JSX (status/method/category chips)
  activeFilters={activeFilters}
  onResetFilters={resetFilters}
  onApplyFilters={() => setFilterOpen(false)}
/>
```

`FinanceFilterDrawer` is a right-side drawer on desktop and a bottom sheet under `40rem` (via the
shared `Drawer`). It renders sort chips, date presets, from/to date inputs and the caller's `groups`.
`ActiveFilterChip = { id; label; onRemove }`; the pages also render `ActiveFilterChips` above the
register. Date presets become concrete `from`/`to` values via `presetRange()` from
`src/lib/finances/use-debounced-value.ts`. Filters persist to the URL with `syncUrlParam()` /
`history.replaceState`, then the page re-renders so the query sees the new parameters.

## Toasts — `toast.tsx`

`FinanceToast({ open?, message?, className? })` is the controlled prototype toast (`role="status"`,
`aria-live="polite"`). **Runtime feedback uses `sonner`** (`toast.success` / `toast.error` /
`toast.info`) so notifications are announced and dismissed consistently; `FinanceToast` is kept for
visual parity when a page wants the inline prototype variant.

## Guided mutation flows

### `FinanceClaimDialogs` — verify / reject a payment claim

```tsx
<FinanceClaimDialogs
  verifyOpen={verifyOpen}
  verifyPending={verify.isPending}
  onVerifyClose={() => setVerifyOpen(false)}
  onVerify={handleVerify}            // (paymentId, note, receivedAmount?) => void
  rejectOpen={rejectOpen}
  rejectPending={reject.isPending}
  onRejectClose={() => setRejectOpen(false)}
  onReject={handleReject}            // (paymentId, reason) => void
  rejectionReason={rejectionReason}
  onRejectionReasonChange={setRejectionReason}
  claim={{ id, customerName, amount, reference, parsedTransactionCode }}
/>
```

- The claim id lives on `claim`, so the confirm buttons act on the right payment even before the
  mutation starts. `verifyPending` / `rejectPending` disable the confirm while the mutation is in
  flight.
- Verify accepts an optional "what you received" amount and a note; verifying records income in the
  cashbook.
- Reject requires a reason. Choosing **Other** reveals a details field; the composed reason (the chip
  value, or the typed details) goes to the server — a rejection reason is never discarded.
- Actions are only offered when the claim is still awaiting verification and the caller holds
  `finances.verify`.

### `RecordExpenseSheet` — record an expense

`RecordExpenseSheet({ open, onClose, categories, onSave })` validates amount > 0, a category and a
description, then calls `onSave({ amount, category, paymentMethod, description, transactionDate })`.
The page submits with `useExpenseActions().create` (→ `POST /v1/finances/expenses`), shows a toast and
lets the mutation invalidate the finance queries.

### `RecordIncomeSheet` — record income

`RecordIncomeSheet({ open, onClose, onSave })` collects amount, source (product sale / walk-in /
manual), description, optional payee and method, then calls `onSave`. The page submits with
`useRecordIncome()` (→ `POST /v1/finances/income`). This is one income flow, not a second payment
system — appointment money still flows through Payments.

### `VoidExpenseDialog` — void an expense

`VoidExpenseDialog({ open, onClose, expenseId, expense?, reason, onReasonChange, onVoid, pending })`
shows the expense being voided, requires a reason, and refuses to void an already-voided row. Voiding
is `POST /v1/finances/expenses/{id}/void` (never a delete) and keeps the audit trail.

## API and query conventions

The single data layer is `src/lib/finances/api.ts` (`financesApi` + hooks). It reuses the shared
`apiGet` / `apiRequest` client (`src/lib/api/client.ts`), so auth, tenant scoping and the
`{ success, data, error }` envelope are handled once.

Finance query keys (all under the finance `root`):

| Hook | Key |
| --- | --- |
| `useFinancialOverview` | `[...root, 'overview', period, from, to]` |
| `useCashbook` | `[...root, 'cashbook', filters]` |
| `useExpenses` | `[...root, 'expenses', filters]` |
| `useExpenseCategories` | `[...root, 'expense-categories']` |
| `useFinancialTransaction` | `[...root, 'transaction', id]` |
| `useFinancialAuditTrail` | `[...root, 'audit', id]` |

Payments keys (`src/lib/payments/api.ts`): `['payments', 'list', filters]`,
`['payments', 'dashboard']`, `['payments', 'payment', id]`.

Mutations are `useMutation` wrappers whose `onSuccess` calls `refreshFinances(queryClient)`, which
invalidates the finance root so lists, detail and statistics refresh together. Payment mutations
invalidate the payment list/dashboard. Errors surface through `errorMessage(err)` in a toast — never
swallowed.

Server support the UI respects (do not fake what the endpoint cannot do): the payments list supports
`status/method/type/from/to/page/pageSize` but **no `search` or `sort`**, so the Payments page filters
the loaded page client-side and offers no sort. The cashbook supports `search` but no sort. Only
expenses carry a void endpoint.

## Responsive behaviour and design

- `finance.css` (imported once from `index.css`) holds the `fin-*` recipes; everything else uses the
  shared design tokens and UI kit. No raw colours, no new fonts.
- Desktop shows the grid table; under `52rem` a container query swaps in the mobile card grid. Rows and
  cards stay usable at `360px` (container-driven, not fixed widths).
- Light and dark are driven by the theme tokens (`data-theme`), so both modes share one stylesheet.
- Drawers are right-side on desktop and bottom-sheet on mobile; the row menu is a popover that becomes
  a bottom sheet on phones.

## Permissions

Visibility is not authorisation — the backend enforces every mutation. Pages gate affordances with the
dashboard context: `finances.view` to open a page, `finances.verify` for verify/reject,
`finances.record_income` for Record income, `finances.manage_expenses` for Record/Void expense. A page
without `finances.view` (or the `financials` module) renders the module placeholder instead of data.


