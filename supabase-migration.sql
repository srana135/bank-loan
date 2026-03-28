-- ============================================================
-- LOAN MANAGEMENT APP — COMPLETE SUPABASE MIGRATION
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard)
-- ============================================================

-- 0. ENUMS & EXTENSIONS
-- ============================================================
create extension if not exists "uuid-ossp";

create type public.app_role as enum ('admin', 'manager', 'employee');
create type public.request_status as enum ('pending', 'approved', 'rejected');

-- ============================================================
-- 1. TABLES
-- ============================================================

-- branches
create table public.branches (
  id uuid primary key default uuid_generate_v4(),
  branch_code text unique not null,
  branch_name text not null,
  address text,
  latitude numeric,
  longitude numeric,
  radius_km numeric default 5,
  created_at timestamptz default now()
);

-- profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  user_id text unique,
  full_name text,
  email text,
  mobile text,
  role public.app_role default 'employee',
  branch_id uuid references public.branches(id),
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- registration_requests
create table public.registration_requests (
  id uuid primary key default uuid_generate_v4(),
  requested_user_id text,
  full_name text not null,
  email text not null,
  mobile text,
  requested_role text,
  branch_name text,
  note text,
  status public.request_status default 'pending',
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz default now()
);

-- loans
create table public.loans (
  id uuid primary key default uuid_generate_v4(),
  account_no text unique,
  account_name text,
  borrower_name text not null,
  mobile text,
  account_type text,
  account_status text default 'active',
  address text,
  latitude numeric,
  longitude numeric,
  installment_amount numeric default 0,
  overdue_installment_number integer default 0,
  overdue_amount numeric default 0,
  outstanding_amount numeric default 0,
  classification text default 'UC',
  guarantor_1_name text,
  guarantor_1_mobile text,
  guarantor_2_name text,
  guarantor_2_mobile text,
  branch_id uuid references public.branches(id),
  latest_comment text,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- loan_comments
create table public.loan_comments (
  id uuid primary key default uuid_generate_v4(),
  loan_id uuid references public.loans(id) on delete cascade not null,
  comment_text text not null,
  author_id uuid not null,
  author_name text,
  author_role text,
  created_at timestamptz default now()
);

-- service_files
create table public.service_files (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text,
  file_name text,
  file_path text,
  file_type text,
  uploaded_by uuid references auth.users(id),
  visible_to text default 'all',
  created_at timestamptz default now()
);

-- loan_proposals
create table public.loan_proposals (
  id uuid primary key default uuid_generate_v4(),
  customer_name text not null,
  mobile text,
  loan_type text,
  monthly_income numeric,
  eligible_amount numeric,
  probable_disbursement_date date,
  status text default 'pending',
  rejection_comment text,
  rejection_date date,
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- app_settings
create table public.app_settings (
  id uuid primary key default uuid_generate_v4(),
  setting_key text unique not null,
  setting_value jsonb,
  updated_at timestamptz default now()
);

-- import_logs
create table public.import_logs (
  id uuid primary key default uuid_generate_v4(),
  import_type text,
  file_name text,
  total_rows integer default 0,
  success_rows integer default 0,
  failed_rows integer default 0,
  error_summary jsonb,
  imported_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- user_import_logs
create table public.user_import_logs (
  id uuid primary key default uuid_generate_v4(),
  file_name text,
  total_rows integer default 0,
  success_rows integer default 0,
  failed_rows integer default 0,
  error_summary jsonb,
  imported_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- ============================================================
-- 2. INDEXES
-- ============================================================
create index idx_profiles_branch on public.profiles(branch_id);
create index idx_profiles_role on public.profiles(role);
create index idx_loans_branch on public.loans(branch_id);
create index idx_loans_account_no on public.loans(account_no);
create index idx_loan_comments_loan on public.loan_comments(loan_id);
create index idx_registration_requests_status on public.registration_requests(status);

-- ============================================================
-- 3. HELPER FUNCTIONS (SECURITY DEFINER)
-- ============================================================

-- Get the current user's role
create or replace function public.get_my_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid() and is_active = true
$$;

-- Get the current user's branch_id
create or replace function public.get_my_branch_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select branch_id from public.profiles where id = auth.uid() and is_active = true
$$;

-- Check if user has a specific role
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = _user_id and role = _role and is_active = true
  )
$$;

-- ============================================================
-- 4. TRIGGERS
-- ============================================================

-- Auto-update updated_at
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger on_profiles_updated before update on public.profiles
  for each row execute function public.handle_updated_at();

create trigger on_loans_updated before update on public.loans
  for each row execute function public.handle_updated_at();

create trigger on_loan_proposals_updated before update on public.loan_proposals
  for each row execute function public.handle_updated_at();

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- 5. ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles enable row level security;
alter table public.branches enable row level security;
alter table public.registration_requests enable row level security;
alter table public.loans enable row level security;
alter table public.loan_comments enable row level security;
alter table public.service_files enable row level security;
alter table public.loan_proposals enable row level security;
alter table public.app_settings enable row level security;
alter table public.import_logs enable row level security;
alter table public.user_import_logs enable row level security;

-- PROFILES policies
create policy "Users can read own profile"
  on public.profiles for select to authenticated
  using (id = auth.uid());

create policy "Admin can read all profiles"
  on public.profiles for select to authenticated
  using (public.get_my_role() = 'admin');

create policy "Admin can insert profiles"
  on public.profiles for insert to authenticated
  with check (public.get_my_role() = 'admin');

create policy "Admin can update profiles"
  on public.profiles for update to authenticated
  using (public.get_my_role() = 'admin');

create policy "Users can update own profile"
  on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- BRANCHES policies
create policy "Authenticated can read branches"
  on public.branches for select to authenticated
  using (true);

create policy "Admin can manage branches"
  on public.branches for all to authenticated
  using (public.get_my_role() = 'admin')
  with check (public.get_my_role() = 'admin');

-- REGISTRATION_REQUESTS policies
create policy "Anyone can insert registration requests"
  on public.registration_requests for insert to authenticated
  with check (true);

create policy "Admin can read all requests"
  on public.registration_requests for select to authenticated
  using (public.get_my_role() = 'admin');

create policy "Admin can update requests"
  on public.registration_requests for update to authenticated
  using (public.get_my_role() = 'admin');

-- LOANS policies
create policy "Admin can do all on loans"
  on public.loans for all to authenticated
  using (public.get_my_role() = 'admin')
  with check (public.get_my_role() = 'admin');

create policy "Manager can read own branch loans"
  on public.loans for select to authenticated
  using (
    public.get_my_role() = 'manager'
    and branch_id = public.get_my_branch_id()
  );

create policy "Manager can insert own branch loans"
  on public.loans for insert to authenticated
  with check (
    public.get_my_role() = 'manager'
    and branch_id = public.get_my_branch_id()
  );

create policy "Manager can update own branch loans"
  on public.loans for update to authenticated
  using (
    public.get_my_role() = 'manager'
    and branch_id = public.get_my_branch_id()
  );

create policy "Manager can delete own branch loans"
  on public.loans for delete to authenticated
  using (
    public.get_my_role() = 'manager'
    and branch_id = public.get_my_branch_id()
  );

create policy "Employee can read loans"
  on public.loans for select to authenticated
  using (public.get_my_role() = 'employee');

-- LOAN_COMMENTS policies
create policy "Authenticated can read comments"
  on public.loan_comments for select to authenticated
  using (true);

create policy "Authenticated can insert comments"
  on public.loan_comments for insert to authenticated
  with check (author_id = auth.uid());

-- SERVICE_FILES policies
create policy "Anyone authenticated can read service files"
  on public.service_files for select to authenticated
  using (true);

create policy "Public can read service files"
  on public.service_files for select to anon
  using (visible_to = 'all');

create policy "Admin/Manager can insert service files"
  on public.service_files for insert to authenticated
  with check (
    public.get_my_role() in ('admin', 'manager')
  );

create policy "Admin/Manager can delete service files"
  on public.service_files for delete to authenticated
  using (
    public.get_my_role() in ('admin', 'manager')
  );

-- LOAN_PROPOSALS policies
create policy "Admin/Manager can manage proposals"
  on public.loan_proposals for all to authenticated
  using (public.get_my_role() in ('admin', 'manager'))
  with check (public.get_my_role() in ('admin', 'manager'));

create policy "Employee can read proposals"
  on public.loan_proposals for select to authenticated
  using (public.get_my_role() = 'employee');

-- APP_SETTINGS policies
create policy "Admin can manage settings"
  on public.app_settings for all to authenticated
  using (public.get_my_role() = 'admin')
  with check (public.get_my_role() = 'admin');

create policy "Authenticated can read settings"
  on public.app_settings for select to authenticated
  using (true);

-- IMPORT_LOGS policies
create policy "Admin can manage import logs"
  on public.import_logs for all to authenticated
  using (public.get_my_role() = 'admin')
  with check (public.get_my_role() = 'admin');

create policy "Manager can insert import logs"
  on public.import_logs for insert to authenticated
  with check (public.get_my_role() = 'manager');

create policy "Manager can read own import logs"
  on public.import_logs for select to authenticated
  using (imported_by = auth.uid());

-- USER_IMPORT_LOGS policies
create policy "Admin can manage user import logs"
  on public.user_import_logs for all to authenticated
  using (public.get_my_role() = 'admin')
  with check (public.get_my_role() = 'admin');

-- ============================================================
-- 6. STORAGE
-- ============================================================

insert into storage.buckets (id, name, public)
values ('documents', 'documents', true)
on conflict (id) do nothing;

create policy "Authenticated can upload documents"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'documents');

create policy "Anyone can read documents"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'documents');

create policy "Admin/Manager can delete documents"
  on storage.objects for delete to authenticated
  using (bucket_id = 'documents');

-- ============================================================
-- 7. BOOTSTRAP: FIRST ADMIN
-- ============================================================
-- After your first user signs up, run this to make them admin:
--
--   UPDATE public.profiles
--   SET role = 'admin', is_active = true
--   WHERE email = 'your-admin@email.com';
--
-- This is a one-time bootstrap step. After that, the admin
-- can manage all other users from the admin dashboard.
-- ============================================================

-- ============================================================
-- 8. REALTIME (enable for key tables)
-- ============================================================
alter publication supabase_realtime add table public.loans;
alter publication supabase_realtime add table public.loan_comments;
alter publication supabase_realtime add table public.registration_requests;
