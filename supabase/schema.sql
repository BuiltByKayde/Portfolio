-- builtbykayde admin: clients + notes.
-- Run once in Supabase → SQL Editor. Safe to re-run.
--
-- Security: Row Level Security is on for both tables, and every policy only
-- lets a signed-in user see and change rows they own. Logged-out visitors
-- (the public "anon" role) get nothing.

create table if not exists public.clients (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null default '',
  business    text not null default '',
  email       text not null default '',
  phone       text not null default '',
  website     text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.client_notes (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.clients (id) on delete cascade,
  owner_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  text        text not null check (length(text) between 1 and 5000),
  created_at  timestamptz not null default now()
);

create index if not exists clients_owner_idx on public.clients (owner_id);
create index if not exists client_notes_client_idx on public.client_notes (client_id);
create index if not exists client_notes_owner_idx on public.client_notes (owner_id);

-- Keep updated_at current on edits.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists clients_set_updated_at on public.clients;
create trigger clients_set_updated_at
  before update on public.clients
  for each row execute function public.set_updated_at();

-- Row Level Security
alter table public.clients enable row level security;
alter table public.client_notes enable row level security;

drop policy if exists "Owner manages own clients" on public.clients;
create policy "Owner manages own clients"
  on public.clients
  for all
  to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

drop policy if exists "Owner manages own notes" on public.client_notes;
create policy "Owner manages own notes"
  on public.client_notes
  for all
  to authenticated
  using (owner_id = (select auth.uid()))
  with check (
    owner_id = (select auth.uid())
    and exists (
      select 1 from public.clients c
      where c.id = client_id and c.owner_id = (select auth.uid())
    )
  );

-- Signed-in users can use the tables through the API (RLS above still limits
-- them to their own rows). Logged-out visitors get no access at all.
grant select, insert, update, delete on public.clients to authenticated;
grant select, insert, update, delete on public.client_notes to authenticated;
revoke all on public.clients from anon;
revoke all on public.client_notes from anon;
