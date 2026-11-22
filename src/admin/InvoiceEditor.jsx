import { useMemo, useState } from 'react';
import Icon from './Icon.jsx';
import { calc, dueFromTerms, lineAmount, money, moneyShort, niceDate, num, KINDS, TERMS } from './invoiceMath.js';

let tmp = 0;
const newLine = (description = '', rate = '') => ({ id: `tmp-${++tmp}`, description, qty: '1', rate: String(rate) });

// Deposits already invoiced to this client, so a Final balance can subtract them.
function depositsFor(invoices, clientId, exceptId) {
  return invoices
    .filter((i) => i.clientId === clientId && i.kind === 'deposit' && i.id !== exceptId)
    .reduce((sum, i) => sum + calc(i).subtotal, 0);
}

export default function InvoiceEditor({
  initial,
  isNew,
  clients,
  invoices,
  settings,
  presets,
  onSave,
  onCancel,
  onAddPreset,
}) {
  const [f, setF] = useState(() => ({
    ...initial,
    depositPct: String(initial.depositPct ?? 50),
    lessAmount: String(initial.lessAmount ?? 0),
    lines: initial.lines.length
      ? initial.lines.map((l) => ({ ...l, qty: String(l.qty), rate: String(l.rate) }))
      : [newLine()],
  }));
  const [term, setTerm] = useState(isNew ? settings.defaultTerms : '');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [presetDraft, setPresetDraft] = useState(null);

  const set = (patch) => setF((prev) => ({ ...prev, ...patch }));
  const setLine = (id, patch) => set({ lines: f.lines.map((l) => (l.id === id ? { ...l, ...patch } : l)) });
  const c = useMemo(() => calc({ ...f, status: 'draft', payments: [] }), [f]);
  const client = clients.find((x) => x.id === f.clientId);
  const gstAllowed = settings.gstRegistered;

  function pickKind(kind) {
    const patch = { kind };
    if (kind === 'final' && !num(f.lessAmount) && f.clientId) {
      patch.lessAmount = String(depositsFor(invoices, f.clientId, f.id));
    }
    set(patch);
  }

  function pickTerm(t) {
    setTerm(t);
    set({ dueOn: dueFromTerms(f.issuedOn, t) });
  }

  function validate() {
    const e = {};
    if (!f.number.trim()) e.number = 'Add an invoice number.';
    if (!f.clientId) e.client = 'Pick who this invoice is for.';
    if (!f.lines.some((l) => lineAmount(l) > 0)) e.lines = 'Add at least one line with a price.';
    if (f.dueOn < f.issuedOn) e.dates = 'The due date is before the issue date.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function save(then) {
    if (!validate()) return;
    setSaving(true);
    await onSave(
      {
        ...f,
        gstRate: gstAllowed ? num(f.gstRate) : 0,
        status: then === 'send' ? 'sent' : f.status,
      },
      then
    );
    setSaving(false);
  }

  return (
    <div className="ied">
      <div className="ied-top">
        <button type="button" className="ied-back" onClick={onCancel}>
          <Icon name="arrowLeft" size={18} /> Invoices
        </button>
        <div className="ied-title">
          <h1>{isNew ? 'New invoice' : 'Edit invoice'}</h1>
          <span>
            {f.number || 'No number'} · {f.status === 'sent' ? 'Sent' : 'Draft'}
          </span>
        </div>
        <div className="ied-top__actions">
          <button type="button" className="abtn" onClick={() => save('stay')} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {Object.keys(errors).length > 0 && (
        <div className="adm-error" role="alert">
          <span>{Object.values(errors).join(' ')}</span>
        </div>
      )}

      <div className="ied-body">
        <div className="ied-main">
          <section className="icard" aria-labelledby="ied-who">
            <div className="icard__head">
              <h2 id="ied-who">Who &amp; what</h2>
            </div>
            <div className="igrid2">
              <label className="afield">
                <span>Client</span>
                <select
                  value={f.clientId || ''}
                  onChange={(e) => set({ clientId: e.target.value || null })}
                  aria-invalid={!!errors.client}
                >
                  <option value="">Choose a client…</option>
                  {clients
                    .slice()
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((cl) => (
                      <option key={cl.id} value={cl.id}>
                        {cl.name}
                        {cl.business ? ` — ${cl.business}` : ''}
                      </option>
                    ))}
                </select>
                <span className="afield__hint">Not listed? Add them in Clients, or convert their lead.</span>
              </label>
              <label className="afield">
                <span>What it’s for</span>
                <input
                  type="text"
                  value={f.title}
                  maxLength={200}
                  placeholder="e.g. Website with online bookings"
                  onChange={(e) => set({ title: e.target.value })}
                />
                <span className="afield__hint">Shows in your list and on the invoice.</span>
              </label>
            </div>

            <div className="ied-type">
              <span id="ied-type-label" className="ied-label">
                Invoice type
              </span>
              <div className="iseg" role="group" aria-labelledby="ied-type-label">
                {Object.entries(KINDS).map(([id, k]) => (
                  <button key={id} type="button" aria-pressed={f.kind === id} onClick={() => pickKind(id)}>
                    {k.label}
                    <small>{k.sub}</small>
                  </button>
                ))}
              </div>
              {f.kind === 'deposit' && (
                <div className="itypeinfo">
                  <label className="itypeinfo__field">
                    <span>Deposit</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={f.depositPct}
                      onChange={(e) => set({ depositPct: e.target.value })}
                    />
                    <span>%</span>
                  </label>
                  <span>
                    of the {moneyShort(c.job)} job is due now. Bill the rest later with a <strong>Final balance</strong>{' '}
                    invoice.
                  </span>
                </div>
              )}
              {f.kind === 'final' && (
                <div className="itypeinfo">
                  <label className="itypeinfo__field">
                    <span>Less deposit already invoiced $</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={f.lessAmount}
                      onChange={(e) => set({ lessAmount: e.target.value })}
                      style={{ width: 110 }}
                    />
                  </label>
                  <span>Filled in from this client’s deposit invoices. Change it if needed.</span>
                </div>
              )}
            </div>
          </section>

          <section className="icard" aria-labelledby="ied-work">
            <div className="icard__head">
              <h2 id="ied-work">The work</h2>
              <span className="icard__hint">
                {f.kind === 'full' ? 'Everything you’re charging for.' : 'List the full job, even for a deposit.'}
              </span>
            </div>
            <table className="ilines">
              <thead>
                <tr>
                  <th style={{ width: '56%' }}>Description</th>
                  <th className="num" style={{ width: '11%' }}>
                    Qty
                  </th>
                  <th className="num" style={{ width: '16%' }}>
                    Price
                  </th>
                  <th className="num" style={{ width: '13%' }}>
                    Amount
                  </th>
                  <th>
                    <span className="visually-hidden">Remove</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {f.lines.map((l, i) => (
                  <tr key={l.id}>
                    <td>
                      <label>
                        <span className="visually-hidden">Line {i + 1} description</span>
                        <input
                          type="text"
                          value={l.description}
                          maxLength={300}
                          placeholder="What you did"
                          onChange={(e) => setLine(l.id, { description: e.target.value })}
                        />
                      </label>
                    </td>
                    <td className="num">
                      <label>
                        <span className="visually-hidden">Line {i + 1} quantity</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={l.qty}
                          onChange={(e) => setLine(l.id, { qty: e.target.value })}
                        />
                      </label>
                    </td>
                    <td className="num">
                      <label>
                        <span className="visually-hidden">Line {i + 1} price</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={l.rate}
                          placeholder="0"
                          onChange={(e) => setLine(l.id, { rate: e.target.value })}
                        />
                      </label>
                    </td>
                    <td className="num ilines__amt">{money(lineAmount(l))}</td>
                    <td>
                      <button
                        type="button"
                        className="aicon"
                        aria-label={`Remove line ${i + 1}`}
                        title="Remove line"
                        onClick={() =>
                          set({ lines: f.lines.length > 1 ? f.lines.filter((x) => x.id !== l.id) : [newLine()] })
                        }
                      >
                        <Icon name="close" size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="ilines__add">
              <button type="button" className="abtn abtn--sm" onClick={() => set({ lines: [...f.lines, newLine()] })}>
                <Icon name="plus" size={16} /> Add line
              </button>
              {presets.length > 0 && <span className="icard__hint">Saved items:</span>}
              {presets.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="ichip"
                  onClick={() => {
                    const blank = f.lines.length === 1 && !f.lines[0].description && !num(f.lines[0].rate);
                    const line = newLine(p.description, p.rate);
                    set({ lines: blank ? [line] : [...f.lines, line] });
                  }}
                >
                  {p.description} <span>{moneyShort(p.rate)}</span>
                </button>
              ))}
              {presetDraft ? (
                <span className="ipreset-new">
                  <label>
                    <span className="visually-hidden">Saved item name</span>
                    <input
                      type="text"
                      placeholder="Item name"
                      value={presetDraft.description}
                      onChange={(e) => setPresetDraft({ ...presetDraft, description: e.target.value })}
                    />
                  </label>
                  <label>
                    <span className="visually-hidden">Saved item price</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="Price"
                      value={presetDraft.rate}
                      onChange={(e) => setPresetDraft({ ...presetDraft, rate: e.target.value })}
                      style={{ width: 90 }}
                    />
                  </label>
                  <button
                    type="button"
                    className="abtn abtn--sm"
                    disabled={!presetDraft.description.trim()}
                    onClick={async () => {
                      if ((await onAddPreset(presetDraft)) !== false) setPresetDraft(null);
                    }}
                  >
                    Save item
                  </button>
                  <button type="button" className="ichip" onClick={() => setPresetDraft(null)}>
                    Cancel
                  </button>
                </span>
              ) : (
                <button type="button" className="ichip ichip--ghost" onClick={() => setPresetDraft({ description: '', rate: '' })}>
                  + Save an item for next time
                </button>
              )}
            </div>
          </section>

          <section className="icard" aria-labelledby="ied-dates">
            <div className="icard__head">
              <h2 id="ied-dates">Dates &amp; number</h2>
            </div>
            <div className="igrid3">
              <label className="afield">
                <span>Invoice number</span>
                <input
                  type="text"
                  value={f.number}
                  maxLength={40}
                  onChange={(e) => set({ number: e.target.value })}
                  aria-invalid={!!errors.number}
                />
                <span className="afield__hint">Next number, picked for you.</span>
              </label>
              <label className="afield">
                <span>Issue date</span>
                <input
                  type="date"
                  value={f.issuedOn}
                  onChange={(e) => {
                    const issuedOn = e.target.value;
                    set(term ? { issuedOn, dueOn: dueFromTerms(issuedOn, term) } : { issuedOn });
                  }}
                />
              </label>
              <label className="afield">
                <span>Due date</span>
                <input
                  type="date"
                  value={f.dueOn}
                  onChange={(e) => {
                    setTerm('');
                    set({ dueOn: e.target.value });
                  }}
                  aria-invalid={!!errors.dates}
                />
              </label>
            </div>
            <div className="ichips" role="group" aria-label="Payment terms">
              {TERMS.map((t) => (
                <button key={t.id} type="button" className="ichip" aria-pressed={term === t.id} onClick={() => pickTerm(t.id)}>
                  {t.label}
                </button>
              ))}
            </div>
          </section>

          <section className="icard" aria-labelledby="ied-extras">
            <div className="icard__head">
              <h2 id="ied-extras">Extras</h2>
            </div>
            <label className="afield">
              <span>Note to client</span>
              <textarea rows={3} value={f.note} maxLength={2000} onChange={(e) => set({ note: e.target.value })} />
            </label>
            <div className="itoggle">
              <div>
                <strong>Add GST (15%)</strong>
                <span>
                  {gstAllowed
                    ? 'You’re GST registered, so this becomes a tax invoice.'
                    : 'Off — you’re not GST registered. Turn it on in Invoice settings once you register.'}
                </span>
              </div>
              <button
                type="button"
                className="iswitch"
                role="switch"
                aria-checked={gstAllowed && num(f.gstRate) > 0}
                aria-label="Add GST"
                disabled={!gstAllowed}
                onClick={() => set({ gstRate: num(f.gstRate) > 0 ? 0 : 15 })}
              />
            </div>
          </section>
        </div>

        <aside className="ied-side" aria-label="Invoice summary">
          <div className="isum">
            <h2>Summary</h2>
            <div className="isum__row">
              <span>{client?.name || 'No client yet'}</span>
              <span>{client?.business || ''}</span>
            </div>
            <div className="isum__row isum__row--muted">
              <span>Job total</span>
              <span>{money(c.job)}</span>
            </div>
            {f.kind === 'deposit' && (
              <div className="isum__row">
                <span>Deposit ({num(f.depositPct)}%)</span>
                <span>{money(c.subtotal)}</span>
              </div>
            )}
            {f.kind === 'final' && (
              <div className="isum__row">
                <span>Less deposit</span>
                <span>−{money(num(f.lessAmount))}</span>
              </div>
            )}
            {c.gst > 0 && (
              <div className="isum__row">
                <span>GST 15%</span>
                <span>{money(c.gst)}</span>
              </div>
            )}
            <div className="isum__due">
              <span>Due on this invoice</span>
              <strong>{money(c.total)}</strong>
              <small>Due {niceDate(f.dueOn)} · shows as Overdue after that if unpaid</small>
            </div>
            <div className="isum__actions">
              <button type="button" className="abtn abtn--primary abtn--block" onClick={() => save('send')} disabled={saving}>
                <Icon name="send" size={18} /> Save &amp; email to client
              </button>
              <button type="button" className="abtn abtn--block" onClick={() => save('print')} disabled={saving}>
                <Icon name="print" size={18} /> Save &amp; print / PDF
              </button>
            </div>
          </div>
          <div className="ipaybox">
            <strong>How they’ll pay you</strong>
            {settings.bankAccount ? (
              <span>
                Bank transfer to {settings.bankName ? `${settings.bankName}, ` : ''}
                <span className="mono">{settings.bankAccount}</span>, reference {f.number || 'the invoice number'}.
              </span>
            ) : (
              <span>
                Add your bank account in <strong>Invoice settings</strong> so it prints on the invoice.
              </span>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
