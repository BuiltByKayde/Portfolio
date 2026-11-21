import { useState } from 'react';
import Icon from './Icon.jsx';

const EMPTY = { name: '', business: '', email: '', phone: '', website: '' };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(v) {
  const errors = {};
  if (!v.name.trim()) errors.name = 'Add the client’s name.';
  if (!v.email.trim() && !v.phone.trim()) errors.contact = 'Add an email, a phone number, or both.';
  if (v.email.trim() && !EMAIL_RE.test(v.email.trim())) errors.email = 'That email doesn’t look right.';
  return errors;
}

function Field({ id, label, hint, error, ...input }) {
  return (
    <div className="afield">
      <label htmlFor={id}>
        {label}
        {hint && <span className="afield__hint">{hint}</span>}
      </label>
      <input id={id} aria-invalid={error ? 'true' : undefined} aria-describedby={error ? `${id}-err` : undefined} {...input} />
      {error && (
        <span id={`${id}-err`} className="afield__error">
          {error}
        </span>
      )}
    </div>
  );
}

export default function ClientForm({ mode, initial, onSave, onCancel }) {
  const [values, setValues] = useState(() => ({ ...EMPTY, ...(initial ?? {}) }));
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const set = (key) => (e) => setValues((v) => ({ ...v, [key]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length) return;
    setBusy(true);
    await onSave(values);
  }

  return (
    <form className="apanel" onSubmit={submit} noValidate>
      <div className="apanel__bar">
        <button type="button" className="aicon" aria-label="Cancel" title="Cancel" onClick={onCancel}>
          <Icon name="close" />
        </button>
        <span className="apanel__title">{mode === 'new' ? 'New client' : 'Edit client'}</span>
        <span style={{ width: 40 }} />
      </div>

      <div className="apanel__scroll aform">
        <Field id="cf-name" label="Name" value={values.name} onChange={set('name')} error={errors.name} autoComplete="off" autoFocus />
        <Field id="cf-business" label="Business name" hint="optional" value={values.business} onChange={set('business')} autoComplete="off" />
        <Field id="cf-email" label="Email" type="email" value={values.email} onChange={set('email')} error={errors.email} autoComplete="off" />
        <Field id="cf-phone" label="Phone" type="tel" value={values.phone} onChange={set('phone')} autoComplete="off" />
        {errors.contact && (
          <p className="afield__error" role="alert">
            {errors.contact}
          </p>
        )}
        <Field
          id="cf-website"
          label="Website"
          hint="optional"
          value={values.website}
          onChange={set('website')}
          placeholder="theirbusiness.co.nz"
          autoComplete="off"
        />
      </div>

      <div className="aform__foot">
        <button type="button" className="abtn" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="abtn abtn--primary" disabled={busy}>
          {mode === 'new' ? 'Add client' : 'Save changes'}
        </button>
      </div>
    </form>
  );
}
