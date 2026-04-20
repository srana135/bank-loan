-- ============================================================
-- Migration v9: Remittance Profiles Module
-- ============================================================

create table if not exists public.remittance_profiles (
  id uuid primary key default gen_random_uuid(),

  -- Linking
  loan_id uuid references public.loans(id) on delete set null,
  branch_id uuid references public.branches(id),

  -- Client basic info
  account_holder_name text not null,
  account_number text,
  mobile_number text not null,

  -- Expat family info
  expat_name text,
  expat_relation text check (expat_relation is null or expat_relation in ('Father','Son','Brother','Husband','Other')),
  country text,
  city text,
  years_abroad numeric(4,1),

  -- Remittance details
  sends_money boolean default true,
  frequency text check (frequency is null or frequency in ('Monthly','Irregular')),
  average_amount numeric(14,2),

  -- Channels (multi-select): Bank Transfer, bKash, Nagad, Rocket, Exchange House, Hand Carry
  channels text[] default '{}'::text[],

  -- Receiver info (optional)
  receiver_name text,
  receiver_mobile text,
  receiver_method text,

  -- Analysis
  stability text check (stability is null or stability in ('Stable','Medium','Uncertain')),

  -- System
  notes text,
  collected_by uuid references auth.users(id),
  collected_by_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_remittance_loan on public.remittance_profiles (loan_id);
create index if not exists idx_remittance_branch on public.remittance_profiles (branch_id);
create index if not exists idx_remittance_mobile on public.remittance_profiles (mobile_number);
create index if not exists idx_remittance_name on public.remittance_profiles (account_holder_name);
create index if not exists idx_remittance_country on public.remittance_profiles (country);

drop trigger if exists trg_remittance_updated on public.remittance_profiles;
create trigger trg_remittance_updated before update on public.remittance_profiles
  for each row execute function public.handle_updated_at();

-- ============================================================
-- Row Level Security — login required, branch-scoped
-- ============================================================
alter table public.remittance_profiles enable row level security;

drop policy if exists "remittance_select" on public.remittance_profiles;
create policy "remittance_select" on public.remittance_profiles
  for select to authenticated
  using (
    public.get_my_role() = 'admin'
    or branch_id = public.get_my_branch_id()
    or branch_id is null
  );

drop policy if exists "remittance_insert" on public.remittance_profiles;
create policy "remittance_insert" on public.remittance_profiles
  for insert to authenticated
  with check (
    public.get_my_role() = 'admin'
    or branch_id = public.get_my_branch_id()
    or branch_id is null
  );

drop policy if exists "remittance_update" on public.remittance_profiles;
create policy "remittance_update" on public.remittance_profiles
  for update to authenticated
  using (
    public.get_my_role() = 'admin'
    or branch_id = public.get_my_branch_id()
  );

drop policy if exists "remittance_delete" on public.remittance_profiles;
create policy "remittance_delete" on public.remittance_profiles
  for delete to authenticated
  using (public.get_my_role() = 'admin');

-- Realtime
alter publication supabase_realtime add table public.remittance_profiles;

select 'Migration v9 (Remittance Profiles) applied' as status;
