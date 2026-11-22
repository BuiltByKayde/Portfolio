-- builtbykayde admin: invoicing.
-- Run once in Supabase → SQL Editor, AFTER schema.sql and leads.sql. Safe to re-run.
--
-- Security: every table here is admin-only (public.is_admin() from leads.sql).
-- Logged-out visitors get no access at all.

-- ---------- Settings (one row: your business details for invoices) ----------
create table if not exists public.invoice_settings (
  id              int primary key default 1 check (id = 1),
  business_name   text not null default 'builtbykayde',
  owner_name      text not null default '',
  location        text not null default '',
  email           text not null default '',
  phone           text not null default '',
  website         text not null default '',
  bank_name       text not null default '',
  bank_account    text not null default '',
  gst_registered  boolean not null default false,
  gst_number      text not null default '',
  default_terms   text not null default '14' check (default_terms in ('7', '14', '20th', '30')),
  default_note    text not null default 'Thanks for choosing builtbykayde! Please pay by bank transfer and use the invoice number as the reference.',
  updated_at      timestamptz not null default now()
);
insert into public.invoice_settings (id) values (1) on conflict do nothing;

-- ---------- Invoices ----------
create table if not exists public.invoices (
  id            uuid primary key default gen_random_uuid(),
  number        text not null unique check (length(number) between 1 and 40),
  client_id     uuid references public.clients (id) on delete set null,
  title         text not null default '' check (length(title) <= 200),
  kind          text not null default 'full' check (kind in ('full', 'deposit', 'final')),
  deposit_pct   numeric(5, 2) not null default 50 check (deposit_pct between 0 and 100),
  less_amount   numeric(12, 2) not null default 0 check (less_amount >= 0),
  gst_rate      numeric(5, 2) not null default 0 check (gst_rate in (0, 15)),
  issued_on     date not null default current_date,
  due_on        date not null default (current_date + 14),
  status        text not null default 'draft' check (status in ('draft', 'sent')),
  note          text not null default '' check (length(note) <= 2000),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.invoice_lines (
  id           uuid primary key default gen_random_uuid(),
  invoice_id   uuid not null references public.invoices (id) on delete cascade,
  position     int not null default 0,
  description  text not null default '' check (length(description) <= 300),
  qty          numeric(10, 2) not null default 1,
  rate         numeric(12, 2) not null default 0
);

create table if not exists public.invoice_payments (
  id           uuid primary key default gen_random_uuid(),
  invoice_id   uuid not null references public.invoices (id) on delete cascade,
  amount       numeric(12, 2) not null check (amount > 0),
  paid_on      date not null default current_date,
  method       text not null default 'Bank transfer' check (length(method) <= 40),
  created_at   timestamptz not null default now()
);

-- Saved items you add with one click in the editor.
create table if not exists public.invoice_presets (
  id           uuid primary key default gen_random_uuid(),
  description  text not null check (length(description) between 1 and 300),
  rate         numeric(12, 2) not null default 0,
  created_at   timestamptz not null default now()
);

create index if not exists invoices_client_idx on public.invoices (client_id);
create index if not exists invoices_created_idx on public.invoices (created_at desc);
create index if not exists invoice_lines_invoice_idx on public.invoice_lines (invoice_id, position);
create index if not exists invoice_payments_invoice_idx on public.invoice_payments (invoice_id);

drop trigger if exists invoices_set_updated_at on public.invoices;
create trigger invoices_set_updated_at
  before update on public.invoices
  for each row execute function public.set_updated_at();

drop trigger if exists invoice_settings_set_updated_at on public.invoice_settings;
create trigger invoice_settings_set_updated_at
  before update on public.invoice_settings
  for each row execute function public.set_updated_at();

-- ---------- Row Level Security: admin only ----------
do $$
declare t text;
begin
  foreach t in array array['invoice_settings', 'invoices', 'invoice_lines', 'invoice_payments', 'invoice_presets'] loop
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
