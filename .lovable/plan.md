

## পরিকল্পনা: Auto-Status + Manual Override দুটোই রাখা

### লজিক
- **Auto**: নতুন loan create বা `loan_amount` change হলে trigger অটো সেট করবে:
  - `loan_amount % 1 = 0` → `'New Loan'` + `loan_category='new'`
  - else → `'RS-1'` + `loan_category='rescheduled'`
- **Manual override**: Admin/Manager আগের মতোই `AccountStatusChange` dialog দিয়ে যেকোনো status (Frozen, Closed, Written Off, Settled, RS-1, Special RS ইত্যাদি) সেট করতে পারবেন। Trigger তখন fire করবে না কারণ `loan_amount` unchanged।

### Migration: `supabase-migration-v11-auto-status.sql`

```sql
-- 1. NUMERIC type নিশ্চিত
ALTER TABLE public.loans
  ALTER COLUMN loan_amount TYPE numeric USING loan_amount::numeric;

-- 2. Backfill (শুধু auto-managed values touch করব)
UPDATE public.loans
SET account_status = CASE
      WHEN (loan_amount % 1) = 0 THEN 'New Loan'
      ELSE 'RS-1' END,
    loan_category = CASE
      WHEN (loan_amount % 1) = 0 THEN 'new'
      ELSE 'rescheduled' END
WHERE loan_amount IS NOT NULL
  AND (account_status IS NULL
       OR account_status IN ('New Loan','RS-1','active','New',''));

-- 3. Trigger function — শুধু INSERT এবং loan_amount change-এ fire
CREATE OR REPLACE FUNCTION public.set_account_status_by_amount()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.loan_amount IS NOT NULL THEN
    IF (NEW.loan_amount % 1) = 0 THEN
      NEW.account_status := 'New Loan';
      NEW.loan_category := 'new';
    ELSE
      NEW.account_status := 'RS-1';
      NEW.loan_category := 'rescheduled';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- 4. Triggers — INSERT সবসময়, UPDATE শুধু loan_amount change হলে
DROP TRIGGER IF EXISTS trg_auto_status_insert ON public.loans;
CREATE TRIGGER trg_auto_status_insert
  BEFORE INSERT ON public.loans
  FOR EACH ROW EXECUTE FUNCTION public.set_account_status_by_amount();

DROP TRIGGER IF EXISTS trg_auto_status_update ON public.loans;
CREATE TRIGGER trg_auto_status_update
  BEFORE UPDATE OF loan_amount ON public.loans
  FOR EACH ROW
  WHEN (OLD.loan_amount IS DISTINCT FROM NEW.loan_amount)
  EXECUTE FUNCTION public.set_account_status_by_amount();
```

### Frontend পরিবর্তন
- **`LoanForm.tsx`** — `account_status` field hidden/read-only করব এবং একটা note দেখাব:  
  *"Status loan amount অনুযায়ী auto-set হবে। পরে admin/manager manually override করতে পারবেন।"*
- **`AccountStatusChange.tsx`** — অপরিবর্তিত থাকবে (manual override-এর জন্য)। এটাই admin override দেবে।
- **`LoanDetailDrawer.tsx`** — `<AccountStatusChange />` যেমন আছে থাকবে।
- **`LoanImportDialog.tsx`** — কিছু করতে হবে না; trigger import সময়ও fire করবে।

### আচরণ সারাংশ

| পরিস্থিতি | Status আচরণ |
|---|---|
| নতুন loan create | trigger অটো সেট |
| Excel import | trigger অটো সেট |
| `loan_amount` edit | trigger reset করবে |
| অন্য field edit (without loan_amount) | manual status অপরিবর্তিত |
| Admin "Change Status" dialog | manual override কাজ করবে |

### প্রভাবিত ফাইল
1. `supabase-migration-v11-auto-status.sql` (নতুন)
2. `src/components/loans/LoanForm.tsx` (status field hide + note)

