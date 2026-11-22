import Icon from './Icon.jsx';
import { initials, tint } from './format.js';
import { calc, moneyShort, shortDay, STATES } from './invoiceMath.js';

export const INVOICE_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'draft', label: 'Drafts' },
  { id: 'unpaid', label: 'Unpaid' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'paid', label: 'Paid' },
];

const UNPAID = ['sent', 'part', 'overdue'];

export function invoiceInFilter(state, filter) {
  if (filter === 'all') return true;
  if (filter === 'unpaid') return UNPAID.includes(state);
  return state === filter;
}

function dueLabel(inv, c) {
  if (c.state === 'draft') return 'Not sent';
  if (c.state === 'paid') {
    const last = inv.payments[inv.payments.length - 1];
    return last ? `Paid ${shortDay(last.paidOn)}` : 'Paid';
  }
  if (c.daysLeft < 0) return `${-c.daysLeft} ${c.daysLeft === -1 ? 'day' : 'days'} late`;
  if (c.daysLeft === 0) return 'Due today';
  return `Due ${shortDay(inv.dueOn)}`;
}

function Stats({ items }) {
  const unpaid = items.filter((x) => UNPAID.includes(x.c.state));
  const overdue = items.filter((x) => x.c.state === 'overdue');
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const paidMonth = items.reduce(
    (sum, x) => sum + x.inv.payments.filter((p) => p.paidOn.startsWith(thisMonth)).reduce((a, p) => a + p.amount, 0),
    0
  );
  const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
  return (
    <div className="astats">
      <div className="astat">
        <span className="astat__label">
          <span className="astat__dot" style={{ background: 'var(--accent)' }} /> Outstanding
        </span>
        <span className="astat__value">{moneyShort(unpaid.reduce((a, x) => a + x.c.owing, 0))}</span>
        <span className="astat__sub">{plural(unpaid.length, 'invoice')} waiting on payment</span>
      </div>
      <div className={`astat${overdue.length ? ' astat--warn' : ''}`}>
        <span className="astat__label">
          <span className="astat__dot" style={{ background: '#e5484d' }} /> Overdue
        </span>
        <span className="astat__value">{moneyShort(overdue.reduce((a, x) => a + x.c.owing, 0))}</span>
        <span className="astat__sub">
          {overdue.length ? `${plural(overdue.length, 'invoice')} past the due date` : 'Nothing overdue'}
        </span>
      </div>
      <div className="astat">
        <span className="astat__label">
          <span className="astat__dot" style={{ background: '#3fb68b' }} /> Paid this month
        </span>
        <span className="astat__value">{moneyShort(paidMonth)}</span>
        <span className="astat__sub">Received in {now.toLocaleDateString('en-NZ', { month: 'long' })}</span>
      </div>
    </div>
  );
}

export default function InvoiceList({
  invoices,
  clientsById,
  loading,
  query,
  filter,
  onFilter,
  selectedId,
  onOpen,
  onNew,
  onRefresh,
}) {
  const items = invoices.map((inv) => ({ inv, c: calc(inv), client: clientsById.get(inv.clientId) }));
  const q = query.toLowerCase();
  const visible = items.filter(
    (x) =>
      invoiceInFilter(x.c.state, filter) &&
      (!q ||
        [x.inv.number, x.inv.title, x.client?.name, x.client?.business].join(' ').toLowerCase().includes(q))
  );

  return (
    <>
      <Stats items={items} />
      <section className="alist" aria-label="Invoices">
        <div className="alist__bar alist__bar--wrap">
          <div className="afilters afilters--inline" role="group" aria-label="Filter invoices">
            {INVOICE_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                className="achip"
                aria-pressed={filter === f.id}
                onClick={() => onFilter(f.id)}
              >
                {f.label}{' '}
                <span className="achip__n">{items.filter((x) => invoiceInFilter(x.c.state, f.id)).length}</span>
              </button>
            ))}
          </div>
          <div className="alist__bar-right">
            <button type="button" className="aicon" aria-label="Refresh" title="Refresh" onClick={onRefresh}>
              <Icon name="refresh" />
            </button>
            <span className="alist__count">
              {visible.length} of {items.length}
            </span>
          </div>
        </div>

        {loading ? (
          <p className="alist__empty">Loading invoices…</p>
        ) : items.length === 0 ? (
          <div className="alist__empty">
            <span className="alist__empty-icon">
              <Icon name="invoice" size={28} />
            </span>
            <h2>No invoices yet</h2>
            <p>Make your first one. Fill in your business details under Invoice settings so they print on it.</p>
            <div className="alist__empty-actions">
              <button type="button" className="abtn abtn--primary" onClick={onNew}>
                <Icon name="plus" size={18} /> New invoice
              </button>
            </div>
          </div>
        ) : visible.length === 0 ? (
          <p className="alist__empty">{query ? `No invoices match “${query}”.` : 'Nothing here.'}</p>
        ) : (
          <>
            <div className="ainv-head" aria-hidden="true">
              <span>Number</span>
              <span>Client</span>
              <span>For</span>
              <span>Due</span>
              <span className="num">Amount</span>
              <span>Status</span>
            </div>
            <ul className="alist__rows">
              {visible.map(({ inv, c, client }) => (
                <li key={inv.id} className={`arow arow--inv${inv.id === selectedId ? ' is-selected' : ''}`}>
                  <button type="button" className="arow__open" onClick={() => onOpen(inv.id)}>
                    <span className="ainv-num">{inv.number}</span>
                    <span className="ainv-client">
                      <span className="aavatar" style={{ '--tint': tint(inv.clientId || inv.id) }} aria-hidden="true">
                        {initials(client?.name || '?')}
                      </span>
                      <span className="ainv-client__text">
                        <span className="ainv-client__name">{client?.name || 'No client'}</span>
                        <span className="ainv-client__biz">{client?.business || ''}</span>
                      </span>
                    </span>
                    <span className="ainv-title">
                      {inv.kind !== 'full' && (
                        <span className="atag">{inv.kind === 'deposit' ? `Deposit ${inv.depositPct}%` : 'Final'}</span>
                      )}
                      <span className="ainv-title__text">{inv.title || '—'}</span>
                    </span>
                    <span className={`ainv-due${c.state === 'overdue' ? ' is-late' : ''}`}>{dueLabel(inv, c)}</span>
                    <span className="ainv-amt">
                      <strong>{moneyShort(c.total)}</strong>
                      {c.paid > 0 && c.owing > 0 && <span>{moneyShort(c.owing)} owing</span>}
                    </span>
                    <span className="ainv-status">
                      <span className={`astatus astatus--${c.state}`}>{STATES[c.state]}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </>
  );
}
