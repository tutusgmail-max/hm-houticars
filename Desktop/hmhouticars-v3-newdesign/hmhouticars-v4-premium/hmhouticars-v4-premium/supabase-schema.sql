-- ============================================================
--  HM HOUTI CARS – Supabase Schema
--  Run this in your Supabase SQL Editor
-- ============================================================

-- 1. PROFILES (extends Supabase auth.users)
create table if not exists public.profiles (
  id          uuid references auth.users(id) on delete cascade primary key,
  full_name   text,
  phone       text,
  email       text,
  role        text not null default 'client', -- 'client' | 'admin'
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, full_name, phone)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'phone'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. RESERVATIONS
create table if not exists public.reservations (
  id               uuid default gen_random_uuid() primary key,
  ref              text unique not null,
  user_id          uuid references auth.users(id) on delete set null,
  car_id           integer not null,
  car_name         text not null,
  car_price        integer not null,
  pickup_location  text not null,
  return_location  text not null,
  start_date       date not null,
  end_date         date not null,
  days             integer not null,
  total            integer not null,
  payment_method   text not null default 'cash',
  notes            text,
  customer_name    text,
  customer_email   text,
  customer_phone   text,
  status           text not null default 'pending', -- pending|confirmed|completed|cancelled
  documents        jsonb default '{}'::jsonb,       -- { cin_recto, cin_verso, permis_recto, permis_verso }
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- 3. ROW LEVEL SECURITY

-- Profiles: users see only their own; admins see all
alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Admins can view all profiles"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Reservations: users see their own; admins see all
alter table public.reservations enable row level security;

create policy "Users can view own reservations"
  on public.reservations for select
  using (auth.uid() = user_id);

create policy "Users can create reservations"
  on public.reservations for insert
  with check (auth.uid() = user_id);

create policy "Authenticated read availability dates"
  on public.reservations for select
  to authenticated
  using (status in ('pending', 'confirmed'));

create policy "Admins can view all reservations"
  on public.reservations for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "Admins can update all reservations"
  on public.reservations for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- 3b. USER DOCUMENTS (single table — CIN + permis, one row per doc type)
create table if not exists public.user_documents (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  doc_type      text not null check (
    doc_type in ('cin_recto', 'cin_verso', 'permis_recto', 'permis_verso')
  ),
  storage_path  text not null,
  uploaded_at   timestamptz not null default now(),
  unique (user_id, doc_type)
);

alter table public.user_documents enable row level security;

create policy "Users select own documents"
  on public.user_documents for select
  using (auth.uid() = user_id);

create policy "Users insert own documents"
  on public.user_documents for insert
  with check (auth.uid() = user_id);

create policy "Users update own documents"
  on public.user_documents for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 4. STORAGE BUCKET for documents (PRIVATE)
insert into storage.buckets (id, name, public)
values ('documents', 'documents', true)
on conflict (id) do update set public = true;

-- Users can upload their own docs
create policy "Users upload own docs"
  on storage.objects for insert
  with check (
    bucket_id = 'documents' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can view their own docs
create policy "Users view own docs"
  on storage.objects for select
  using (
    bucket_id = 'documents' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Admins can view all docs
create policy "Admins view all docs"
  on storage.objects for select
  using (
    bucket_id = 'documents' and
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "Users update own docs"
  on storage.objects for update
  using (
    bucket_id = 'documents' and
    (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'documents' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users delete own docs"
  on storage.objects for delete
  using (
    bucket_id = 'documents' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- 5. MAKE YOURSELF ADMIN
-- After signing up, run this to give yourself admin rights:
-- update public.profiles set role = 'admin' where email = 'your@email.com';

-- ============================================================
-- v3 ADDITIONS
-- ============================================================

-- 6. AVATARS STORAGE BUCKET
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Users can upload their own avatar
create policy "Users upload own avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Anyone can view avatars (bucket is public)
create policy "Avatars are publicly viewable"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- Users can update/replace their own avatar
create policy "Users update own avatar"
  on storage.objects for update
  using (
    bucket_id = 'avatars' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- 7. Add avatar_url column to profiles (if not present)
alter table public.profiles
  add column if not exists avatar_url text;

alter table public.profiles
  add column if not exists identity_documents jsonb default '{}'::jsonb;

-- 8. MAKE YOURSELF ADMIN (run after first signup)
-- update public.profiles set role = 'admin' where email = 'your@email.com';

-- 9. Reload PostgREST schema cache (run after column/policy changes)
-- NOTIFY pgrst, 'reload schema';
