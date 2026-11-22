-- builtbykayde: client reviews.
-- Run once in Supabase → SQL Editor, AFTER leads.sql (it uses public.is_admin()). Safe to re-run.
--
-- Security:
--   • Visitors (anon) can ADD a review through /review — only name, business,
--     email, rating, quote and consent. New reviews always start as Pending.
--   • Visitors can READ only published reviews the person agreed to share,
--     and only these columns: first name, business, rating, quote, featured,
--     date. Full names and emails are never readable by the public.
--   • Only your admin account can see everything and approve, hide or edit.

create table if not exists public.reviews (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(trim(name)) between 1 and 120),
  first_name  text generated always as (split_part(trim(name), ' ', 1)) stored,
  business    text not null default '' check (length(business) <= 120),
  email       text not null default '' check (length(email) <= 254),
  rating      int  not null check (rating between 1 and 5),
  quote       text not null check (length(trim(quote)) between 10 and 600),
  consent     boolean not null default false,
  source      text not null default 'form' check (source in ('form', 'manual')),
  status      text not null default 'pending' check (status in ('pending', 'published', 'hidden')),
  featured    boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists reviews_status_idx on public.reviews (status, featured desc, created_at desc);
create index if not exists reviews_email_idx on public.reviews (lower(email), created_at);

drop trigger if exists reviews_set_updated_at on public.reviews;
create trigger reviews_set_updated_at
  before update on public.reviews
  for each row execute function public.set_updated_at();

-- Reviews from the public form always start Pending, and spam is slowed down.
create or replace function public.reviews_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.name := trim(new.name);
  new.business := trim(coalesce(new.business, ''));
  new.email := lower(trim(coalesce(new.email, '')));
  new.quote := trim(new.quote);

  if not public.is_admin() then
    new.source := 'form';
    new.status := 'pending';
    new.featured := false;

    if new.email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
      raise exception 'Please check your email address.' using errcode = 'P0001';
    end if;
    if (select count(*) from public.reviews r
        where lower(r.email) = new.email and r.created_at > now() - interval '1 hour') >= 3 then
      raise exception 'Thanks! You''ve already sent a review recently.' using errcode = 'P0001';
    end if;
    if (select count(*) from public.reviews r where r.created_at > now() - interval '10 minutes') >= 20 then
      raise exception 'The review form is busy. Try again in a few minutes.' using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists reviews_before_insert on public.reviews;
create trigger reviews_before_insert
  before insert on public.reviews
  for each row execute function public.reviews_before_insert();

-- ---------- Row Level Security ----------
alter table public.reviews enable row level security;

drop policy if exists "Visitors can send a review" on public.reviews;
create policy "Visitors can send a review"
  on public.reviews for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Anyone can read published reviews" on public.reviews;
create policy "Anyone can read published reviews"
  on public.reviews for select
  to anon
  using (status = 'published' and consent);

drop policy if exists "Admins manage reviews" on public.reviews;
create policy "Admins manage reviews"
  on public.reviews for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

revoke all on public.reviews from anon;
grant insert (name, business, email, rating, quote, consent) on public.reviews to anon;
grant select (id, first_name, business, rating, quote, featured, created_at) on public.reviews to anon;
grant select, insert, update, delete on public.reviews to authenticated;
