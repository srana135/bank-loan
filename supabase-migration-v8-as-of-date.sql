-- Migration v8: As-of date import logic + Loan category + new account status options
-- Run this in Supabase SQL Editor

-- 1. Add new columns to loans
ALTER TABLE public.loans
  ADD COLUMN IF NOT EXISTS data_as_of_date date,
  ADD COLUMN IF NOT EXISTS loan_category text NOT NULL DEFAULT 'new'
    CHECK (loan_category IN ('new', 'rescheduled'));

-- 2. Backfill loan_category based on existing account_status (Option B)
UPDATE public.loans
SET loan_category = 'rescheduled'
WHERE LOWER(COALESCE(account_status, '')) IN ('rs-1', 'rs1', 'special rs', 'special_rs', 'reschedule', 'rescheduled');

-- 3. Migrate existing 'active' status → 'New Loan'
UPDATE public.loans
SET account_status = 'New Loan'
WHERE LOWER(COALESCE(account_status, '')) IN ('active', '');

-- 4. Optional index for category-based queries
CREATE INDEX IF NOT EXISTS idx_loans_loan_category ON public.loans(loan_category);
CREATE INDEX IF NOT EXISTS idx_loans_data_as_of_date ON public.loans(data_as_of_date);
