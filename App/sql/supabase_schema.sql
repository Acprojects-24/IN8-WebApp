-- Supabase schema for migrating from Firebase (Firestore)

-- Enable required extensions
create extension if not exists pgcrypto;

-- USERS table: profile linked to auth users
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  uid text unique not null,
  email text not null,
  first_name text,
  last_name text,
  role text default 'user',
  created_at timestamptz not null default now(),
  auth_provider text
);

-- Ensure role column exists for existing deployments
alter table public.users add column if not exists role text not null default 'user';
update public.users set role = 'user' where role is null;

-- Ensure is_active exists for enable/disable functionality
alter table public.users add column if not exists is_active boolean not null default true;

-- CONFIG_ROLES: single row keyed by 'roles'
create table if not exists public.config_roles (
  id text primary key,
  admin_email text
);

insert into public.config_roles (id, admin_email)
values ('roles', null)
on conflict (id) do nothing;

-- MEETINGS
create table if not exists public.meetings (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  purpose text,
  password text,
  is_scheduled boolean not null default false,
  scheduled_for timestamptz,
  host_name text,
  start_with_audio_muted boolean not null default false,
  start_with_video_muted boolean not null default false,
  prejoin_page_enabled boolean not null default false,
  created_by text not null,
  created_at timestamptz not null default now(),
  host_token text,
  host_participant_id text,
  whiteboard_open boolean not null default false,
  admin_ids text[] default '{}',
  admin_display_names text[] default '{}',
  banned_display_names text[] default '{}'
);

-- MEETING ACTIONS (queue)
create table if not exists public.meeting_actions (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  type text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  requested_by text,
  target_participant_id text,
  platform text,
  stream_key text,
  rtmp_url text,
  error text
);

-- Enable Row Level Security (tighten policies for production)
alter table public.users enable row level security;
alter table public.config_roles enable row level security;
alter table public.meetings enable row level security;
alter table public.meeting_actions enable row level security;

-- USERS policies
do $$ begin
  create policy "users readable by self"
  on public.users for select using (auth.uid()::text = uid);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "users insert by self"
  on public.users for insert with check (auth.uid()::text = uid);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "users update by self"
  on public.users for update using (auth.uid()::text = uid);
exception when duplicate_object then null; end $$;

-- Admin-wide policies for users table (admin email defined in config_roles)
do $$ begin
  create policy "admin can read users"
  on public.users for select
  using (
    exists (
      select 1 from public.config_roles cr
      where lower(cr.admin_email) = lower(auth.jwt() ->> 'email')
    )
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "admin can update users"
  on public.users for update
  using (
    exists (
      select 1 from public.config_roles cr
      where lower(cr.admin_email) = lower(auth.jwt() ->> 'email')
    )
  )
  with check (
    exists (
      select 1 from public.config_roles cr
      where lower(cr.admin_email) = lower(auth.jwt() ->> 'email')
    )
  );
exception when duplicate_object then null; end $$;

-- Role-based admin policies: allow any profile with role='admin' to manage users
-- Replace recursive policies with SECURITY DEFINER function to avoid RLS recursion
do $$ begin
  drop policy if exists "admins by role can read users" on public.users;
  drop policy if exists "admins by role can update users" on public.users;
  drop policy if exists "admins by role can delete users" on public.users;
exception when undefined_object then null; end $$;

-- Helper: returns true if current auth.uid() has role 'admin' in users table
create or replace function public.is_admin_by_role()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users u
    where u.uid = auth.uid()::text
      and lower(coalesce(u.role, 'user')) = 'admin'
  );
$$;

do $$ begin
  create policy "admins by role can read users"
  on public.users for select
  using (public.is_admin_by_role());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "admins by role can update users"
  on public.users for update
  using (public.is_admin_by_role())
  with check (public.is_admin_by_role());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "admins by role can delete users"
  on public.users for delete
  using (public.is_admin_by_role());
exception when duplicate_object then null; end $$;

-- CONFIG_ROLES policies (read for authenticated)
do $$ begin
  create policy "config read for authenticated"
  on public.config_roles for select using (auth.role() = 'authenticated');
exception when duplicate_object then null; end $$;

-- MEETINGS policies
do $$ begin
  create policy "meetings read for authenticated"
  on public.meetings for select using (auth.role() = 'authenticated');
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "meetings insert by authenticated"
  on public.meetings for insert with check (auth.role() = 'authenticated');
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "meetings update by authenticated"
  on public.meetings for update using (auth.role() = 'authenticated');
exception when duplicate_object then null; end $$;

-- MEETING_ACTIONS policies
do $$ begin
  create policy "actions read for authenticated"
  on public.meeting_actions for select using (auth.role() = 'authenticated');
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "actions insert by authenticated"
  on public.meeting_actions for insert with check (auth.role() = 'authenticated');
exception when duplicate_object then null; end $$;

-- Realtime: enable from Dashboard → Database → Replication → Configure

-- UPCOMING MEETINGS view (read-through to meetings via RLS)
create or replace view public.upcoming_meetings as
  select
    id,
    name,
    purpose,
    scheduled_for,
    created_by,
    created_at
  from public.meetings
  where
    is_scheduled = true
    and scheduled_for is not null
    and scheduled_for > now();

-- Helpful indexes for scheduling queries
create index if not exists idx_meetings_scheduled_for
  on public.meetings (scheduled_for)
  where is_scheduled = true and scheduled_for is not null;

create index if not exists idx_meetings_created_by
  on public.meetings (created_by);

