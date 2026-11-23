// ---------------------------------------------------------------------------
// Monthly care plans.
//
// With Supabase connected they live in the tables from supabase/care-plans.sql.
// Without it (test mode) they're kept in this browser.
//
// Plan shape:
// { id, clientId, tier, price, minutesIncluded, reference, startedOn,
//   minTermMonths, status, createdAt,
//   logs: [{ id, description, minutes, loggedOn }],
//   invoiceLinks: [{ period: 'YYYY-MM', invoiceId }] }
//   status: 'active' | 'paused' | 'ended'
// ---------------------------------------------------------------------------

import { supabase } from '../lib/supabase.js';
import { num, todayISO } from './invoiceMath.js';

export const TIERS = [
  { name: 'Basic', price: 49, minutes: 0, blurb: 'Hosting help, security updates and fixes' },
  { name: 'Standard', price: 99, minutes: 60, blurb: 'Basic + up to 1 hour of small changes' },
  { name: 'Plus', price: 179, minutes: 180, blurb: 'Standard + up to 3 hours of changes' },
];

export function currentPeriod() {
  return todayISO().slice(0, 7);
}

export function shiftPeriod(period, n) {
  const [y, m] = period.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function periodLabel(period, short = false) {
  const [y, m] = period.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(
    'en-NZ',
    short ? { month: 'short' } : { month: 'long', year: 'numeric' }
  );
}

export function minutesLabel(mins) {
  const m = Math.round(Number(mins) || 0);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return `${h} h${r ? ` ${r} min` : ''}`;
}

// CARE-NGATA style reference for the client's automatic payment.
export function defaultReference(client) {
  const base = (client?.business || client?.name || '').toUpperCase().replace(/[^A-Z0-9 ]/g, '');
  const word = base.split(/\s+/).filter(Boolean)[0] || 'CLIENT';
  return `CARE-${word.slice(0, 10)}`;
}

export function minutesUsed(plan, period) {
  return (plan.logs ?? []).filter((l) => l.loggedOn.startsWith(period)).reduce((a, l) => a + l.minutes, 0);
}

function uid() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function check(error) {
  if (error) {
    console.error(error);
    if (error.code === '42P01' || error.code === 'PGRST205' || error.code === 'PGRST200') {
      throw new Error('Care plans aren’t set up in Supabase yet. Run supabase/care-plans.sql in the SQL Editor, then refresh.');
    }
    throw new Error('Couldn’t reach the database. Check your connection and try again.');
  }
}

function clean(f) {
  return {
    clientId: f.clientId,
    tier: (f.tier ?? 'Standard').trim() || 'Standard',
    price: num(f.price),
    minutesIncluded: Math.max(0, Math.round(num(f.minutesIncluded))),
    reference: (f.reference ?? '').trim().toUpperCase(),
    startedOn: f.startedOn || todayISO(),
    minTermMonths: Math.max(0, Math.round(num(f.minTermMonths))),
    status: f.status || 'active',
  };
}

// ---------- Supabase ----------

const SELECT =
  'id, client_id, tier, price, minutes_included, reference, started_on, min_term_months, status, created_at, ' +
  'care_plan_logs (id, description, minutes, logged_on, created_at), care_plan_invoices (period, invoice_id)';

function fromRow(r) {
  return {
    id: r.id,
    clientId: r.client_id,
    tier: r.tier,
    price: Number(r.price),
    minutesIncluded: r.minutes_included,
    reference: r.reference,
    startedOn: r.started_on,
    minTermMonths: r.min_term_months,
    status: r.status,
    createdAt: r.created_at,
    logs: (r.care_plan_logs ?? [])
      .slice()
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((l) => ({ id: l.id, description: l.description, minutes: l.minutes, loggedOn: l.logged_on })),
    invoiceLinks: (r.care_plan_invoices ?? []).map((l) => ({ period: l.period, invoiceId: l.invoice_id })),
  };
}

function toRow(f) {
  const c = clean(f);
  return {
    client_id: c.clientId,
    tier: c.tier,
    price: c.price,
    minutes_included: c.minutesIncluded,
    reference: c.reference,
    started_on: c.startedOn,
    min_term_months: c.minTermMonths,
    status: c.status,
  };
}

const db = {
  async list() {
    const { data, error } = await supabase.from('care_plans').select(SELECT).order('created_at', { ascending: false });
    check(error);
    return data.map(fromRow);
  },
  async get(id) {
    const { data, error } = await supabase.from('care_plans').select(SELECT).eq('id', id).single();
    check(error);
    return fromRow(data);
  },
  async save(f) {
    if (f.id) {
      const { error } = await supabase.from('care_plans').update(toRow(f)).eq('id', f.id);
      check(error);
      return db.get(f.id);
    }
    const { data, error } = await supabase.from('care_plans').insert(toRow(f)).select('id').single();
    check(error);
    return db.get(data.id);
  },
  async setStatus(id, status) {
    const { error } = await supabase.from('care_plans').update({ status }).eq('id', id);
    check(error);
    return db.get(id);
  },
  async remove(id) {
    const { error } = await supabase.from('care_plans').delete().eq('id', id);
    check(error);
  },
  async addLog(id, l) {
    const { error } = await supabase
      .from('care_plan_logs')
      .insert({ plan_id: id, description: l.description.trim(), minutes: Math.round(num(l.minutes)), logged_on: todayISO() });
    check(error);
    return db.get(id);
  },
  async deleteLog(id, logId) {
    const { error } = await supabase.from('care_plan_logs').delete().eq('id', logId);
    check(error);
    return db.get(id);
  },
  async linkInvoice(id, period, invoiceId) {
    const { error } = await supabase
      .from('care_plan_invoices')
      .upsert({ plan_id: id, period, invoice_id: invoiceId });
    check(error);
    return db.get(id);
  },
};

// ---------- Browser storage (test mode) ----------

const KEY = 'kd-admin-careplans-v1';

function read() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) ?? [];
  } catch {
    return [];
  }
}

function write(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
}

function mapOne(id, fn) {
  let updated = null;
  write(
    read().map((p) => {
      if (p.id !== id) return p;
      updated = fn(p);
      return updated;
    })
  );
  return updated;
}

const local = {
  async list() {
    return read();
  },
  async save(f) {
    if (f.id) return mapOne(f.id, (p) => ({ ...p, ...clean(f) }));
    const plan = { id: uid(), ...clean(f), createdAt: new Date().toISOString(), logs: [], invoiceLinks: [] };
    write([plan, ...read()]);
    return plan;
  },
  async setStatus(id, status) {
    return mapOne(id, (p) => ({ ...p, status }));
  },
  async remove(id) {
    write(read().filter((p) => p.id !== id));
  },
  async addLog(id, l) {
    const log = { id: uid(), description: l.description.trim(), minutes: Math.round(num(l.minutes)), loggedOn: todayISO() };
    return mapOne(id, (p) => ({ ...p, logs: [...p.logs, log] }));
  },
  async deleteLog(id, logId) {
    return mapOne(id, (p) => ({ ...p, logs: p.logs.filter((l) => l.id !== logId) }));
  },
  async linkInvoice(id, period, invoiceId) {
    return mapOne(id, (p) => ({
      ...p,
      invoiceLinks: [...p.invoiceLinks.filter((l) => l.period !== period), { period, invoiceId }],
    }));
  },
};

const store = supabase ? db : local;

export const listPlans = () => store.list();
export const savePlan = (f) => store.save(f);
export const setPlanStatus = (id, status) => store.setStatus(id, status);
export const deletePlan = (id) => store.remove(id);
export const addPlanLog = (id, l) => store.addLog(id, l);
export const deletePlanLog = (id, logId) => store.deleteLog(id, logId);
export const linkPlanInvoice = (id, period, invoiceId) => store.linkInvoice(id, period, invoiceId);
