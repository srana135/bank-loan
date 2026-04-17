-- Migration V6: Security Hardening
-- Fixes:
--   1. legal_notices RLS — restrict by role/branch (was open to all authenticated)
--   2. activity_logs INSERT — enforce user_id = auth.uid() (prevent forged entries)
--   3. documents storage bucket — make private + enforce auth on read
-- Run this in Supabase SQL Editor.

-- ============================================================
-- 1. legal_notices: replace open policies with role/branch-scoped
-- ============================================================
DROP POLICY IF EXISTS "Authenticated can read legal notices" ON public.legal_notices;
DROP POLICY IF EXISTS "Authenticated can insert legal notices" ON public.legal_notices;
DROP POLICY IF EXISTS "Authenticated can update legal notices" ON public.legal_notices;
DROP POLICY IF EXISTS "Authenticated can delete legal notices" ON public.legal_notices;

-- SELECT: admin sees all; manager/employee see own branch
CREATE POLICY "legal_notices_select" ON public.legal_notices
  FOR SELECT TO authenticated
  USING (
    public.get_my_role() = 'admin'
    OR branch_id = public.get_my_branch_id()
  );

-- INSERT: admin anywhere; manager only in own branch
CREATE POLICY "legal_notices_insert" ON public.legal_notices
  FOR INSERT TO authenticated
  WITH CHECK (
    public.get_my_role() = 'admin'
    OR (public.get_my_role() = 'manager' AND branch_id = public.get_my_branch_id())
  );

-- UPDATE: admin anywhere; manager only in own branch
CREATE POLICY "legal_notices_update" ON public.legal_notices
  FOR UPDATE TO authenticated
  USING (
    public.get_my_role() = 'admin'
    OR (public.get_my_role() = 'manager' AND branch_id = public.get_my_branch_id())
  )
  WITH CHECK (
    public.get_my_role() = 'admin'
    OR (public.get_my_role() = 'manager' AND branch_id = public.get_my_branch_id())
  );

-- DELETE: admin only
CREATE POLICY "legal_notices_delete" ON public.legal_notices
  FOR DELETE TO authenticated
  USING (public.get_my_role() = 'admin');

-- ============================================================
-- 2. activity_logs: enforce user_id ownership on insert
-- ============================================================
DROP POLICY IF EXISTS "Authenticated can insert activity logs" ON public.activity_logs;

CREATE POLICY "Authenticated can insert own activity logs" ON public.activity_logs
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- 3. documents storage bucket: make private + signed-URL access
-- ============================================================
UPDATE storage.buckets SET public = false WHERE id = 'documents';

-- Drop any existing permissive object policies on the documents bucket (best-effort)
DROP POLICY IF EXISTS "Public read documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated read documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete documents" ON storage.objects;

-- Authenticated users can read (signed URLs work regardless, but this allows direct authenticated reads)
CREATE POLICY "Authenticated read documents" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'documents');

-- Authenticated users can upload
CREATE POLICY "Authenticated upload documents" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documents');

-- Admin/manager can update or delete
CREATE POLICY "Admin manager update documents" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'documents' AND public.get_my_role() IN ('admin', 'manager'));

CREATE POLICY "Admin manager delete documents" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'documents' AND public.get_my_role() IN ('admin', 'manager'));

SELECT 'Migration V6 (security) complete' AS status;
