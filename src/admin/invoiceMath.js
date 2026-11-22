// Money and date maths for invoices. Kept in one place so the list, panel,
// editor and printed invoice always agree.

export const KINDS = {
  full: { label: 'Full amount', sub: 'Whole job at once' },
  deposit: { label: 'Deposit', sub: 'Part upfront' },
  final: { label: 'Final balance', sub: 'What’s left' },
};

export const STATES = {
  draft: 'Draft',
  sent: 'Sent',
  part: 'Part-paid',
  overdue: 'Overdue',
  paid: 'Paid',
};

export const TERMS = [
  { id: '7', label: '7 days' },
  { id: '14', label: '14 days' },
  { id: '20th', label: '20th of next month' },
  { id: '30', label: '30 days' },
];

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

export function num(v) {
  const n = parseFloat(String(v ?? '').replace(/[$,\s]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

export function money(n) {
  return `$${round2(n).toLocaleString('en-NZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Short form for the list and stats: $1,250 or $79.50.
export function moneyShort(n) {
  const v = round2(n);
  return `$${v.toLocaleString('en-NZ', { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
}

// Dates are stored as 'YYYY-MM-DD' (local day, no time zone surprises).
export function todayISO() {
  return toISO(new Date());
}

export function toISO(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function fromISO(iso) {
  const [y, m, d] = String(iso).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function dueFromTerms(issuedISO, term) {
  const d = fromISO(issuedISO);
  if (term === '20th') return toISO(new Date(d.getFullYear(), d.getMonth() + 1, 20));
  d.setDate(d.getDate() + (parseInt(term, 10) || 14));
  return toISO(d);
}

export function niceDate(iso) {
  if (!iso) return '—';
  return fromISO(iso).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function shortDay(iso) {
  return fromISO(iso).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' });
}

export function lineAmount(l) {
  return round2(num(l.qty) * num(l.rate));
}

// Everything worked out for one invoice.
export function calc(inv) {
  const job = round2((inv.lines ?? []).reduce((a, l) => a + lineAmount(l), 0));
  let subtotal = job;
  if (inv.kind === 'deposit') subtotal = round2((job * num(inv.depositPct)) / 100);
  if (inv.kind === 'final') subtotal = round2(Math.max(0, job - num(inv.lessAmount)));
  const gst = round2((subtotal * num(inv.gstRate)) / 100);
  const total = round2(subtotal + gst);
  const paid = round2((inv.payments ?? []).reduce((a, p) => a + num(p.amount), 0));
  const owing = round2(Math.max(0, total - paid));

  const today = fromISO(todayISO());
  const daysLeft = inv.dueOn ? Math.round((fromISO(inv.dueOn) - today) / 86400000) : null;

  let state = 'draft';
  if (inv.status === 'sent') {
    if (total > 0 && owing === 0) state = 'paid';
    else if (daysLeft !== null && daysLeft < 0) state = 'overdue';
    else if (paid > 0) state = 'part';
    else state = 'sent';
  }
  return { job, subtotal, gst, total, paid, owing, daysLeft, state };
}

// INV-0001, INV-0002 … one higher than the biggest number used so far.
export function nextNumber(invoices) {
  const max = invoices.reduce((m, inv) => {
    const n = parseInt(String(inv.number).replace(/\D/g, ''), 10);
    return Number.isFinite(n) && n > m ? n : m;
  }, 0);
  return `INV-${String(max + 1).padStart(4, '0')}`;
}
