-- ============================================================
-- Migration V3: Enhancement Features
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Add officer_id to legal_cases
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='legal_cases' AND column_name='officer_id') THEN
    ALTER TABLE public.legal_cases ADD COLUMN officer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 2. Add proposed_repayment_date to loan_comments
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='loan_comments' AND column_name='proposed_repayment_date') THEN
    ALTER TABLE public.loan_comments ADD COLUMN proposed_repayment_date DATE;
  END IF;
END $$;

-- 3. Add latest_proposed_date to loans
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='loans' AND column_name='latest_proposed_date') THEN
    ALTER TABLE public.loans ADD COLUMN latest_proposed_date DATE;
  END IF;
END $$;

-- 4. Create legal_notices table
CREATE TABLE IF NOT EXISTS public.legal_notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID REFERENCES public.loans(id) ON DELETE SET NULL,
  borrower_name TEXT,
  organization_name TEXT,
  account_no TEXT,
  notice_type TEXT NOT NULL DEFAULT 'Legal Notice',
  sent_date DATE,
  receipt_status TEXT DEFAULT 'pending' CHECK (receipt_status IN ('received','returned','pending')),
  receipt_date DATE,
  case_filing_deadline DATE,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. RLS for legal_notices
ALTER TABLE public.legal_notices ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='legal_notices' AND policyname='Authenticated can view legal notices') THEN
    CREATE POLICY "Authenticated can view legal notices" ON public.legal_notices FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='legal_notices' AND policyname='Authenticated can insert legal notices') THEN
    CREATE POLICY "Authenticated can insert legal notices" ON public.legal_notices FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='legal_notices' AND policyname='Authenticated can update legal notices') THEN
    CREATE POLICY "Authenticated can update legal notices" ON public.legal_notices FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='legal_notices' AND policyname='Authenticated can delete legal notices') THEN
    CREATE POLICY "Authenticated can delete legal notices" ON public.legal_notices FOR DELETE TO authenticated USING (true);
  END IF;
END $$;

-- 6. Ensure delete/update policies exist for loan_comments
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='loan_comments' AND policyname='Authenticated can update loan comments') THEN
    CREATE POLICY "Authenticated can update loan comments" ON public.loan_comments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='loan_comments' AND policyname='Authenticated can delete loan comments') THEN
    CREATE POLICY "Authenticated can delete loan comments" ON public.loan_comments FOR DELETE TO authenticated USING (true);
  END IF;
END $$;

-- 7. Ensure delete/update policies exist for loan_recoveries
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='loan_recoveries' AND policyname='Authenticated can update loan recoveries') THEN
    CREATE POLICY "Authenticated can update loan recoveries" ON public.loan_recoveries FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='loan_recoveries' AND policyname='Authenticated can delete loan recoveries') THEN
    CREATE POLICY "Authenticated can delete loan recoveries" ON public.loan_recoveries FOR DELETE TO authenticated USING (true);
  END IF;
END $$;

-- 8. updated_at trigger for legal_notices
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='legal_notices_updated_at') THEN
    CREATE TRIGGER legal_notices_updated_at BEFORE UPDATE ON public.legal_notices
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
  END IF;
END $$;

-- 9. Enable realtime for legal_notices
ALTER PUBLICATION supabase_realtime ADD TABLE public.legal_notices;

-- Done!
SELECT 'Migration V3 complete' AS status;
