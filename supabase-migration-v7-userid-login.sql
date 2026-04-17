-- Migration V7: Allow anon User-ID → email resolution for login
-- ============================================================
-- The `profiles` table has RLS that requires authentication, so
-- a not-yet-logged-in user cannot look up their email by User ID
-- (this broke User-ID login). This SECURITY DEFINER function
-- exposes ONLY the email for an exact user_id match — nothing else.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_email_by_user_id(_user_id text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email
  FROM public.profiles
  WHERE user_id = _user_id
    AND is_active = true
  LIMIT 1
$$;

-- Allow both anon (login screen) and authenticated callers
GRANT EXECUTE ON FUNCTION public.get_email_by_user_id(text) TO anon, authenticated;

SELECT 'Migration V7 (user-id login RPC) complete' AS status;
