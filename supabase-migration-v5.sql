-- Migration v5: Add expiry_date to loans, add latest_order to legal_cases
-- Run this in Supabase SQL Editor

-- 1. Add expiry_date column to loans
ALTER TABLE public.loans ADD COLUMN IF NOT EXISTS expiry_date date;

-- 2. Add latest_order_summary to legal_cases for display in list
ALTER TABLE public.legal_cases ADD COLUMN IF NOT EXISTS latest_order_summary text;
ALTER TABLE public.legal_cases ADD COLUMN IF NOT EXISTS latest_order_date date;

-- 3. Enable realtime for loan_recoveries if not already
ALTER PUBLICATION supabase_realtime ADD TABLE loan_recoveries;
