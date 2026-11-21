const time = new Intl.DateTimeFormat('en-NZ', { hour: 'numeric', minute: '2-digit' });
const dayMonth = new Intl.DateTimeFormat('en-NZ', { day: 'numeric', month: 'short' });
const full = new Intl.DateTimeFormat('en-NZ', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

// Gmail-style: time for today, "21 Nov" for this year, "21/11/25" for older.
export function shortDate(iso) {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return time.format(d);
  if (d.getFullYear() === now.getFullYear()) return dayMonth.format(d);
  return d.toLocaleDateString('en-NZ', { day: 'numeric', month: 'numeric', year: '2-digit' });
}

export function fullDate(iso) {
  return full.format(new Date(iso));
}

export function initials(name) {
  return (name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');
}

export function domain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

// Stable avatar tint per client, picked from a small palette that reads on dark.
const tints = ['#4f86f7', '#e8a33d', '#3fb68b', '#c77dff', '#ef6f6c', '#2bb3c0'];
export function tint(seed = '') {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return tints[h % tints.length];
}
