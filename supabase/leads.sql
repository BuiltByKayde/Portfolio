-- builtbykayde admin: leads from the website's contact form.
-- Run once in Supabase → SQL Editor, AFTER schema.sql. Safe to re-run.
--
-- Security:
--   • Logged-out visitors (the "anon" role) can only ADD a lead, and only the
--     name, email, topic and message columns. They can never read, change or
--     delete anything.
--   • Only accounts listed in public.admins can read and manage leads.
--   • Each email can send at most 3 messages an hour, and the whole form at
--     most 30 every 10 minutes, to slow down spam.

-- ---------- Admins ----------
create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);
alter table public.admins enable row level security;
revoke all on public.admins from anon, authenticated;

-- Adds your admin account. Change the email if you log in with a different one.
insert into public.admins (user_id)
select id from auth.users where email = 'builtbykayde@gmail.com'
on conflict do nothing;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins a where a.user_id = (select auth.uid()));
$$;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- ---------- Leads ----------
create table if not exists public.leads (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(trim(name)) between 1 and 120),
  email       text not null check (length(email) between 3 and 254 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  topic       text not null check (topic in ('role', 'freelance', 'hi')),
  message     text not null check (length(trim(message)) between 1 and 5000),
  status      text not null default 'new' check (status in ('new', 'replied', 'converted', 'closed')),
  is_read     boolean not null default false,
  client_id   uuid references public.clients (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.lead_notes (
  id          uuid primary key default gen_random_uuid(),
  lead_id     uuid not null references public.leads (id) on delete cascade,
  text        text not null check (length(text) between 1 and 5000),
  created_at  timestamptz not null default now()
);

create index if not exists leads_created_idx on public.leads (created_at desc);
create index if not exists leads_email_idx on public.leads (lower(email), created_at);
create index if not exists lead_notes_lead_idx on public.lead_notes (lead_id);

drop trigger if exists leads_set_updated_at on public.leads;
create trigger leads_set_updated_at
  before update on public.leads
  for each row execute function public.set_updated_at();

-- Tidy new leads and slow down spam.
create or replace function public.leads_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.name := trim(new.name);
  new.email := lower(trim(new.email));
  new.message := trim(new.message);
  new.status := 'new';
  new.is_read := false;
  new.client_id := null;

  if (select count(*) from public.leads l
      where lower(l.email) = new.email and l.created_at > now() - interval '1 hour') >= 3 then
    raise exception 'Too many messages from this email. Try again later.' using errcode = 'P0001';
  end if;

  if (select count(*) from public.leads l
      where l.created_at > now() - interval '10 minutes') >= 30 then
    raise exception 'The contact form is busy. Try again in a few minutes.' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists leads_before_insert on public.leads;
create trigger leads_before_insert
  before insert on public.leads
  for each row execute function public.leads_before_insert();

-- ---------- Row Level Security ----------
alter table public.leads enable row level security;
alter table public.lead_notes enable row level security;

drop policy if exists "Visitors can send a lead" on public.leads;
create policy "Visitors can send a lead"
  on public.leads
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Admins manage leads" on public.leads;
create policy "Admins manage leads"
  on public.leads
  for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "Admins manage lead notes" on public.lead_notes;
create policy "Admins manage lead notes"
  on public.lead_notes
  for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- Visitors: insert only, and only these four columns.
revoke all on public.leads from anon;
revoke all on public.lead_notes from anon;
grant insert (name, email, topic, message) on public.leads to anon;

-- Signed-in admin: full access (RLS above still checks is_admin()).
grant select, insert, update, delete on public.leads to authenticated;
grant select, insert, update, delete on public.lead_notes to authenticated;
