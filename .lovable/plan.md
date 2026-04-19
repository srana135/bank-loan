

## Audit findings

### Current state
1. **Loan type** (`src/types/index.ts`) already has:
   - `disbursement_date: string | null` — can serve as `loan_start_date`
   - `expiry_date: string | null` — already exists (added in `supabase-migration-v5.sql`)
   - **Missing**: `loan_term` (months)
2. **`LoanDetailDrawer.tsx`** — Financial section currently shows: Installment, Overdue Installments, Overdue Amount, Outstanding, Classification, Disbursed Amount, Disbursement Date, Total Recovery. **No Expiry Date row, no overdue highlight on header.**
3. **`LoanForm.tsx`** — needs to capture `loan_term` and auto-compute `expiry_date` from `disbursement_date + loan_term`.
4. **DB schema** — `expiry_date` column exists. `loan_term` column does **not** exist → needs SQL migration.

### Two viable paths

**Path A — Add `loan_term` column (fully featured)**
- SQL migration to add `loan_term integer` to `loans` table
- Update `Loan` type
- Update `LoanForm` with new field + auto-compute expiry
- Update `LoanDetailDrawer` with expiry row + overdue logic + red header

**Path B — Drawer-only changes (no schema change)** ⭐ recommended for now
- Use the **existing `expiry_date`** field (already in schema/type) as source of truth
- LoanForm already accepts `expiry_date` (or can be added if missing) — user enters directly OR computed from `disbursement_date + a transient term input`
- Drawer:
  - Show `Expiry Date` row in Financial section (DD-MM-YYYY)
  - Compute `isOverdue = today > expiry_date`
  - Header: red + bold borrower name & account_no when overdue
  - Show `মেয়াদ উত্তীর্ণ` badge near header when overdue
  - Show `Overdue by X days` / `X days remaining` line

This avoids a DB migration and matches the user's primary goal: **UI visibility of expiry + overdue highlight**.

### Recommendation
Go with **Path B**. The `expiry_date` field already exists in DB and type — we just surface it correctly in the drawer with overdue styling. If the user later wants `loan_term` as a stored helper, that's a small additive migration.

## Proposed changes (Path B)

### File: `src/components/loans/LoanDetailDrawer.tsx` (only file)

1. Add helpers at top of component:
   ```ts
   const fmtDDMMYYYY = (s) => s ? new Date(s).toLocaleDateString('en-GB').replace(/\//g,'-') : '-';
   const today = new Date(); today.setHours(0,0,0,0);
   const expiry = loan.expiry_date ? new Date(loan.expiry_date) : null;
   const isOverdue = expiry ? today > expiry : false;
   const dayDiff = expiry ? Math.ceil((expiry.getTime() - today.getTime()) / 86400000) : null;
   ```

2. **Header** — apply red+bold when `isOverdue`:
   ```tsx
   <SheetTitle className={`text-lg ${isOverdue ? 'text-destructive font-bold' : ''}`}>
     {loan.borrower_name}
   </SheetTitle>
   <SheetDescription className={`font-mono ${isOverdue ? 'text-destructive font-bold' : ''}`}>
     {loan.account_no}
   </SheetDescription>
   ```
   Add a `মেয়াদ উত্তীর্ণ` badge under the title when overdue.

3. **Financial section** — add Expiry Date row + overdue/remaining line:
   ```tsx
   <DetailRow label="Expiry Date" value={fmtDDMMYYYY(loan.expiry_date)} />
   {expiry && (
     <div className="flex justify-between py-1.5 text-sm">
       <span className="text-muted-foreground">Status</span>
       <span className={isOverdue ? 'text-destructive font-semibold' : 'text-green-700 dark:text-green-400 font-medium'}>
         {isOverdue ? `Overdue by ${Math.abs(dayDiff)} days` : `${dayDiff} days remaining`}
       </span>
     </div>
   )}
   ```

### What's NOT changing
- DB schema (no migration)
- `LoanForm` (already supports `expiry_date` via existing flow / import)
- `useLoans`, queries, business logic
- Any other page

## Files to edit
- `src/components/loans/LoanDetailDrawer.tsx` — only file

## Out of scope (can do later if desired)
- Adding `loan_term` column + auto-compute on form save
- Highlighting overdue rows in `LoanManagement` table/cards
- Filtering by overdue status

