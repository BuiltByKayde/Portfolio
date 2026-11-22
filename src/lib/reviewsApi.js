// Public side of reviews: the /review form sends one, the portfolio reads the
// published ones. Plain fetch keeps the Supabase library out of the public site.
// Without Supabase (test mode) everything uses this browser's storage instead,
// shared with the admin dashboard's test mode.

const URL_ = import.meta.env.VITE_SUPABASE_URL;
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const LOCAL_KEY = 'kd-admin-reviews-v1';
const live = Boolean(URL_ && KEY);

function readLocal() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY)) ?? [];
  } catch {
    return [];
  }
}

export async function submitReview({ name, business, email, rating, quote, consent }) {
  const row = { name, business, email, rating, quote, consent };
  if (!live) {
    const id = globalThis.crypto?.randomUUID?.() ?? String(Date.now());
    const review = { id, ...row, source: 'form', status: 'pending', featured: false, createdAt: new Date().toISOString() };
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify([review, ...readLocal()]));
    } catch {
      // ignore
    }
    return;
  }
  const res = await fetch(`${URL_}/rest/v1/reviews`, {
    method: 'POST',
    headers: { apikey: KEY, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify(row),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.message || `HTTP ${res.status}`);
    err.friendly = body.code === 'P0001' ? body.message : '';
    throw err;
  }
}

// Published reviews, featured first, newest first. Only public-safe fields.
export async function fetchPublishedReviews() {
  if (!live) {
    return readLocal()
      .filter((r) => r.status === 'published' && r.consent)
      .sort((a, b) => Number(b.featured) - Number(a.featured) || b.createdAt.localeCompare(a.createdAt))
      .map((r) => ({
        id: r.id,
        firstName: String(r.name).trim().split(/\s+/)[0],
        business: r.business,
        rating: r.rating,
        quote: r.quote,
        featured: r.featured,
      }));
  }
  const q = 'select=id,first_name,business,rating,quote,featured,created_at&order=featured.desc,created_at.desc&limit=12';
  const res = await fetch(`${URL_}/rest/v1/reviews?${q}`, { headers: { apikey: KEY } });
  if (!res.ok) return [];
  const rows = await res.json();
  return rows.map((r) => ({
    id: r.id,
    firstName: r.first_name,
    business: r.business,
    rating: r.rating,
    quote: r.quote,
    featured: r.featured,
  }));
}
