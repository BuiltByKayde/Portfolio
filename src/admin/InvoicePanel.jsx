import { useState } from 'react';
import Icon from './Icon.jsx';
import { initials, tint } from './format.js';
import { calc, money, moneyShort, niceDate, lineAmount, todayISO, STATES } from './invoiceMath.js';
import { gmailCompose, newTab } from './gmail.js';

// Pre-written email: opens the email app with the subject and a short message.
export function invoiceEmail(inv, c, client, settings) {
  const reminder = c.state === 'overdue';
  const subject = `${reminder ? 'Reminder: ' : ''}Invoice ${inv.number} from ${settings.businessName || 'builtbykayde'}`;
  const first = (client?.name || '').split(/\s+/)[0] || 'there';
  const bank = settings.bankAccount
    ? `\n\nPayment by bank transfer to ${settings.bankName ? `${settings.bankName}, ` : ''}${settings.bankAccount}, using ${inv.number} as the reference.`
    : '';
  const body = reminder
    ? `Hi ${first},\n\nJust a friendly reminder that invoice ${inv.number} (${money(c.owing)}) was due on ${niceDate(inv.dueOn)}. No stress if it’s already on its way!${bank}\n\nThanks,\n${settings.ownerName || 'Kayde'}`
    : `Hi ${first},\n\nPlease find invoice ${inv.number} for ${money(c.owing || c.total)}, due ${niceDate(inv.dueOn)}. I’ve attached it as a PDF.${bank}\n\nThanks,\n${settings.ownerName || 'Kayde'}`;
  return gmailCompose({ to: client?.email || '', subject, body });
}

export default function InvoicePanel({
  invoice: inv,
  client,
  settings,
  onClose,
  onEdit,
  onDuplicate,
  onDelete,
  onPrint,
  onMarkSent,
  onAddPayment,
  onDeletePayment,
  onOpenClient,
}) {
  const c = calc(inv);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('Bank transfer');
  const [paidOn, setPaidOn] = useState(todayISO());
  const pct = c.total ? Math.min(100, Math.round((c.paid / c.total) * 100)) : 0;
  const canPay = inv.status === 'sent' && c.owing > 0;

  async function record(e) {
    e.preventDefault();
    const n = parseFloat(String(amount).replace(/[$,\s]/g, ''));
    if (!(n > 0)) return;
    const ok = await onAddPayment({ amount: Math.min(n, c.owing), method, paidOn });
    if (ok !== false) setAmount('');
  }

  return (
    <div className="apanel">
      <div className="apanel__bar">
        <button type="button" className="aicon" aria-label="Close invoice" title="Close" onClick={onClose}>
          <Icon name="close" />
        </button>
        <div className="apanel__actions">
          <button type="button" className="aicon" aria-label="Edit invoice" title="Edit" onClick={onEdit}>
            <Icon name="edit" />
          </button>
          <button type="button" className="aicon" aria-label="Duplicate invoice" title="Duplicate" onClick={onDuplicate}>
            <Icon name="copy" />
          </button>
          <button type="button" className="aicon" aria-label="Delete invoice" title="Delete" onClick={onDelete}>
            <Icon name="trash" />
          </button>
        </div>
      </div>

      <div className="apanel__scroll">
        <div className="ainvp-head">
          <div>
            <h2>{inv.number}</h2>
            <p>{inv.title || 'No description'}</p>
          </div>
          <span className={`astatus astatus--${c.state}`}>{STATES[c.state]}</span>
        </div>

        {client ? (
          <button type="button" className="ainvp-client" onClick={onOpenClient}>
            <span className="aavatar" style={{ '--tint': tint(inv.clientId) }} aria-hidden="true">
              {initials(client.name)}
            </span>
            <span>
              <span className="ainvp-client__name">{client.name}</span>
              <span className="ainvp-client__sub">{client.business || client.email || 'Open client'}</span>
            </span>
          </button>
        ) : (
          <p className="amuted apanel__none">No client attached. Edit the invoice to pick one.</p>
        )}

        <div className="abalance">
          <div className="abalance__row">
            <span>Invoice total</span>
            <strong>{money(c.total)}</strong>
          </div>
          <div className="abalance__row">
            <span>Paid so far</span>
            <strong>{money(c.paid)}</strong>
          </div>
          <div className="abalance__row abalance__row--big">
            <span>Still owing</span>
            <strong>{money(c.owing)}</strong>
          </div>
          <div className="abar" role="img" aria-label={`${pct}% paid`}>
            <div className="abar__fill" style={{ width: `${pct}%` }} />
          </div>
        </div>

        {c.state === 'overdue' && (
          <p className="anotice anotice--late">
            {-c.daysLeft} {c.daysLeft === -1 ? 'day' : 'days'} past the due date ({niceDate(inv.dueOn)}). Send a
            friendly reminder.
          </p>
        )}
        {inv.kind === 'deposit' && (
          <p className="anotice anotice--info">
            Deposit ({inv.depositPct}%) for a {moneyShort(c.job)} job. When the work’s done, make a{' '}
            <strong>Final balance</strong> invoice for the rest.
          </p>
        )}
        {inv.status === 'draft' && (
          <p className="anotice anotice--info">
            Draft. It won’t count as owing until you mark it as sent.
          </p>
        )}

        <div className="aactions">
          <button type="button" className="abtn abtn--sm" onClick={onPrint}>
            <Icon name="print" size={16} /> Print / PDF
          </button>
          <a
            className="abtn abtn--sm"
            href={invoiceEmail(inv, c, client, settings)}
            {...newTab}
            onClick={() => {
              if (inv.status === 'draft') onMarkSent();
            }}
          >
            <Icon name="send" size={16} />{' '}
            {inv.status === 'draft' ? 'Email & mark sent' : c.state === 'overdue' ? 'Send reminder' : 'Email to client'}
          </a>
          {inv.status === 'draft' ? (
            <button type="button" className="abtn abtn--sm abtn--primary" onClick={onMarkSent}>
              <Icon name="check" size={16} /> Mark as sent
            </button>
          ) : (
            canPay && (
              <button
                type="button"
                className="abtn abtn--sm abtn--primary"
                onClick={() => onAddPayment({ amount: c.owing, method: 'Bank transfer', paidOn: todayISO() })}
              >
                <Icon name="check" size={16} /> Mark fully paid
              </button>
            )
          )}
        </div>

        <div className="apanel__section">
          <h3 className="apanel__heading">
            Payments <span className="amuted">{inv.payments.length}</span>
          </h3>
          {inv.payments.length === 0 ? (
            <p className="amuted apanel__none">No payments recorded yet.</p>
          ) : (
            <ul className="apays">
              {inv.payments.map((p) => (
                <li key={p.id} className="apay">
                  <span>
                    <strong>{money(p.amount)}</strong> <span className="apay__meta">· {p.method}</span>
                  </span>
                  <span className="apay__right">
                    <span className="apay__meta">{niceDate(p.paidOn)}</span>
                    <button
                      type="button"
                      className="anote__delete"
                      onClick={() => onDeletePayment(p.id)}
                      aria-label={`Delete ${money(p.amount)} payment`}
                    >
                      Undo
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
          {canPay && (
            <form className="arecord" onSubmit={record}>
              <label className="afield">
                <span>Amount received</span>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder={`Up to ${moneyShort(c.owing)}`}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </label>
              <label className="afield">
                <span>Date</span>
                <input type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} max={todayISO()} />
              </label>
              <label className="afield">
                <span>Method</span>
                <select value={method} onChange={(e) => setMethod(e.target.value)}>
                  <option>Bank transfer</option>
                  <option>Cash</option>
                  <option>Card</option>
                  <option>Other</option>
                </select>
              </label>
              <button type="submit" className="abtn abtn--sm" disabled={!amount.trim()}>
                Record payment
              </button>
            </form>
          )}
        </div>

        <div className="apanel__section">
          <h3 className="apanel__heading">Line items</h3>
          <ul className="alines">
            {inv.lines.map((l) => (
              <li key={l.id} className="aline">
                <span>
                  {l.qty !== 1 ? `${l.qty} × ` : ''}
                  {l.description || 'Item'}
                </span>
                <strong>{money(lineAmount(l))}</strong>
              </li>
            ))}
            {inv.kind === 'deposit' && (
              <li className="aline">
                <span>This invoice: {inv.depositPct}% deposit</span>
                <strong>{money(c.subtotal)}</strong>
              </li>
            )}
            {inv.kind === 'final' && (
              <li className="aline">
                <span>Less deposit</span>
                <strong>−{money(inv.lessAmount)}</strong>
              </li>
            )}
            {c.gst > 0 && (
              <li className="aline">
                <span>GST {inv.gstRate}%</span>
                <strong>{money(c.gst)}</strong>
              </li>
            )}
          </ul>
        </div>

        <div className="apanel__section">
          <h3 className="apanel__heading">Dates</h3>
          <ul className="alines">
            <li className="aline">
              <span>Issued</span>
              <strong>{niceDate(inv.issuedOn)}</strong>
            </li>
            <li className="aline">
              <span>Due</span>
              <strong>{niceDate(inv.dueOn)}</strong>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
