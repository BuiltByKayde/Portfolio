// ---------------------------------------------------------------------------
// Leads: messages from the website's contact form.
//
// With Supabase connected they live in the `leads` and `lead_notes` tables
// (supabase/leads.sql). Without it (test mode) they're kept in this browser.
//
// Every function is async and returns the same plain shape either way:
// { id, name, email, topic, message, status, isRead, clientId, createdAt,
//   notes: [{ id, text, createdAt }] }
//   topic:  'role' | 'freelance' | 'hi'
//   status: 'new' | 'replied' | 'converted' | 'closed'
// ---------------------------------------------------------------------------

import { supabase } from '../lib/supabase.js';
import { createClient, addComment } from './clientsStore.js';

export const TOPICS = {
  role: { short: 'Role', full: 'A role' },
  freelance: { short: 'Project', full: 'A freelance project' },
  hi: { short: 'Hi', full: 'Just saying hi' },
};

export const STATUSES = {
  new: 'New',
  replied: 'Replied',
  converted: 'Converted',
  closed: 'Closed',
};

function uid() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// ---------- Supabase ----------

const SELECT =
  'id, name, email, phone, business, topic, message, status, is_read, client_id, created_at, lead_notes (id, text, created_at)';

function fromRow(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone ?? '',
    business: row.business ?? '',
    topic: row.topic,
    message: row.message,
    status: row.status,
    isRead: row.is_read,
    clientId: row.client_id,
    createdAt: row.created_at,
    notes: (row.lead_notes ?? [])
      .map((n) => ({ id: n.id, text: n.text, createdAt: n.created_at }))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
  };
}

function check(error) {
  if (error) {
    console.error(error);
    // Table missing: supabase/leads.sql hasn't been run yet.
    if (error.code === '42P01' || error.code === 'PGRST205') {
      throw new Error('Leads aren’t set up in Supabase yet. Run supabase/leads.sql in the SQL Editor, then refresh.');
    }
    throw new Error('Couldn’t reach the database. Check your connection and try again.');
  }
}

const db = {
  async list() {
    const { data, error } = await supabase
      .from('leads')
      .select(SELECT)
      .order('created_at', { ascending: false });
    check(error);
    return data.map(fromRow);
  },
  async update(id, fields) {
    const row = {};
    if ('status' in fields) row.status = fields.status;
    if ('isRead' in fields) row.is_read = fields.isRead;
    if ('clientId' in fields) row.client_id = fields.clientId;
    const { data, error } = await supabase.from('leads').update(row).eq('id', id).select(SELECT).single();
    check(error);
    return fromRow(data);
  },
  async markAllRead() {
    const { error } = await supabase.from('leads').update({ is_read: true }).eq('is_read', false);
    check(error);
    return db.list();
  },
  async remove(ids) {
    const { error } = await supabase.from('leads').delete().in('id', ids);
    check(error);
  },
  async addNote(leadId, text) {
    const { error } = await supabase.from('lead_notes').insert({ lead_id: leadId, text: text.trim() });
    check(error);
    return db.get(leadId);
  },
  async deleteNote(leadId, noteId) {
    const { error } = await supabase.from('lead_notes').delete().eq('id', noteId);
    check(error);
    return db.get(leadId);
  },
  async get(id) {
    const { data, error } = await supabase.from('leads').select(SELECT).eq('id', id).single();
    check(error);
    return fromRow(data);
  },
  async loadSamples() {
    throw new Error('Sample leads are only for test mode. Send yourself a message from the contact form instead.');
  },
};

// ---------- Browser storage (test mode) ----------

const KEY = 'kd-admin-leads-v1';

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
    // Storage full or blocked.
  }
}

function mapOne(id, fn) {
  let updated = null;
  write(
    read().map((l) => {
      if (l.id !== id) return l;
      updated = fn(l);
      return updated;
    })
  );
  return updated;
}

const SAMPLES = [
  {
    name: 'Tania Rāwiri',
    email: 'tania@example.com',
    phone: '021 555 0199',
    business: 'Rāwiri Cleaning',
    topic: 'freelance',
    message:
      'Kia ora Kayde,\n\nWe’re a small cleaning business in West Auckland and don’t have a website yet. We need something that shows our services and lets people ask for a quote.\n\nWhat would that cost, and how long would it take?\n\nNgā mihi,\nTania',
  },
  {
    name: 'Josh Patel',
    email: 'josh@example.com',
    topic: 'role',
    message:
      'Hi Kayde, we’re hiring a junior full-stack developer at our studio. Saw your portfolio and liked the .json view. Keen for a coffee and a chat next week?',
  },
  {
    name: 'Matiu Hohaia',
    email: 'matiu@example.com',
    topic: 'hi',
    message: 'Just wanted to say the Auckland clock in your header is a mean touch. Good luck with the business!',
  },
];

const local = {
  async list() {
    return read();
  },
  async update(id, fields) {
    return mapOne(id, (l) => ({ ...l, ...fields }));
  },
  async markAllRead() {
    write(read().map((l) => ({ ...l, isRead: true })));
    return read();
  },
  async remove(ids) {
    const gone = new Set(ids);
    write(read().filter((l) => !gone.has(l.id)));
  },
  async addNote(leadId, text) {
    const note = { id: uid(), text: text.trim(), createdAt: new Date().toISOString() };
    return mapOne(leadId, (l) => ({ ...l, notes: [...(l.notes ?? []), note] }));
  },
  async deleteNote(leadId, noteId) {
    return mapOne(leadId, (l) => ({ ...l, notes: (l.notes ?? []).filter((n) => n.id !== noteId) }));
  },
  async loadSamples() {
    const now = Date.now();
    const added = SAMPLES.map((s, i) => ({
      id: uid(),
      ...s,
      status: 'new',
      isRead: i > 0,
      clientId: null,
      createdAt: new Date(now - (i * 20 + 2) * 3600 * 1000).toISOString(),
      notes: [],
    }));
    write([...added, ...read()]);
    return read();
  },
};

const store = supabase ? db : local;

// ---------- Public API (used by the dashboard) ----------

export const listLeads = () => store.list();
export const updateLead = (id, fields) => store.update(id, fields);
export const markAllLeadsRead = () => store.markAllRead();
export const deleteLeads = (ids) => store.remove(ids);
export const addLeadNote = (leadId, text) => store.addNote(leadId, text);
export const deleteLeadNote = (leadId, noteId) => store.deleteNote(leadId, noteId);
export const loadSampleLeads = () => store.loadSamples();

// Creates a client from the lead (name + email, with their message saved as
// the first note), then marks the lead as converted and links the two.
// Returns { lead, client }.
export async function convertLead(lead) {
  const created = await createClient({
    name: lead.name,
    email: lead.email,
    phone: lead.phone ?? '',
    business: lead.business ?? '',
  });
  const note = `From the contact form (${TOPICS[lead.topic]?.full ?? lead.topic}):\n\n${lead.message}`;
  const client = (await addComment(created.id, note)) ?? created;
  const updated = await store.update(lead.id, { status: 'converted', clientId: client.id, isRead: true });
  return { lead: updated, client };
}
