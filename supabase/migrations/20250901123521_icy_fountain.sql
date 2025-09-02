-- =============================================
-- 1️⃣ Profiles Table (user info + role)
-- =============================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text unique not null,
  role text default 'user', -- 'user' or 'admin'
  created_at timestamp with time zone default now()
);

-- =============================================
-- 2️⃣ Vaccination Records Table
-- =============================================
create table if not exists public.vaccination_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  vaccine_name text not null,
  dose_number int not null,
  date_given date not null,
  next_due date,
  created_at timestamp with time zone default now()
);

-- =============================================
-- 3️⃣ Reminders Table
-- =============================================
create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  record_id uuid references public.vaccination_records(id) on delete cascade,
  due_date date not null,
  sent boolean default false,
  created_at timestamp with time zone default now()
);

-- =============================================
-- 4️⃣ Trigger: auto-create profile on auth user creation
-- =============================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role, created_at)
  values (new.id, new.email, '', 'user', now())
  on conflict (id) do nothing;

  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- =============================================
-- 5️⃣ Enable Row Level Security (RLS)
-- =============================================
alter table public.profiles enable row level security;
alter table public.vaccination_records enable row level security;
alter table public.reminders enable row level security;

-- =============================================
-- 6️⃣ Policies for Profiles
-- =============================================
drop policy if exists "Profiles: select self" on public.profiles;
create policy "Profiles: select self" on public.profiles
for select using ( id = auth.uid() );

drop policy if exists "Profiles: update self" on public.profiles;
create policy "Profiles: update self" on public.profiles
for update using ( id = auth.uid() );

-- =============================================
-- 7️⃣ Policies for Vaccination Records
-- =============================================
drop policy if exists "VaccinationRecords: select" on public.vaccination_records;
create policy "VaccinationRecords: select" on public.vaccination_records
for select using (
  user_id = auth.uid() OR EXISTS (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "VaccinationRecords: insert" on public.vaccination_records;
create policy "VaccinationRecords: insert" on public.vaccination_records
for insert with check ( user_id = auth.uid() );

drop policy if exists "VaccinationRecords: update" on public.vaccination_records;
create policy "VaccinationRecords: update" on public.vaccination_records
for update using (
  user_id = auth.uid() OR EXISTS (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "VaccinationRecords: delete" on public.vaccination_records;
create policy "VaccinationRecords: delete" on public.vaccination_records
for delete using (
  user_id = auth.uid() OR EXISTS (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  )
);

-- =============================================
-- 8️⃣ Policies for Reminders
-- =============================================
drop policy if exists "Reminders: select" on public.reminders;
create policy "Reminders: select" on public.reminders
for select using (
  user_id = auth.uid() OR EXISTS (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "Reminders: insert" on public.reminders;
create policy "Reminders: insert" on public.reminders
for insert with check ( user_id = auth.uid() );

drop policy if exists "Reminders: update" on public.reminders;
create policy "Reminders: update" on public.reminders
for update using (
  user_id = auth.uid() OR EXISTS (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "Reminders: delete" on public.reminders;
create policy "Reminders: delete" on public.reminders
for delete using (
  user_id = auth.uid() OR EXISTS (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  )
);
