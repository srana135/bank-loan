-- Allow decimal due/overdue installments
ALTER TABLE public.loans
  ALTER COLUMN overdue_installment_number TYPE numeric(10,2) USING overdue_installment_number::numeric;
