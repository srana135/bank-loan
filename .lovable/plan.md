

## আপনার চাহিদার সারাংশ

আপনি ৩১/০৩/২০২৬ ("data-as-of date") ভিত্তিক Excel data import করবেন এবং চান:

1. **As-of date ভিত্তিক import**: Excel-এর outstanding/overdue/due-installments/recovery যেমন আছে hubuhu DB-তে written হবে — কোনো auto-adjustment না।
2. **Pre-cutoff recoveries**: ৩১/০৩/২০২৬-এর আগের সব পুরোনো recovery records list-এ থাকবে কিন্তু imported balance-এর সাথে adjust হবে না (display only)।
3. **Post-cutoff recoveries**: ৩১/০৩/২০২৬-এর পরে যদি কোনো recovery থাকে, সেটা imported outstanding/overdue থেকে বিয়োগ হবে।
4. **Classification (STD/SMA/SS/DF/BL)** সেটিং থেকে দুটি set: **New Loan** ও **Rescheduled Loan** — admin আলাদা thresholds দিতে পারবে।
5. **Account Status enum পরিবর্তন**: `Active` সরিয়ে → `New Loan`, `RS-1`, `Special RS`, `Exit`।

## বর্তমান অবস্থা (audit findings)

- `LoanImportDialog.tsx` এখন import করার পর outstanding থেকে recovery বিয়োগ করছে — এটা আপনার "যেমন আছে তেমনই import" rule ভঙ্গ করছে।
- `loans` table-এ কোনো `data_as_of_date` field নেই → pre/post cutoff পার্থক্য করা যাচ্ছে না।
- `loan_recoveries`-এর `recovery_type` শুধু string — pre/post cutoff filter করার মত flag নেই (তবে `recovery_date` দিয়েই কাজ চলে যাবে)।
- `useAppSettings.ts`-এ `classification_days` একটাই set আছে — new vs rescheduled আলাদা না।
- Account status কোথাও enum নয়, plain text — UI form/filter-এ "active" hard-coded থাকতে পারে।

## প্রস্তাবিত সমাধান

### ১. Schema পরিবর্তন (migration)
- `loans` table: নতুন column যোগ —
  - `data_as_of_date date` (এই loan-এর latest import cutoff)
  - `loan_category text` ('new' | 'rescheduled' — classification rule choose করতে)
- কোনো enum তৈরি হবে না; account_status text-ই থাকবে কিন্তু allowed values হবে: `New Loan`, `RS-1`, `Special RS`, `Exit`।

### ২. Import logic পরিবর্তন (`LoanImportDialog.tsx`)
- Dialog-এ একটা **"Data As-of Date" picker** যোগ হবে (default: today, required)।
- প্রতিটি row import-এ:
  - **a. Loan upsert**: outstanding_amount, overdue_amount, overdue_installment_number, installment_amount — Excel value verbatim লেখা হবে (কোনো adjustment না)। `data_as_of_date` set হবে।
  - **b. Pre-cutoff recoveries (existing)**: `recovery_date <= as_of_date` যেগুলো আগে থেকে DB-তে আছে → untouched থাকবে, list-এ দেখাবে, কিন্তু balance-এ touch হবে না।
  - **c. Excel-এর Recovery row (if present)**: আগের মতো `loan_recoveries`-এ insert হবে, কিন্তু **outstanding/overdue auto-adjust হবে না** (Excel-এর outstanding ই truth)।
  - **d. Post-cutoff recoveries (existing in DB)**: `recovery_date > as_of_date` যেগুলো → import-এর পরে loop করে imported outstanding থেকে বিয়োগ ও installment-অনুযায়ী overdue কমানো হবে।
- Display logic (LoanDetailDrawer): recoveries section-এ "Pre-cutoff (informational)" ও "Post-cutoff (adjusted)" — দুই group দেখাবে।

### ৩. Classification settings (`AppSettings.tsx` + `useAppSettings.ts`)
- `classification_days` কে split:
  ```ts
  classification_days_new:    { sma_max, ss_max, df_max }
  classification_days_resch:  { sma_max, ss_max, df_max }
  ```
- AppSettings page → "Classification" tab-এ দুটি column-এ side-by-side input।
- `ClassificationSuggestion.tsx` → `loan.loan_category` দেখে কোন set ব্যবহার হবে decide করবে।

### ৪. Account Status options
- `LoanForm.tsx`-এর status `<Select>` এর options replace:
  - `New Loan`, `RS-1`, `Special RS`, `Exit`
- Loan creation default → `New Loan`। `RS-1`/`Special RS` select করলে `loan_category='rescheduled'` auto-set।
- `LoanFilters`, summary badges, filter chips সব update।
- Existing `'active'` data → migration-এ `New Loan`-এ map।

## ফাইল পরিবর্তনের তালিকা

**Schema**: নতুন migration (loans-এ ২ column, existing status data map)
**Code**:
- `src/types/index.ts` — Loan type-এ ২ field
- `src/components/loans/LoanImportDialog.tsx` — as-of date picker + new logic
- `src/components/loans/LoanForm.tsx` — status options + loan_category auto-set
- `src/components/loans/LoanFilters.tsx` — status filter options
- `src/components/loans/LoanSummary.tsx` — যেখানে status reference আছে
- `src/components/loans/LoanDetailDrawer.tsx` — recoveries pre/post grouping
- `src/components/loans/ClassificationSuggestion.tsx` — category-aware
- `src/components/loans/LoanRecoveries.tsx` — pre/post visual marker
- `src/hooks/useAppSettings.ts` — split classification_days
- `src/pages/AppSettings.tsx` — Classification tab UI
- `src/lib/loanColumns.ts` — `data_as_of_date`, `loan_category` column যোগ (import template-এ)

## Out of scope (পরে চাইলে)
- Bulk historical re-categorization (existing loans-এ loan_category set করা manually)
- Reports-এ pre/post recovery split

## একটা confirmation দরকার

**Default `loan_category`**: existing সব loans-এর জন্য migration-এ default কী হবে?
- Option A: সব → `'new'` (তারপর admin manually rescheduled mark করবে)
- Option B: যাদের status আগে `RS-1`/`Special RS` ছিল → `'rescheduled'`, বাকি → `'new'`

আপনার approval পেলে আমি default `Option B` ধরে implementation শুরু করব (কারণ এতে data সবচেয়ে accurate রূপে migrate হবে)।

