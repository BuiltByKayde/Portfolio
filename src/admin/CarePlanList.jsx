import Icon from './Icon.jsx';
import { initials, tint } from './format.js';
import { moneyShort } from './invoiceMath.js';
import { minutesLabel, minutesUsed, periodLabel } from './carePlansStore.js';

export const MONTH_STATES = {
  none: 'Not invoiced',
  draft: 'Draft ready',
  sent: 'Sent',
  part: 'Part-paid',
  overdue: 'Overdue',
  paid: 'Paid',
};

export function hoursInfo(plan, period) {
  const used = minutesUsed(plan, period);
  if (!plan.minutesIncluded) {
    return { used, label: used ? `${minutesLabel(used)} logged (none included)` : 'No changes included', pct: 0, level: used ? 'over' : '', hasLimit: false };
  }
  const over = used > plan.minutesIncluded;
  const near = !over && used >= plan.minutesIncluded * 0.8;
  return {
    used,
    label: `${minutesLabel(used)} of ${minutesLabel(plan.minutesIncluded)}`,
    pct: Math.min(100, Math.round((used / plan.minutesIncluded) * 100)),
    level: over ? 'over' : near ? 'near' : '',
    hasLimit: true,
  };
}

export default function CarePlanList({
  plans,
  clientsById,
  loading,
  query,
  period,
  monthOf,
  selectedId,
  onOpen,
  onNew,
  onRefresh,
  onCreateAll,
  creating,
}) {
  const month = periodLabel(period).split(' ')[0];
  const active = plans.filter((p) => p.status === 'active');
  const paused = plans.filter((p) => p.status === 'paused').length;
  const monthly = active.reduce((a, p) => a + p.price, 0);
  const months = active.map((p) => monthOf(p));
  const unpaid = months.filter((m) => ['sent', 'part', 'overdue'].includes(m.state));
  const missed = months.filter((m) => m.state === 'overdue').length;
  const toInvoice = active.filter((p) => monthOf(p).state === 'none');

  const q = query.toLowerCase();
  const visible = plans.filter((p) => {
    const c = clientsById.get(p.clientId);
    return !q || [c?.name, c?.business, p.tier, p.reference].join(' ').toLowerCase().includes(q);
  });

  return (
    <>
      <div className="astats">
        <div className="astat">
          <span className="astat__label">
            <span className="astat__dot" style={{ background: '#3fb68b' }} /> Monthly income
          </span>
          <span className="astat__value">
            {moneyShort(monthly)} <small className="cp-per">/ month</small>
          </span>
          <span className="astat__sub">{moneyShort(monthly * 12)} a year if nothing changes</span>
        </div>
        <div className="astat">
          <span className="astat__label">
            <span className="astat__dot" style={{ background: 'var(--accent)' }} /> Active plans
          </span>
          <span className="astat__value">{active.length}</span>
          <span className="astat__sub">{paused ? `${paused} paused` : 'None paused'}</span>
        </div>
        <div className={`astat${missed ? ' astat--warn' : ''}`}>
          <span className="astat__label">
            <span className="astat__dot" style={{ background: '#e5484d' }} /> Unpaid this month
          </span>
          <span className="astat__value">{moneyShort(unpaid.reduce((a, m) => a + m.owing, 0))}</span>
          <span className="astat__sub">
            {missed
              ? `${missed} missed payment${missed === 1 ? '' : 's'}`
              : unpaid.length
                ? `Waiting on ${unpaid.length}`
                : 'All paid up'}
          </span>
        </div>
      </div>

      {toInvoice.length > 0 && (
        <div className="cp-banner" role="status">
          <div className="cp-banner__text">
            <strong>
              {toInvoice.length} {toInvoice.length === 1 ? 'plan hasn’t' : 'plans haven’t'} been invoiced for {month}
            </strong>
            <span>Creates a draft invoice for each one, with the plan and month filled in. You check them, then send.</span>
          </div>
          <button type="button" className="abtn abtn--primary abtn--sm" onClick={() => onCreateAll(toInvoice)} disabled={creating}>
            {creating ? 'Creating…' : `Create ${month} invoices`}
          </button>
        </div>
      )}

      <section className="alist" aria-label="Care plans">
        {loading ? (
          <p className="alist__empty">Loading care plans…</p>
        ) : plans.length === 0 ? (
          <div className="alist__empty">
            <span className="alist__empty-icon">
              <Icon name="shield" size={28} />
            </span>
            <h2>No care plans yet</h2>
            <p>Put a client on a monthly plan to look after their site, and track what they pay and use.</p>
            <div className="alist__empty-actions">
              <button type="button" className="abtn abtn--primary" onClick={onNew}>
                <Icon name="plus" size={18} /> New care plan
              </button>
            </div>
          </div>
        ) : visible.length === 0 ? (
          <p className="alist__empty">No care plans match “{query}”.</p>
        ) : (
          <>
            <div className="cp-head" aria-hidden="true">
              <span>Client</span>
              <span>Plan</span>
              <span>Price</span>
              <span>Changes used ({month})</span>
              <span>{month} invoice</span>
              <button type="button" className="aicon cp-head__refresh" aria-label="Refresh" title="Refresh" onClick={onRefresh} aria-hidden="false">
                <Icon name="refresh" size={18} />
              </button>
            </div>
            <ul className="alist__rows">
              {visible.map((p) => {
                const c = clientsById.get(p.clientId);
                const h = hoursInfo(p, period);
                const m = monthOf(p);
                const off = p.status !== 'active';
                return (
                  <li key={p.id} className={`arow arow--cp${p.id === selectedId ? ' is-selected' : ''}${off ? ' is-off' : ''}`}>
                    <button type="button" className="arow__open" onClick={() => onOpen(p.id)}>
                      <span className="cp-client">
                        <span className="aavatar" style={{ '--tint': tint(p.clientId) }} aria-hidden="true">
                          {initials(c?.name || '?')}
                        </span>
                        <span className="cp-who">
                          <span className="cp-who__name">{c?.name || 'Unknown client'}</span>
                          <span className="cp-who__biz">{c?.business || ''}</span>
                        </span>
                      </span>
                      <span className="cp-tier">
                        <span className="atag">{p.tier}</span>
                      </span>
                      <span className="cp-price">
                        {moneyShort(p.price)}
                        <small> /mo</small>
                      </span>
                      <span className={`cp-hours${h.level === 'over' ? ' is-over' : ''}`}>
                        <span>{h.label}</span>
                        {h.hasLimit && (
                          <span className="cp-bar" aria-hidden="true">
                            <span className={`cp-bar__fill${h.level ? ` is-${h.level}` : ''}`} style={{ width: `${h.pct}%` }} />
                          </span>
                        )}
                      </span>
                      <span className="cp-inv">
                        {off ? (
                          <span className="astatus astatus--cp-off">{p.status === 'paused' ? 'Paused' : 'Ended'}</span>
                        ) : (
                          <span className={`astatus astatus--${m.state === 'none' ? 'cp-none' : m.state}`}>{MONTH_STATES[m.state]}</span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>
    </>
  );
}
