import { useEffect } from 'react';
import Icon from './Icon.jsx';
import { calc, lineAmount, money, niceDate, TERMS } from './invoiceMath.js';
import { invoiceEmail } from './InvoicePanel.jsx';
import './invoice-print.css';

function termsLabel(inv) {
  const days = Math.round((new Date(inv.dueOn) - new Date(inv.issuedOn)) / 86400000);
  const t = TERMS.find((x) => x.id === String(days));
  return t ? t.label : `${days} days`;
}

export default function InvoicePrint({ invoice: inv, client, settings, reference, justSent, onBack }) {
  const c = calc(inv);
  const gst = c.gst > 0;
  const title = gst ? 'Tax invoice' : 'Invoice';

  useEffect(() => {
    const prev = document.title;
    // The PDF is named after the page title when saved.
    document.title = `${inv.number} ${client?.name ? `- ${client.name}` : ''}`.trim();
    return () => {
      document.title = prev;
    };
  }, [inv.number, client?.name]);

  return (
    <div className="ip-wrap">
      <div className="ip-bar no-print">
        <button type="button" className="ip-btn" onClick={onBack}>
          <Icon name="arrowLeft" size={18} /> Back
        </button>
        <span className="ip-bar__hint">
          {justSent
            ? 'Saved as sent. Click Print / Save PDF, choose “Save as PDF”, then email it.'
            : 'Choose “Save as PDF” as the printer to make a PDF.'}
        </span>
        <div className="ip-bar__actions">
          <button type="button" className="ip-btn ip-btn--primary" onClick={() => window.print()}>
            <Icon name="print" size={18} /> Print / Save PDF
          </button>
          <a className="ip-btn" href={invoiceEmail(inv, c, client, settings)} target="_blank" rel="noopener noreferrer">
            <Icon name="send" size={18} /> Email to client
          </a>
        </div>
      </div>

      <article className="inv" aria-label={`${title} ${inv.number}`}>
        <header className="inv-top">
          <div className="inv-logo" aria-label={settings.businessName || 'builtbykayde'}>
            {(settings.businessName || 'builtbykayde').toLowerCase() === 'builtbykayde' ? (
              <>
                <span className="inv-logo__word">
                  <span>builtby</span>
                  <span className="inv-blue">kayde</span>
                </span>
                <span className="inv-logo__line">
                  <span className="inv-logo__bar" aria-hidden="true" />
                  <span className="inv-logo__tag">FULL-STACK DEVELOPER · NZ</span>
                </span>
              </>
            ) : (
              <span className="inv-logo__word">{settings.businessName}</span>
            )}
          </div>
          <div className="inv-title">
            <h1>{title}</h1>
            <p>{inv.number}</p>
            {inv.kind !== 'full' && (
              <span className="inv-kind">{inv.kind === 'deposit' ? `Deposit · ${inv.depositPct}%` : 'Final balance'}</span>
            )}
          </div>
        </header>

        <section className="inv-meta" aria-label="Invoice details">
          <div>
            <span className="inv-label">Issued</span>
            <strong>{niceDate(inv.issuedOn)}</strong>
          </div>
          <div>
            <span className="inv-label">Due</span>
            <strong>{niceDate(inv.dueOn)}</strong>
          </div>
          <div>
            <span className="inv-label">Terms</span>
            <strong>{termsLabel(inv)}</strong>
          </div>
          <div className="inv-meta__due">
            <span className="inv-label">{c.paid > 0 ? 'Still owing' : 'Amount due'}</span>
            <strong>{money(c.paid > 0 ? c.owing : c.total)}</strong>
          </div>
        </section>

        <section className="inv-parties">
          <div>
            <span className="inv-label">From</span>
            {settings.ownerName && <p className="inv-strong">{settings.ownerName}</p>}
            <p className={settings.ownerName ? '' : 'inv-strong'}>{settings.businessName || 'builtbykayde'}</p>
            {settings.location && <p>{settings.location}</p>}
            {settings.email && <p>{settings.email}</p>}
            {settings.phone && <p>{settings.phone}</p>}
            {gst && settings.gstNumber && <p>GST no. {settings.gstNumber}</p>}
          </div>
          <div>
            <span className="inv-label">Bill to</span>
            <p className="inv-strong">{client?.name || '—'}</p>
            {client?.business && <p>{client.business}</p>}
            {client?.email && <p>{client.email}</p>}
            {client?.phone && <p>{client.phone}</p>}
          </div>
        </section>

        {inv.title && <p className="inv-for">For: {inv.title}</p>}

        <table className="inv-items">
          <thead>
            <tr>
              <th style={{ width: '58%' }}>Description</th>
              <th className="num">Qty</th>
              <th className="num">Price</th>
              <th className="num">Amount</th>
            </tr>
          </thead>
          <tbody>
            {inv.lines.map((l) => (
              <tr key={l.id}>
                <td>{l.description || 'Item'}</td>
                <td className="num">{l.qty}</td>
                <td className="num">{money(l.rate)}</td>
                <td className="num">{money(lineAmount(l))}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="inv-totals">
          {inv.kind !== 'full' && (
            <div>
              <span>Job total</span>
              <span>{money(c.job)}</span>
            </div>
          )}
          {inv.kind === 'deposit' && (
            <>
              <div>
                <span>Deposit due now ({inv.depositPct}%)</span>
                <span>{money(c.subtotal)}</span>
              </div>
              <div className="inv-muted">
                <span>Balance (invoiced on completion)</span>
                <span>{money(c.job - c.subtotal)}</span>
              </div>
            </>
          )}
          {inv.kind === 'final' && (
            <div>
              <span>Less deposit</span>
              <span>−{money(inv.lessAmount)}</span>
            </div>
          )}
          {gst && (
            <>
              <div>
                <span>Subtotal (excl. GST)</span>
                <span>{money(c.subtotal)}</span>
              </div>
              <div>
                <span>GST {inv.gstRate}%</span>
                <span>{money(c.gst)}</span>
              </div>
            </>
          )}
          {c.paid > 0 && (
            <div>
              <span>Paid so far</span>
              <span>−{money(c.paid)}</span>
            </div>
          )}
          <div className="inv-grand">
            <span>{c.paid > 0 ? 'Still owing' : 'Amount due'}</span>
            <strong>{money(c.paid > 0 ? c.owing : c.total)}</strong>
          </div>
          {!gst && <span className="inv-gstnote">No GST charged — not GST registered.</span>}
        </div>

        <section className="inv-pay">
          <div>
            <h2>How to pay</h2>
            {settings.bankAccount ? (
              <dl>
                <dt>Bank transfer to</dt>
                <dd>{settings.bankName || settings.ownerName || settings.businessName}</dd>
                <dt>Account number</dt>
                <dd>{settings.bankAccount}</dd>
                <dt>Reference</dt>
                <dd>{reference || inv.number}</dd>
              </dl>
            ) : (
              <p className="no-print inv-missing">
                Add your bank account in Invoice settings so it shows here.
              </p>
            )}
          </div>
          {inv.note && (
            <div>
              <h2>Note</h2>
              <p>{inv.note}</p>
            </div>
          )}
        </section>

        <footer className="inv-foot">
          <span>
            {settings.businessName || 'builtbykayde'}
            {settings.ownerName ? ` · ${settings.ownerName}` : ''}
          </span>
          <span>{[settings.website, settings.email].filter(Boolean).join(' · ')}</span>
        </footer>
      </article>
    </div>
  );
}
