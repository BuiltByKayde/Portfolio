import { useState } from 'react';
import Icon from './Icon.jsx';
import { initials, tint } from './format.js';
import { fromISO, money, moneyShort, niceDate, todayISO } from './invoiceMath.js';
import { TIERS, defaultReference, minutesLabel, periodLabel, shiftPeriod } from './carePlansStore.js';
import { MONTH_STATES, hoursInfo } from './CarePlanList.jsx';

function monthsSince(iso) {
  const s = fromISO(iso);
  const n = new Date();
  return Math.max(0, (n.getFullYear() - s.getFullYear()) * 12 + n.getMonth() - s.getMonth());
}

export function CarePlanView({
  plan,
  client,
  period,
  monthOf,
  onClose,
  onEdit,
  onDelete,
  onCreateInvoice,
  onOpenInvoice,
  onOpenClient,
  onAddLog,
  onDeleteLog,
  onStatus,
}) {
  const [what, setWhat] = useState('');
  const [mins, setMins] = useState('');
  const [busy, setBusy] = useState(false);
  const month = periodLabel(period).split(' ')[0];
  const m = monthOf(plan);
  const h = hoursInfo(plan, period);
  const active = plan.status === 'active';
  const logs = plan.logs.filter((l) => l.loggedOn.startsWith(period));
  const elapsed = monthsSince(plan.startedOn);
  const startPeriod = plan.startedOn.slice(0, 7);
  const history = [-3, -2, -1]
    .map((n) => shiftPeriod(period, n))
    .filter((p) => p >= startPeriod)
    .map((p) => ({ period: p, state: monthOf(plan, p).state }));

  async function log(e) {
    e.preventDefault();
    const n = parseInt(mins, 10);
    if (!what.trim() || !(n > 0)) return;
    if ((await onAddLog({ description: what, minutes: n })) !== false) {
      setWhat('');
      setMins('');
    }
  }

  async function create() {
    setBusy(true);
    await onCreateInvoice();
    setBusy(false);
  }

  return (
    <div className="apanel">
      <div className="apanel__bar">
        <button type="button" className="aicon" aria-label="Close care plan" title="Close" onClick={onClose}>
          <Icon name="close" />
        </button>
        <div className="apanel__actions">
          <button type="button" className="aicon" aria-label="Edit care plan" title="Edit" onClick={onEdit}>
            <Icon name="edit" />
          </button>
          <button type="button" className="aicon" aria-label="Delete care plan" title="Delete" onClick={onDelete}>
            <Icon name="trash" />
          </button>
        </div>
      </div>

      <div className="apanel__scroll">
        <div className="apanel__hero">
          <span className="aavatar aavatar--lg" style={{ '--tint': tint(plan.clientId) }} aria-hidden="true">
            {initials(client?.name || '?')}
          </span>
          <div>
            <h2>{client?.name || 'Unknown client'}</h2>
            <p>{client?.business || 'No business name'}</p>
          </div>
        </div>

        <div className="cp-plan">
          <strong>
            {moneyShort(plan.price)} <small>/ month</small>
          </strong>
          <span>
            {plan.tier} plan ·{' '}
            {plan.minutesIncluded ? `up to ${minutesLabel(plan.minutesIncluded)} of changes` : 'no change time included'}
          </span>
        </div>

        <div className="apanel__section">
          <h3 className="apanel__heading apanel__heading--row">
            <span>{month} invoice</span>
            {active ? (
              <span className={`astatus astatus--${m.state === 'none' ? 'cp-none' : m.state}`}>{MONTH_STATES[m.state]}</span>
            ) : (
              <span className="astatus astatus--cp-off">{plan.status === 'paused' ? 'Paused' : 'Ended'}</span>
            )}
          </h3>
          <div className="cp-invrow">
            {!active ? (
              <span>This plan is {plan.status}, so nothing is billed.</span>
            ) : m.inv ? (
              <>
                <span>
                  {m.inv.number} · {money(m.total)}
                  {m.state === 'draft' && ' · check it, then send'}
                  {m.state === 'sent' && ` · due ${niceDate(m.inv.dueOn)}`}
                </span>
                <button type="button" className="abtn abtn--sm" onClick={() => onOpenInvoice(m.inv.id)}>
                  Open invoice
                </button>
              </>
            ) : (
              <>
                <span>Not created yet for {month}.</span>
                <button type="button" className="abtn abtn--primary abtn--sm" onClick={create} disabled={busy}>
                  {busy ? 'Creating…' : 'Create invoice'}
                </button>
              </>
            )}
          </div>
          {active && m.state === 'overdue' && (
            <p className="anotice anotice--late">
              Payment missed. Open the invoice to send a reminder. Your agreement lets you pause the plan after
              written notice.
            </p>
          )}
          {history.length > 0 && (
            <div className="cp-hist" aria-label="Recent months">
              {history.map((x) => (
                <span key={x.period} className={`cp-hist__m is-${x.state}`} title={MONTH_STATES[x.state]}>
                  {periodLabel(x.period, true)}
                  <small>{x.state === 'paid' ? 'Paid' : x.state === 'overdue' ? 'Missed' : x.state === 'none' ? '—' : MONTH_STATES[x.state]}</small>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="apanel__section">
          <h3 className="apanel__heading apanel__heading--row">
            <span>Changes this month</span>
            <span className="amuted">{h.label}</span>
          </h3>
          {h.hasLimit && h.level === 'over' && (
            <p className="anotice cp-warn" style={{ marginTop: 0 }}>
              {minutesLabel(h.used - plan.minutesIncluded)} over the limit. Add it to an invoice at your hourly rate, or
              let it slide this once.
            </p>
          )}
          {logs.length === 0 ? (
            <p className="amuted apanel__none">Nothing logged yet this month.</p>
          ) : (
            <ul className="alines">
              {logs.map((l) => (
                <li key={l.id} className="aline">
                  <span>{l.description}</span>
                  <span className="apay__right">
                    <strong>{minutesLabel(l.minutes)}</strong>
                    <button type="button" className="anote__delete" onClick={() => onDeleteLog(l.id)} aria-label={`Remove ${l.description}`}>
                      Remove
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
          <form className="cp-logform" onSubmit={log}>
            <label>
              <span className="visually-hidden">What you did</span>
              <input type="text" placeholder="What you did" maxLength={300} value={what} onChange={(e) => setWhat(e.target.value)} />
            </label>
            <label>
              <span className="visually-hidden">Minutes</span>
              <input type="text" inputMode="numeric" placeholder="Mins" value={mins} onChange={(e) => setMins(e.target.value)} />
            </label>
            <button type="submit" className="abtn abtn--sm" disabled={!what.trim() || !(parseInt(mins, 10) > 0)}>
              Log time
            </button>
          </form>
        </div>

        <div className="apanel__section">
          <h3 className="apanel__heading">Plan details</h3>
          <ul className="alines">
            <li className="aline">
              <span>Payment reference</span>
              <strong className="mono">{plan.reference || '—'}</strong>
            </li>
            <li className="aline">
              <span>Started</span>
              <strong>{niceDate(plan.startedOn)}</strong>
            </li>
            <li className="aline">
              <span>Minimum term</span>
              <strong>
                {plan.minTermMonths
                  ? elapsed >= plan.minTermMonths
                    ? `${plan.minTermMonths} months (done, now month to month)`
                    : `${plan.minTermMonths} months (${plan.minTermMonths - elapsed} to go)`
                  : 'None'}
              </strong>
            </li>
          </ul>
          <div className="aactions">
            {client && (
              <button type="button" className="abtn abtn--sm" onClick={onOpenClient}>
                Open client
              </button>
            )}
            {plan.status === 'active' && (
              <button type="button" className="abtn abtn--sm" onClick={() => onStatus('paused')}>
                Pause plan
              </button>
            )}
            {plan.status !== 'active' && (
              <button type="button" className="abtn abtn--sm abtn--primary" onClick={() => onStatus('active')}>
                Resume plan
              </button>
            )}
            {plan.status !== 'ended' && (
              <button type="button" className="abtn abtn--sm" onClick={() => onStatus('ended')}>
                End plan
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function CarePlanForm({ initial, mode, clients, plans, onSave, onCancel }) {
  const [f, setF] = useState(
    initial ?? {
      clientId: '',
      tier: 'Standard',
      price: '99',
      minutesIncluded: '60',
      reference: '',
      startedOn: todayISO(),
      minTermMonths: '6',
      status: 'active',
    }
  );
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (patch) => setF((p) => ({ ...p, ...patch }));
  const taken = new Set(plans.filter((p) => p.status !== 'ended' && p.id !== f.id).map((p) => p.clientId));

  async function submit(e) {
    e.preventDefault();
    if (!f.clientId) return setErr('Pick the client this plan is for.');
    if (!(parseFloat(f.price) > 0)) return setErr('Add the monthly price.');
    setErr('');
    setSaving(true);
    await onSave(f);
    setSaving(false);
  }

  return (
    <form className="apanel" onSubmit={submit}>
      <div className="apanel__bar">
        <button type="button" className="aicon" aria-label="Cancel" title="Cancel" onClick={onCancel}>
          <Icon name="close" />
        </button>
        <span className="apanel__title">{mode === 'new' ? 'New care plan' : 'Edit care plan'}</span>
        <span style={{ width: 40 }} />
      </div>
      <div className="apanel__scroll aform">
        <label className="afield">
          <span>Client</span>
          <select
            value={f.clientId || ''}
            disabled={mode === 'edit'}
            onChange={(e) => {
              const c = clients.find((x) => x.id === e.target.value);
              set({ clientId: e.target.value, reference: f.reference || (c ? defaultReference(c) : '') });
            }}
          >
            <option value="">Choose a client…</option>
            {clients
              .slice()
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((c) => (
                <option key={c.id} value={c.id} disabled={taken.has(c.id)}>
                  {c.name}
                  {c.business ? ` — ${c.business}` : ''}
                  {taken.has(c.id) ? ' (already on a plan)' : ''}
                </option>
              ))}
          </select>
        </label>

        <div role="group" aria-labelledby="cp-tier-label">
          <span id="cp-tier-label" className="rvf-label">
            Plan
          </span>
          <div className="cp-tiers">
            {TIERS.map((t) => (
              <button
                key={t.name}
                type="button"
                className="cp-tierbtn"
                aria-pressed={f.tier === t.name}
                onClick={() => set({ tier: t.name, price: String(t.price), minutesIncluded: String(t.minutes) })}
              >
                <strong>{t.name}</strong>
                <span>${t.price}/mo</span>
                <small>{t.blurb}</small>
              </button>
            ))}
          </div>
        </div>

        <div className="cp-two">
          <label className="afield">
            <span>Price per month ($)</span>
            <input type="text" inputMode="decimal" value={f.price} onChange={(e) => set({ price: e.target.value })} />
          </label>
          <label className="afield">
            <span>Change time included (minutes)</span>
            <input type="text" inputMode="numeric" value={f.minutesIncluded} onChange={(e) => set({ minutesIncluded: e.target.value })} />
          </label>
        </div>

        <label className="afield">
          <span>Payment reference</span>
          <input type="text" maxLength={40} placeholder="CARE-BUSINESS" value={f.reference} onChange={(e) => set({ reference: e.target.value.toUpperCase() })} />
          <span className="afield__hint">Stays the same every month, so their automatic payment always matches.</span>
        </label>

        <div className="cp-two">
          <label className="afield">
            <span>Start date</span>
            <input type="date" value={f.startedOn} onChange={(e) => set({ startedOn: e.target.value })} />
          </label>
          <label className="afield">
            <span>Minimum term (months)</span>
            <input type="text" inputMode="numeric" value={f.minTermMonths} onChange={(e) => set({ minTermMonths: e.target.value })} />
          </label>
        </div>

        {err && (
          <p className="afield__error" role="alert">
            {err}
          </p>
        )}
      </div>
      <div className="aform__foot">
        <button type="button" className="abtn" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="abtn abtn--primary" disabled={saving}>
          {saving ? 'Saving…' : mode === 'new' ? 'Start plan' : 'Save changes'}
        </button>
      </div>
    </form>
  );
}
