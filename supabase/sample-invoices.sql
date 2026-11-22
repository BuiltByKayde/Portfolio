-- SAMPLE invoices to play with. Run in Supabase → SQL Editor (after invoices.sql).
-- They're numbered DEMO-A … DEMO-E so your real numbering still starts at INV-0001.
-- They attach to your existing sample clients (by name) where they exist.
--
-- To remove them all later, run just this line:
--   delete from public.invoices where number like 'DEMO-%';

do $$
declare
  c_any   uuid := (select id from public.clients order by created_at limit 1);
  c_aroha uuid := coalesce((select id from public.clients where name = 'Aroha Ngata' order by created_at limit 1), c_any);
  c_ben   uuid := coalesce((select id from public.clients where name = 'Ben Walker'  order by created_at limit 1), c_any);
  c_mei   uuid := coalesce((select id from public.clients where name = 'Mei Lin'     order by created_at limit 1), c_any);
  c_sione uuid := coalesce((select id from public.clients where name = 'Sione Taufa' order by created_at limit 1), c_any);
  i uuid;
begin
  delete from public.invoices where number like 'DEMO-%';

  -- DEMO-A: Draft (not sent yet)
  insert into public.invoices (number, client_id, title, kind, issued_on, due_on, status, note)
  values ('DEMO-A', c_mei, 'Online menu page (sample)', 'full', current_date, current_date + 14, 'draft', 'Sample invoice — delete me.')
  returning id into i;
  insert into public.invoice_lines (invoice_id, position, description, qty, rate) values
    (i, 0, 'Menu page design + build', 1, 600),
    (i, 1, 'Opening hours + map section', 1, 150);

  -- DEMO-B: Sent, deposit, not due yet
  insert into public.invoices (number, client_id, title, kind, deposit_pct, issued_on, due_on, status, note)
  values ('DEMO-B', c_aroha, 'Website with quote form (sample)', 'deposit', 50, current_date - 3, current_date + 11, 'sent', 'Sample invoice — delete me.')
  returning id into i;
  insert into public.invoice_lines (invoice_id, position, description, qty, rate) values
    (i, 0, 'Website design + build (5 pages)', 1, 1900),
    (i, 1, 'Quote form setup', 1, 600);

  -- DEMO-C: Part-paid
  insert into public.invoices (number, client_id, title, kind, issued_on, due_on, status, note)
  values ('DEMO-C', c_ben, 'Website rebuild (sample)', 'full', current_date - 10, current_date + 4, 'sent', 'Sample invoice — delete me.')
  returning id into i;
  insert into public.invoice_lines (invoice_id, position, description, qty, rate) values
    (i, 0, 'Website rebuild, mobile-first', 1, 1800),
    (i, 1, 'Extra page', 2, 200);
  insert into public.invoice_payments (invoice_id, amount, paid_on, method) values
    (i, 700, current_date - 4, 'Bank transfer');

  -- DEMO-D: Overdue
  insert into public.invoices (number, client_id, title, kind, issued_on, due_on, status, note)
  values ('DEMO-D', c_sione, 'Class booking page (sample)', 'full', current_date - 25, current_date - 6, 'sent', 'Sample invoice — delete me.')
  returning id into i;
  insert into public.invoice_lines (invoice_id, position, description, qty, rate) values
    (i, 0, 'Class timetable + booking page', 1, 900);

  -- DEMO-E: Paid in full this month
  insert into public.invoices (number, client_id, title, kind, issued_on, due_on, status, note)
  values ('DEMO-E', c_aroha, 'Website care plan (sample)', 'full', current_date - 8, current_date + 6, 'sent', 'Sample invoice — delete me.')
  returning id into i;
  insert into public.invoice_lines (invoice_id, position, description, qty, rate) values
    (i, 0, 'Care plan: hosting, updates, small edits', 1, 79);
  insert into public.invoice_payments (invoice_id, amount, paid_on, method) values
    (i, 79, current_date - 1, 'Bank transfer');
end $$;
