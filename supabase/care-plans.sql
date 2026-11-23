-- builtbykayde admin: monthly care plans.
-- Run once in Supabase → SQL Editor, AFTER invoices.sql. Safe to re-run.
--
-- Security: admin-only (public.is_admin() from leads.sql). Visitors get nothing.

create table if not exists public.care_plans (
  id                uuid primary key default gen_random_uuid(),
  client_id         uuid not null references public.clients (id) on delete cascade,
  tier              text not null default 'Standard' check (length(tier) between 1 and 40),
  price             numeric(12, 2) not null check (price >= 0),
  minutes_included  int not null default 0 check (minutes_included between 0 and 6000),
  reference         text not null default '' check (length(reference) <= 40),
  started_on        date not null default current_date,
  min_term_months   int not null default 6 check (min_term_months between 0 and 60),
  status            text not null default 'active' check (status in ('active', 'paused', 'ended')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Time spent on a client's changes, counted against their monthly limit.
create table if not exists public.care_plan_logs (
  id           uuid primary key default gen_random_uuid(),
  plan_id      uuid not null references public.care_plans (id) on delete cascade,
  description  text not null check (length(description) between 1 and 300),
  minutes      int not null check (minutes between 1 and 6000),
  logged_on    date not null default current_date,
  created_at   timestamptz not null default now()
);

-- Which invoice bills which month ('YYYY-MM') of a plan. Deleting the invoice
-- removes the link, so the month shows as "Not invoiced" again.
create table if not exists public.care_plan_invoices (
  plan_id     uuid not null references public.care_plans (id) on delete cascade,
  period      text not null check (period ~ '^[0-9]{4}-[0-9]{2}$'),
  invoice_id  uuid not null references public.invoices (id) on delete cascade,
  primary key (plan_id, period)
);

create index if not exists care_plans_client_idx on public.care_plans (client_id);
create index if not exists care_plan_logs_plan_idx on public.care_plan_logs (plan_id, logged_on);
create index if not exists care_plan_invoices_invoice_idx on public.care_plan_invoices (invoice_id);

drop trigger if exists care_plans_set_updated_at on public.care_plans;
create trigger care_plans_set_updated_at
  before update on public.care_plans
  for each row execute function public.set_updated_at();

do $$
declare t text;
begin
  foreach t in array array['care_plans', 'care_plan_logs', 'care_plan_invoices'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "Admins manage %s" on public.%I', t, t);
    execute format(
      'create policy "Admins manage %s" on public.%I for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()))',
      t, t
    );
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;
