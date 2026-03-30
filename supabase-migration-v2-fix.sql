-- ============================================================
-- V2 MIGRATION FIX — Run this in Supabase SQL Editor
-- This fixes the RLS policy syntax errors and adds missing parts
-- ============================================================

-- 1. Add missing columns to existing tables (safe — IF NOT EXISTS)
-- ============================================================

-- Disbursement fields on loans
ALTER TABLE public.loans ADD COLUMN IF NOT EXISTS disbursement_date date;
ALTER TABLE public.loans ADD COLUMN IF NOT EXISTS disbursed_loan_amount numeric default 0;

-- Extra profile fields
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS can_access_all_branches boolean default false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS language_preference text default 'bn';

-- New users default inactive
ALTER TABLE public.profiles ALTER COLUMN is_active SET DEFAULT false;

-- Update the trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, is_active)
  VALUES (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    false
  );
  RETURN new;
END;
$$;

-- 2. New tables (safe — IF NOT EXISTS)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.loan_recoveries (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  loan_id uuid REFERENCES public.loans(id) ON DELETE CASCADE NOT NULL,
  recovery_date date NOT NULL,
  recovered_amount numeric NOT NULL DEFAULT 0,
  recovery_type text DEFAULT 'Cash',
  note text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lawyers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  mobile text,
  email text,
  specialization text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.legal_cases (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  loan_id uuid REFERENCES public.loans(id),
  case_number text NOT NULL,
  case_type text NOT NULL DEFAULT 'Artha Rin',
  court_name text,
  filing_date date,
  status text DEFAULT 'active',
  plaintiff_name text,
  defendant_name text,
  lawyer_id uuid REFERENCES public.lawyers(id),
  branch_id uuid REFERENCES public.branches(id),
  description text,
  claim_amount numeric default null,
  next_date date default null,
  remarks text default null,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.legal_case_orders (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id uuid REFERENCES public.legal_cases(id) ON DELETE CASCADE NOT NULL,
  order_date date NOT NULL,
  order_summary text NOT NULL,
  next_date date,
  order_type text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name text NOT NULL,
  record_id text NOT NULL,
  action text NOT NULL,
  old_value jsonb,
  new_value jsonb,
  performed_by uuid REFERENCES auth.users(id),
  performed_at timestamptz DEFAULT now()
);

-- 3. Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_recoveries_loan ON public.loan_recoveries(loan_id);
CREATE INDEX IF NOT EXISTS idx_legal_cases_branch ON public.legal_cases(branch_id);
CREATE INDEX IF NOT EXISTS idx_legal_cases_loan ON public.legal_cases(loan_id);
CREATE INDEX IF NOT EXISTS idx_case_orders_case ON public.legal_case_orders(case_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table ON public.audit_logs(table_name);

-- 4. Triggers
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_legal_cases_updated') THEN
    CREATE TRIGGER on_legal_cases_updated BEFORE UPDATE ON public.legal_cases
      FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
  END IF;
END $$;

-- 5. RLS — Enable
-- ============================================================
ALTER TABLE public.loan_recoveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lawyers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_case_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies (DROP IF EXISTS then CREATE to be idempotent)
-- ============================================================

-- loan_recoveries
DROP POLICY IF EXISTS "Admin can manage recoveries" ON public.loan_recoveries;
CREATE POLICY "Admin can manage recoveries"
  ON public.loan_recoveries FOR ALL TO authenticated
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "Manager can manage own branch recoveries" ON public.loan_recoveries;
CREATE POLICY "Manager can manage own branch recoveries"
  ON public.loan_recoveries FOR ALL TO authenticated
  USING (
    public.get_my_role() = 'manager'
    AND loan_id IN (SELECT id FROM public.loans WHERE branch_id = public.get_my_branch_id())
  )
  WITH CHECK (
    public.get_my_role() = 'manager'
    AND loan_id IN (SELECT id FROM public.loans WHERE branch_id = public.get_my_branch_id())
  );

DROP POLICY IF EXISTS "Employee can read recoveries" ON public.loan_recoveries;
CREATE POLICY "Employee can read recoveries"
  ON public.loan_recoveries FOR SELECT TO authenticated
  USING (public.get_my_role() = 'employee');

-- lawyers
DROP POLICY IF EXISTS "Authenticated can read lawyers" ON public.lawyers;
CREATE POLICY "Authenticated can read lawyers"
  ON public.lawyers FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admin can manage lawyers" ON public.lawyers;
CREATE POLICY "Admin can manage lawyers"
  ON public.lawyers FOR ALL TO authenticated
  USING (public.get_my_role() IN ('admin', 'manager'))
  WITH CHECK (public.get_my_role() IN ('admin', 'manager'));

-- legal_cases
DROP POLICY IF EXISTS "Admin can manage all cases" ON public.legal_cases;
CREATE POLICY "Admin can manage all cases"
  ON public.legal_cases FOR ALL TO authenticated
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "Manager can manage own branch cases" ON public.legal_cases;
CREATE POLICY "Manager can manage own branch cases"
  ON public.legal_cases FOR ALL TO authenticated
  USING (
    public.get_my_role() = 'manager'
    AND branch_id = public.get_my_branch_id()
  )
  WITH CHECK (
    public.get_my_role() = 'manager'
    AND branch_id = public.get_my_branch_id()
  );

DROP POLICY IF EXISTS "Employee can read cases" ON public.legal_cases;
CREATE POLICY "Employee can read cases"
  ON public.legal_cases FOR SELECT TO authenticated
  USING (public.get_my_role() = 'employee');

-- legal_case_orders (FIXED — no USING on INSERT)
DROP POLICY IF EXISTS "Authenticated can read orders" ON public.legal_case_orders;
CREATE POLICY "Authenticated can read orders"
  ON public.legal_case_orders FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admin/Manager can insert orders" ON public.legal_case_orders;
CREATE POLICY "Admin/Manager can insert orders"
  ON public.legal_case_orders FOR INSERT TO authenticated
  WITH CHECK (public.get_my_role() IN ('admin', 'manager'));

DROP POLICY IF EXISTS "Employee can update order next date" ON public.legal_case_orders;
CREATE POLICY "Employee can update order next date"
  ON public.legal_case_orders FOR UPDATE TO authenticated
  USING (public.get_my_role() = 'employee');

DROP POLICY IF EXISTS "Employee can add case orders" ON public.legal_case_orders;
CREATE POLICY "Employee can add case orders"
  ON public.legal_case_orders FOR INSERT TO authenticated
  WITH CHECK (public.get_my_role() = 'employee');

-- audit_logs (FIXED — separate SELECT and INSERT policies, no USING on INSERT)
DROP POLICY IF EXISTS "Admin can read audit logs" ON public.audit_logs;
CREATE POLICY "Admin can read audit logs"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "Authenticated can insert audit logs" ON public.audit_logs;
CREATE POLICY "Authenticated can insert audit logs"
  ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admin can delete audit logs" ON public.audit_logs;
CREATE POLICY "Admin can delete audit logs"
  ON public.audit_logs FOR DELETE TO authenticated
  USING (public.get_my_role() = 'admin');

-- 7. Storage: avatars bucket
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
CREATE POLICY "Users can update own avatar"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Anyone can read avatars" ON storage.objects;
CREATE POLICY "Anyone can read avatars"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'avatars');

-- 8. Delete policy for profiles (admin only)
-- ============================================================
DROP POLICY IF EXISTS "Admin can delete profiles" ON public.profiles;
CREATE POLICY "Admin can delete profiles"
  ON public.profiles FOR DELETE TO authenticated
  USING (public.get_my_role() = 'admin');

-- 9. Realtime for new tables (ignore errors if already added)
-- ============================================================
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.legal_cases;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.loan_recoveries;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
