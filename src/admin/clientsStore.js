// ---------------------------------------------------------------------------
// Client data.
//
// With Supabase connected (see src/lib/supabase.js) clients and notes live in
// the `clients` and `client_notes` tables (supabase/schema.sql), protected by
// Row Level Security. Without it (test mode) they're saved in this browser
// (localStorage) only.
//
// Every function is async and returns the same plain shape either way:
// { id, name, business, email, phone, website, createdAt, updatedAt,
//   comments: [{ id, text, createdAt }] }
// ---------------------------------------------------------------------------

import { supabase } from '../lib/supabase.js';

export function normaliseUrl(value) {
  const v = (value ?? '').trim();
  if (!v) return '';
  return /^https?:\/\//i.test(v) ? v : `https://${v}`;
}

function clean(fields) {
  return {
    name: (fields.name ?? '').trim(),
    business: (fields.business ?? '').trim(),
    email: (fields.email ?? '').trim(),
    phone: (fields.phone ?? '').trim(),
    website: normaliseUrl(fields.website),
  };
}

function uid() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// ---------- Supabase ----------

const SELECT = 'id, name, business, email, phone, website, created_at, updated_at, client_notes (id, text, created_at)';

function fromRow(row) {
  return {
    id: row.id,
    name: row.name,
    business: row.business,
    email: row.email,
    phone: row.phone,
    website: row.website,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    comments: (row.client_notes ?? [])
      .map((n) => ({ id: n.id, text: n.text, createdAt: n.created_at }))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
  };
}

function check(error) {
  if (error) {
    console.error(error);
    throw new Error('Couldn’t reach the database. Check your connection and try again.');
  }
}

async function dbGet(id) {
  const { data, error } = await supabase.from('clients').select(SELECT).eq('id', id).single();
  check(error);
  return fromRow(data);
}

const db = {
  async list() {
    const { data, error } = await supabase
      .from('clients')
      .select(SELECT)
      .order('created_at', { ascending: false });
    check(error);
    return data.map(fromRow);
  },
  async create(fields) {
    const { data, error } = await supabase.from('clients').insert(clean(fields)).select(SELECT).single();
    check(error);
    return fromRow(data);
  },
  async update(id, fields) {
    const { data, error } = await supabase
      .from('clients')
      .update(clean(fields))
      .eq('id', id)
      .select(SELECT)
      .single();
    check(error);
    return fromRow(data);
  },
  async remove(ids) {
    const { error } = await supabase.from('clients').delete().in('id', ids);
    check(error);
  },
  async addComment(clientId, text) {
    const { error } = await supabase.from('client_notes').insert({ client_id: clientId, text: text.trim() });
    check(error);
    return dbGet(clientId);
  },
  async deleteComment(clientId, commentId) {
    const { error } = await supabase.from('client_notes').delete().eq('id', commentId);
    check(error);
    return dbGet(clientId);
  },
  async loadSamples(samples) {
    for (const { note, createdAt, ...fields } of samples) {
      const { data, error } = await supabase
        .from('clients')
        .insert({ ...clean(fields), created_at: createdAt })
        .select('id')
        .single();
      check(error);
      const res = await supabase.from('client_notes').insert({ client_id: data.id, text: note });
      check(res.error);
    }
    return db.list();
  },
};

// ---------- Browser storage (test mode) ----------

const KEY = 'kd-admin-clients-v1';

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
    // Storage full or blocked; changes stay in memory for this visit.
  }
}

function mapOne(id, fn) {
  let updated = null;
  write(
    read().map((c) => {
      if (c.id !== id) return c;
      updated = fn(c);
      return updated;
    })
  );
  return updated;
}

const local = {
  async list() {
    return read();
  },
  async create(fields) {
    const now = new Date().toISOString();
    const client = { id: uid(), ...clean(fields), createdAt: now, updatedAt: now, comments: [] };
    write([client, ...read()]);
    return client;
  },
  async update(id, fields) {
    return mapOne(id, (c) => ({ ...c, ...clean(fields), updatedAt: new Date().toISOString() }));
  },
  async remove(ids) {
    const gone = new Set(ids);
    write(read().filter((c) => !gone.has(c.id)));
  },
  async addComment(clientId, text) {
    const comment = { id: uid(), text: text.trim(), createdAt: new Date().toISOString() };
    return mapOne(clientId, (c) => ({ ...c, comments: [...(c.comments ?? []), comment] }));
  },
  async deleteComment(clientId, commentId) {
    return mapOne(clientId, (c) => ({
      ...c,
      comments: (c.comments ?? []).filter((m) => m.id !== commentId),
    }));
  },
  async loadSamples(samples) {
    const added = samples.map(({ note, createdAt, ...fields }) => ({
      id: uid(),
      ...clean(fields),
      createdAt,
      updatedAt: createdAt,
      comments: [{ id: uid(), text: note, createdAt }],
    }));
    write([...added, ...read()]);
    return read();
  },
};

const store = supabase ? db : local;

// ---------- Public API (used by the dashboard) ----------

export const listClients = () => store.list();
export const createClient = (fields) => store.create(fields);
export const updateClient = (id, fields) => store.update(id, fields);
export const deleteClients = (ids) => store.remove(ids);
export const addComment = (clientId, text) => store.addComment(clientId, text);
export const deleteComment = (clientId, commentId) => store.deleteComment(clientId, commentId);

// Made-up example clients to try the dashboard with. Delete them any time.
const SAMPLES = [
  {
    name: 'Aroha Ngata',
    business: 'Ngata Landscaping',
    email: 'aroha@example.com',
    phone: '021 555 0142',
    website: 'ngata-landscaping.example.com',
    note: 'Wants a simple site with a gallery of past jobs and a quote form.',
  },
  {
    name: 'Ben Walker',
    business: 'Walker Plumbing',
    email: '',
    phone: '022 555 0188',
    website: 'walker-plumbing.example.com',
    note: 'Prefers phone calls. Current site is slow on mobile.',
  },
  {
    name: 'Mei Lin',
    business: 'Little Dumpling Co.',
    email: 'mei@example.com',
    phone: '',
    website: '',
    note: 'Needs an online menu and opening hours. No website yet.',
  },
  {
    name: 'Sione Taufa',
    business: 'Taufa Fitness',
    email: 'sione@example.com',
    phone: '027 555 0123',
    website: 'taufa-fitness.example.com',
    note: 'Class timetable + booking. Follow up next week.',
  },
];

export async function loadSampleClients() {
  const now = Date.now();
  return store.loadSamples(
    SAMPLES.map((s, i) => ({ ...s, createdAt: new Date(now - i * 26 * 3600 * 1000).toISOString() }))
  );
}
