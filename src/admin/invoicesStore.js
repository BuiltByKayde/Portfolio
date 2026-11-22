// ---------------------------------------------------------------------------
// Invoices, payments, saved items and invoice settings.
//
// With Supabase connected they live in the tables from supabase/invoices.sql.
// Without it (test mode) they're kept in this browser.
//
// Invoice shape:
// { id, number, clientId, title, kind, depositPct, lessAmount, gstRate,
//   issuedOn, dueOn, status, note, createdAt,
//   lines: [{ id, description, qty, rate }],
//   payments: [{ id, amount, paidOn, method }] }
//   kind: 'full' | 'deposit' | 'final'   status: 'draft' | 'sent'
//   (Part-paid, Overdue and Paid are worked out by invoiceMath.calc.)
// ---------------------------------------------------------------------------

import { supabase } from '../lib/supabase.js';
import { num, todayISO } from './invoiceMath.js';

export const DEFAULT_SETTINGS = {
  businessName: 'builtbykayde',
  ownerName: '',
  location: '',
  email: '',
  phone: '',
  website: '',
  bankName: '',
  bankAccount: '',
  gstRegistered: false,
  gstNumber: '',
  defaultTerms: '14',
  defaultNote:
    'Thanks for choosing builtbykayde! Please pay by bank transfer and use the invoice number as the reference.',
};

function uid() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function check(error) {
  if (error) {
    console.error(error);
    if (error.code === '42P01' || error.code === 'PGRST205') {
      throw new Error('Invoices aren’t set up in Supabase yet. Run supabase/invoices.sql in the SQL Editor, then refresh.');
    }
    if (error.code === '23505') {
      throw new Error('That invoice number is already used. Pick a different one.');
    }
    throw new Error('Couldn’t reach the database. Check your connection and try again.');
  }
}

// ---------- Supabase ----------

const SELECT =
  'id, number, client_id, title, kind, deposit_pct, less_amount, gst_rate, issued_on, due_on, status, note, created_at, ' +
  'invoice_lines (id, position, description, qty, rate), invoice_payments (id, amount, paid_on, method, created_at)';

function fromRow(r) {
  return {
    id: r.id,
    number: r.number,
    clientId: r.client_id,
    title: r.title,
    kind: r.kind,
    depositPct: Number(r.deposit_pct),
    lessAmount: Number(r.less_amount),
    gstRate: Number(r.gst_rate),
    issuedOn: r.issued_on,
    dueOn: r.due_on,
    status: r.status,
    note: r.note,
    createdAt: r.created_at,
    lines: (r.invoice_lines ?? [])
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((l) => ({ id: l.id, description: l.description, qty: Number(l.qty), rate: Number(l.rate) })),
    payments: (r.invoice_payments ?? [])
      .slice()
      .sort((a, b) => a.paid_on.localeCompare(b.paid_on) || a.created_at.localeCompare(b.created_at))
      .map((p) => ({ id: p.id, amount: Number(p.amount), paidOn: p.paid_on, method: p.method })),
  };
}

function toRow(inv) {
  return {
    number: inv.number.trim(),
    client_id: inv.clientId || null,
    title: (inv.title ?? '').trim(),
    kind: inv.kind,
    deposit_pct: num(inv.depositPct),
    less_amount: num(inv.lessAmount),
    gst_rate: num(inv.gstRate),
    issued_on: inv.issuedOn,
    due_on: inv.dueOn,
    status: inv.status,
    note: inv.note ?? '',
  };
}

function settingsFromRow(r) {
  return {
    businessName: r.business_name,
    ownerName: r.owner_name,
    location: r.location,
    email: r.email,
    phone: r.phone,
    website: r.website,
    bankName: r.bank_name,
    bankAccount: r.bank_account,
    gstRegistered: r.gst_registered,
    gstNumber: r.gst_number,
    defaultTerms: r.default_terms,
    defaultNote: r.default_note,
  };
}

const db = {
  async list() {
    const { data, error } = await supabase.from('invoices').select(SELECT).order('created_at', { ascending: false });
    check(error);
    return data.map(fromRow);
  },
  async get(id) {
    const { data, error } = await supabase.from('invoices').select(SELECT).eq('id', id).single();
    check(error);
    return fromRow(data);
  },
  async save(inv) {
    let id = inv.id;
    if (id) {
      const { error } = await supabase.from('invoices').update(toRow(inv)).eq('id', id);
      check(error);
      const del = await supabase.from('invoice_lines').delete().eq('invoice_id', id);
      check(del.error);
    } else {
      const { data, error } = await supabase.from('invoices').insert(toRow(inv)).select('id').single();
      check(error);
      id = data.id;
    }
    const lines = inv.lines
      .filter((l) => l.description.trim() || num(l.rate))
      .map((l, i) => ({ invoice_id: id, position: i, description: l.description.trim(), qty: num(l.qty), rate: num(l.rate) }));
    if (lines.length) {
      const ins = await supabase.from('invoice_lines').insert(lines);
      check(ins.error);
    }
    return db.get(id);
  },
  async setStatus(id, status) {
    const { error } = await supabase.from('invoices').update({ status }).eq('id', id);
    check(error);
    return db.get(id);
  },
  async remove(id) {
    const { error } = await supabase.from('invoices').delete().eq('id', id);
    check(error);
  },
  async addPayment(id, p) {
    const { error } = await supabase
      .from('invoice_payments')
      .insert({ invoice_id: id, amount: num(p.amount), paid_on: p.paidOn || todayISO(), method: p.method || 'Bank transfer' });
    check(error);
    return db.get(id);
  },
  async deletePayment(id, paymentId) {
    const { error } = await supabase.from('invoice_payments').delete().eq('id', paymentId);
    check(error);
    return db.get(id);
  },
  async getSettings() {
    const { data, error } = await supabase.from('invoice_settings').select('*').eq('id', 1).maybeSingle();
    check(error);
    return data ? settingsFromRow(data) : { ...DEFAULT_SETTINGS };
  },
  async saveSettings(s) {
    const row = {
      id: 1,
      business_name: s.businessName.trim(),
      owner_name: s.ownerName.trim(),
      location: s.location.trim(),
      email: s.email.trim(),
      phone: s.phone.trim(),
      website: s.website.trim(),
      bank_name: s.bankName.trim(),
      bank_account: s.bankAccount.trim(),
      gst_registered: !!s.gstRegistered,
      gst_number: s.gstNumber.trim(),
      default_terms: s.defaultTerms,
      default_note: s.defaultNote,
    };
    const { data, error } = await supabase.from('invoice_settings').upsert(row).select('*').single();
    check(error);
    return settingsFromRow(data);
  },
  async listPresets() {
    const { data, error } = await supabase.from('invoice_presets').select('id, description, rate').order('created_at');
    check(error);
    return data.map((p) => ({ id: p.id, description: p.description, rate: Number(p.rate) }));
  },
  async addPreset(p) {
    const { error } = await supabase.from('invoice_presets').insert({ description: p.description.trim(), rate: num(p.rate) });
    check(error);
    return db.listPresets();
  },
  async deletePreset(id) {
    const { error } = await supabase.from('invoice_presets').delete().eq('id', id);
    check(error);
    return db.listPresets();
  },
};

// ---------- Browser storage (test mode) ----------

const K = { inv: 'kd-admin-invoices-v1', set: 'kd-admin-invoice-settings-v1', pre: 'kd-admin-invoice-presets-v1' };

function read(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked.
  }
}

function mapInv(id, fn) {
  let updated = null;
  write(
    K.inv,
    read(K.inv, []).map((inv) => {
      if (inv.id !== id) return inv;
      updated = fn(inv);
      return updated;
    })
  );
  return updated;
}

const local = {
  async list() {
    return read(K.inv, []);
  },
  async save(inv) {
    const all = read(K.inv, []);
    if (all.some((x) => x.id !== inv.id && x.number.trim() === inv.number.trim())) {
      throw new Error('That invoice number is already used. Pick a different one.');
    }
    const clean = {
      ...inv,
      lines: inv.lines
        .filter((l) => l.description.trim() || num(l.rate))
        .map((l) => ({ id: l.id || uid(), description: l.description.trim(), qty: num(l.qty), rate: num(l.rate) })),
      depositPct: num(inv.depositPct),
      lessAmount: num(inv.lessAmount),
      gstRate: num(inv.gstRate),
    };
    if (inv.id) return mapInv(inv.id, (old) => ({ ...old, ...clean, payments: old.payments }));
    const created = { ...clean, id: uid(), createdAt: new Date().toISOString(), payments: [] };
    write(K.inv, [created, ...all]);
    return created;
  },
  async setStatus(id, status) {
    return mapInv(id, (inv) => ({ ...inv, status }));
  },
  async remove(id) {
    write(K.inv, read(K.inv, []).filter((inv) => inv.id !== id));
  },
  async addPayment(id, p) {
    const pay = { id: uid(), amount: num(p.amount), paidOn: p.paidOn || todayISO(), method: p.method || 'Bank transfer' };
    return mapInv(id, (inv) => ({ ...inv, payments: [...inv.payments, pay] }));
  },
  async deletePayment(id, paymentId) {
    return mapInv(id, (inv) => ({ ...inv, payments: inv.payments.filter((p) => p.id !== paymentId) }));
  },
  async getSettings() {
    return { ...DEFAULT_SETTINGS, ...read(K.set, {}) };
  },
  async saveSettings(s) {
    write(K.set, s);
    return { ...DEFAULT_SETTINGS, ...s };
  },
  async listPresets() {
    return read(K.pre, []);
  },
  async addPreset(p) {
    const list = [...read(K.pre, []), { id: uid(), description: p.description.trim(), rate: num(p.rate) }];
    write(K.pre, list);
    return list;
  },
  async deletePreset(id) {
    const list = read(K.pre, []).filter((p) => p.id !== id);
    write(K.pre, list);
    return list;
  },
};

const store = supabase ? db : local;

export const listInvoices = () => store.list();
export const saveInvoice = (inv) => store.save(inv);
export const setInvoiceStatus = (id, status) => store.setStatus(id, status);
export const deleteInvoice = (id) => store.remove(id);
export const addPayment = (id, p) => store.addPayment(id, p);
export const deletePayment = (id, paymentId) => store.deletePayment(id, paymentId);
export const getInvoiceSettings = () => store.getSettings();
export const saveInvoiceSettings = (s) => store.saveSettings(s);
export const listPresets = () => store.listPresets();
export const addPreset = (p) => store.addPreset(p);
export const deletePreset = (id) => store.deletePreset(id);
