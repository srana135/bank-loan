

## Audit findings

**Why "Court Orders" shows "-" for every case:**

1. The table/cards read `c.latest_order_summary` and `c.latest_order_date` directly from the `legal_cases` row.
2. These two columns are only written by `recomputeCaseLatestOrder()` in `useLegal.ts` — which only fires when an order is **added/updated/deleted** through the new UI.
3. All cases that already had orders **before** this logic existed (or cases whose orders were created via bulk import/migration) still have `latest_order_summary = NULL` and `latest_order_date = NULL` in the DB.
4. Result: the column is permanently "-" until someone manually re-saves an order on each case.

The display code at lines 855–858 (mobile card) and 918–924 (table) is correct; the data is just stale.

## Fix: derive Court Orders live from `legal_case_orders`

Make `legal_case_orders` the single source of truth for the column instead of the cached snapshot.

### Changes (single file: `src/pages/LegalManagement.tsx`)

1. **Fetch all orders once at page level**
   - Add a new query that selects `case_id, order_date, order_summary, next_date` from `legal_case_orders` for cases in the current branch scope, ordered by `order_date desc`.
   - Build a `Map<caseId, { order_date, order_summary, next_date }>` keeping only the **latest** entry per case.

2. **Replace the snapshot reads with the map lookup**
   - In the desktop table cell (line ~918): use `latestOrderMap.get(c.id)?.order_summary` and `?.order_date` with fallback to `c.latest_order_summary` / `c.latest_order_date` (so cached values still work as backup).
   - Same fallback in the mobile card (line ~855).
   - Same fallback in PDF export (line ~661, ~665).
   - Same fallback in `CaseDetailDrawer`'s "Latest Order Date" row.

3. **Backfill on read (optional safety net)**
   - When the live map yields a value that differs from the cached snapshot, fire a one-time silent update to write it back to `legal_cases`. Keeps future reads cheap and self-heals legacy rows.

### Why this approach
- No migration / SQL needed.
- Works immediately for every existing case (including bulk-imported ones).
- Keeps the existing `recomputeCaseLatestOrder()` for write-time updates — they remain in sync.
- All security/RLS unchanged (same tables, same select rights as `useCaseOrders`).

### Files to edit
- `src/pages/LegalManagement.tsx` — add the bulk orders query + latest-per-case map, swap the four read sites to use it with fallback.

