import { useState } from 'react';
import Icon from './Icon.jsx';
import { moneyShort, TERMS } from './invoiceMath.js';

function Field({ id, label, hint, children }) {
  return (
    <div className="afield">
      <label htmlFor={id}>
        {label} {hint && <span className="afield__hint">{hint}</span>}
      </label>
      {children}
    </div>
  );
}

export default function InvoiceSettings({ settings, presets, onSave, onDeletePreset, onBack }) {
  const [s, setS] = useState(settings);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const set = (patch) => {
    setS((prev) => ({ ...prev, ...patch }));
    setSaved(false);
  };
  const text = (key) => ({
    value: s[key] ?? '',
    onChange: (e) => set({ [key]: e.target.value }),
  });

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    const ok = await onSave(s);
    setSaving(false);
    if (ok !== false) setSaved(true);
  }

  return (
    <form className="ied" onSubmit={submit}>
      <div className="ied-top">
        <button type="button" className="ied-back" onClick={onBack}>
          <Icon name="arrowLeft" size={18} /> Invoices
        </button>
        <div className="ied-title">
          <h1>Invoice settings</h1>
          <span>Printed on every invoice</span>
        </div>
        <div className="ied-top__actions">
          {saved && (
            <span className="isaved" role="status">
              <Icon name="check" size={16} /> Saved
            </span>
          )}
          <button type="submit" className="abtn abtn--primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save settings'}
          </button>
        </div>
      </div>

      <div className="ied-body ied-body--single">
        <section className="icard" aria-labelledby="set-you">
          <div className="icard__head">
            <h2 id="set-you">Your details</h2>
            <span className="icard__hint">Shown in the “From” part of the invoice.</span>
          </div>
          <div className="igrid2">
            <Field id="s-biz" label="Business name">
              <input id="s-biz" type="text" maxLength={120} {...text('businessName')} />
            </Field>
            <Field id="s-owner" label="Your name">
              <input id="s-owner" type="text" maxLength={120} autoComplete="name" {...text('ownerName')} />
            </Field>
            <Field id="s-loc" label="Location" hint="suburb or city is enough">
              <input id="s-loc" type="text" maxLength={120} placeholder="Auckland, New Zealand" {...text('location')} />
            </Field>
            <Field id="s-email" label="Email">
              <input id="s-email" type="email" maxLength={200} {...text('email')} />
            </Field>
            <Field id="s-phone" label="Phone" hint="optional">
              <input id="s-phone" type="tel" maxLength={40} {...text('phone')} />
            </Field>
            <Field id="s-web" label="Website" hint="optional">
              <input id="s-web" type="text" maxLength={200} placeholder="builtbykayde.vercel.app" {...text('website')} />
            </Field>
          </div>
        </section>

        <section className="icard" aria-labelledby="set-pay">
          <div className="icard__head">
            <h2 id="set-pay">How clients pay you</h2>
            <span className="icard__hint">Printed in the “How to pay” box. Only you can see this page.</span>
          </div>
          <div className="igrid2">
            <Field id="s-bankname" label="Account name">
              <input id="s-bankname" type="text" maxLength={120} placeholder="Name on the bank account" {...text('bankName')} />
            </Field>
            <Field id="s-bank" label="Bank account number">
              <input
                id="s-bank"
                type="text"
                maxLength={40}
                inputMode="numeric"
                autoComplete="off"
                placeholder="00-0000-0000000-00"
                {...text('bankAccount')}
              />
            </Field>
          </div>
        </section>

        <section className="icard" aria-labelledby="set-def">
          <div className="icard__head">
            <h2 id="set-def">Defaults for new invoices</h2>
          </div>
          <div className="afield">
            <span id="s-terms-label">Payment terms</span>
            <div className="ichips" role="group" aria-labelledby="s-terms-label">
              {TERMS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className="ichip"
                  aria-pressed={s.defaultTerms === t.id}
                  onClick={() => set({ defaultTerms: t.id })}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div className="afield" style={{ marginTop: 16 }}>
            <label htmlFor="s-note">Note to client</label>
            <textarea id="s-note" rows={3} maxLength={2000} {...text('defaultNote')} />
          </div>
        </section>

        <section className="icard" aria-labelledby="set-gst">
          <div className="icard__head">
            <h2 id="set-gst">GST</h2>
          </div>
          <div className="itoggle itoggle--flush">
            <div>
              <strong>I’m GST registered</strong>
              <span>
                Only turn this on once IRD has registered you. You must register when you earn over $60,000 in a
                year. Invoices with GST are titled “Tax invoice”.
              </span>
            </div>
            <button
              type="button"
              className="iswitch"
              role="switch"
              aria-checked={!!s.gstRegistered}
              aria-label="GST registered"
              onClick={() => set({ gstRegistered: !s.gstRegistered })}
            />
          </div>
          {s.gstRegistered && (
            <Field id="s-gstno" label="GST number">
              <input id="s-gstno" type="text" maxLength={20} placeholder="123-456-789" {...text('gstNumber')} />
            </Field>
          )}
        </section>

        <section className="icard" aria-labelledby="set-presets">
          <div className="icard__head">
            <h2 id="set-presets">Saved items</h2>
            <span className="icard__hint">Add new ones from the invoice editor.</span>
          </div>
          {presets.length === 0 ? (
            <p className="amuted apanel__none">None yet.</p>
          ) : (
            <ul className="alines">
              {presets.map((p) => (
                <li key={p.id} className="aline">
                  <span>{p.description}</span>
                  <span className="apay__right">
                    <strong>{moneyShort(p.rate)}</strong>
                    <button
                      type="button"
                      className="anote__delete"
                      onClick={() => onDeletePreset(p.id)}
                      aria-label={`Delete saved item ${p.description}`}
                    >
                      Delete
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </form>
  );
}
