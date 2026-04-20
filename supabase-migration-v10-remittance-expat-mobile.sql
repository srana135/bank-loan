-- ============================================================
-- Migration v10: Add expat_mobile to remittance_profiles
-- ============================================================

alter table public.remittance_profiles
  add column if not exists expat_mobile text;

create index if not exists idx_remittance_expat_mobile
  on public.remittance_profiles (expat_mobile);

select 'Migration v10 (Remittance expat_mobile) applied' as status;
