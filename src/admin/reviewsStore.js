// ---------------------------------------------------------------------------
// Reviews for the admin dashboard.
//
// With Supabase connected they live in the `reviews` table (supabase/reviews.sql).
// Without it (test mode) they're kept in this browser, shared with the public
// /review form's test mode so you can try the whole flow locally.
//
// Shape: { id, name, business, email, rating, quote, consent, source, status,
//          featured, createdAt }
//   source: 'form' | 'manual'    status: 'pending' | 'published' | 'hidden'
// ---------------------------------------------------------------------------

import { supabase } from '../lib/supabase.js';
import { LOCAL_KEY } from '../lib/reviewsApi.js';

export const REVIEW_STATUSES = { pending: 'Pending', published: 'Published', hidden: 'Private' };

function uid() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function check(error) {
  if (error) {
    console.error(error);
    if (error.code === '42P01' || error.code === 'PGRST205') {
      throw new Error('Reviews aren’t set up in Supabase yet. Run supabase/reviews.sql in the SQL Editor, then refresh.');
    }
    if (error.code === '23514') {
      throw new Error('Check the review: it needs a name, a rating and at least 10 characters of text.');
    }
    throw new Error('Couldn’t reach the database. Check your connection and try again.');
  }
}

function clean(f) {
  return {
    name: (f.name ?? '').trim(),
    business: (f.business ?? '').trim(),
    email: (f.email ?? '').trim().toLowerCase(),
    rating: Math.min(5, Math.max(1, Number(f.rating) || 5)),
    quote: (f.quote ?? '').trim(),
    consent: !!f.consent,
  };
}

// ---------- Supabase ----------

const SELECT = 'id, name, business, email, rating, quote, consent, source, status, featured, created_at';

function fromRow(r) {
  return {
    id: r.id,
    name: r.name,
    business: r.business,
    email: r.email,
    rating: r.rating,
    quote: r.quote,
    consent: r.consent,
    source: r.source,
    status: r.status,
    featured: r.featured,
    createdAt: r.created_at,
  };
}

const db = {
  async list() {
    const { data, error } = await supabase.from('reviews').select(SELECT).order('created_at', { ascending: false });
    check(error);
    return data.map(fromRow);
  },
  async create(f) {
    const row = { ...clean(f), source: 'manual', status: f.status || 'published', featured: !!f.featured };
    const { data, error } = await supabase.from('reviews').insert(row).select(SELECT).single();
    check(error);
    return fromRow(data);
  },
  async update(id, patch) {
    const row = {};
    for (const k of ['name', 'business', 'email', 'rating', 'quote', 'consent']) {
      if (k in patch) row[k] = clean({ ...patch })[k];
    }
    if ('status' in patch) row.status = patch.status;
    if ('featured' in patch) row.featured = !!patch.featured;
    const { data, error } = await supabase.from('reviews').update(row).eq('id', id).select(SELECT).single();
    check(error);
    return fromRow(data);
  },
  async remove(id) {
    const { error } = await supabase.from('reviews').delete().eq('id', id);
    check(error);
  },
  async loadSamples() {
    throw new Error('Sample reviews are only for test mode. Use “Add review” or send yourself the review link.');
  },
};

// ---------- Browser storage (test mode) ----------

function read() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY)) ?? [];
  } catch {
    return [];
  }
}

function write(list) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
}

const SAMPLES = [
  { name: 'Grace Liu', business: 'Liu Physio', email: 'grace@example.com', rating: 5, status: 'pending',
    quote: 'Kayde built our booking site in under two weeks. Clients book online now instead of ringing us all day, and it looks great on phones.' },
  { name: 'Aroha Ngata', business: 'Ngata Landscaping', email: 'aroha@example.com', rating: 5, status: 'published', featured: true,
    quote: 'Friendly, fast and explained everything in plain English. The quote form has already brought in three new jobs.' },
  { name: 'Sione Taufa', business: 'Taufa Fitness', email: 'sione@example.com', rating: 4, status: 'published',
    quote: 'Great work on our class timetable page. Members love being able to check times on their phone.' },
];

const local = {
  async list() {
    return read();
  },
  async create(f) {
    const r = { id: uid(), ...clean(f), source: 'manual', status: f.status || 'published', featured: !!f.featured, createdAt: new Date().toISOString() };
    write([r, ...read()]);
    return r;
  },
  async update(id, patch) {
    let updated = null;
    write(
      read().map((r) => {
        if (r.id !== id) return r;
        const base = { ...r, ...patch };
        updated = { ...base, ...clean(base), status: base.status, featured: !!base.featured };
        return updated;
      })
    );
    return updated;
  },
  async remove(id) {
    write(read().filter((r) => r.id !== id));
  },
  async loadSamples() {
    const now = Date.now();
    const added = SAMPLES.map((s, i) => ({
      id: uid(),
      featured: false,
      ...s,
      consent: true,
      source: 'form',
      createdAt: new Date(now - i * 4 * 86400000).toISOString(),
    }));
    write([...added, ...read()]);
    return read();
  },
};

const store = supabase ? db : local;

export const listReviews = () => store.list();
export const createReview = (f) => store.create(f);
export const updateReview = (id, patch) => store.update(id, patch);
export const deleteReview = (id) => store.remove(id);
export const loadSampleReviews = () => store.loadSamples();
