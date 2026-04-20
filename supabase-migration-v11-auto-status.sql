-- ============================================================
-- Migration v11: Auto-set account_status based on disbursed_loan_amount
-- Logic:
--   disbursed_loan_amount % 1 = 0  -> 'New Loan' (loan_category='new')
--   else                           -> 'RS-1'     (loan_category='rescheduled')
-- Manual override via UI still allowed (trigger only fires on
-- INSERT or when disbursed_loan_amount actually changes).
-- ============================================================

-- 1. Ensure NUMERIC type
ALTER TABLE public.loans
  ALTER COLUMN disbursed_loan_amount TYPE numeric USING disbursed_loan_amount::numeric;

-- 2. Backfill existing rows (only auto-managed status values)
UPDATE public.loans
SET account_status = CASE
      WHEN (disbursed_loan_amount % 1) = 0 THEN 'New Loan'
      ELSE 'RS-1' END,
    loan_category = CASE
      WHEN (disbursed_loan_amount % 1) = 0 THEN 'new'
      ELSE 'rescheduled' END
WHERE disbursed_loan_amount IS NOT NULL
  AND (account_status IS NULL
       OR account_status IN ('New Loan','RS-1','active','New',''));

-- 3. Trigger function
CREATE OR REPLACE FUNCTION public.set_account_status_by_amount()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.disbursed_loan_amount IS NOT NULL THEN
    IF (NEW.disbursed_loan_amount % 1) = 0 THEN
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

-- 4. Triggers
DROP TRIGGER IF EXISTS trg_auto_status_insert ON public.loans;
CREATE TRIGGER trg_auto_status_insert
  BEFORE INSERT ON public.loans
  FOR EACH ROW
  EXECUTE FUNCTION public.set_account_status_by_amount();

DROP TRIGGER IF EXISTS trg_auto_status_update ON public.loans;
CREATE TRIGGER trg_auto_status_update
  BEFORE UPDATE OF disbursed_loan_amount ON public.loans
  FOR EACH ROW
  WHEN (OLD.disbursed_loan_amount IS DISTINCT FROM NEW.disbursed_loan_amount)
  EXECUTE FUNCTION public.set_account_status_by_amount();

SELECT 'Migration v11 (Auto account_status by disbursed_loan_amount) applied' AS status;
