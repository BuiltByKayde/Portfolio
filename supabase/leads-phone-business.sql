-- Adds optional phone and business name to leads.
-- Run once in Supabase → SQL Editor, AFTER leads.sql. Safe to re-run.

alter table public.leads add column if not exists phone text;
alter table public.leads add column if not exists business text;

alter table public.leads drop constraint if exists leads_phone_len;
alter table public.leads add constraint leads_phone_len check (phone is null or length(phone) <= 40);
alter table public.leads drop constraint if exists leads_business_len;
alter table public.leads add constraint leads_business_len check (business is null or length(business) <= 120);

-- Tidy the new fields too (blank becomes empty), on top of the existing checks.
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
  new.phone := nullif(trim(coalesce(new.phone, '')), '');
  new.business := nullif(trim(coalesce(new.business, '')), '');
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

-- Visitors may now also send these two columns (still insert only).
grant insert (name, email, topic, message, phone, business) on public.leads to anon;
