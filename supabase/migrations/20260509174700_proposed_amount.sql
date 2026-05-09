-- Add proposed_amount column to loan_proposals
alter table public.loan_proposals
  add column if not exists proposed_amount numeric;
