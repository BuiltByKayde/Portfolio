import { useState } from 'react';
import Icon from './Icon.jsx';
import { Stars } from '../components/Star.jsx';
import { fullDate, initials, tint } from './format.js';

function Switch({ checked, onChange, label }) {
  return (
    <button type="button" className="iswitch" role="switch" aria-checked={checked} aria-label={label} onClick={onChange} />
  );
}

export function ReviewView({ review: r, onClose, onEdit, onDelete, onUpdate }) {
  const published = r.status === 'published';
  return (
    <div className="apanel">
      <div className="apanel__bar">
        <button type="button" className="aicon" aria-label="Close review" title="Close" onClick={onClose}>
          <Icon name="close" />
        </button>
        <div className="apanel__actions">
          <button type="button" className="aicon" aria-label="Edit review" title="Edit (fix typos only)" onClick={onEdit}>
            <Icon name="edit" />
          </button>
          <button type="button" className="aicon" aria-label="Delete review" title="Delete" onClick={onDelete}>
            <Icon name="trash" />
          </button>
        </div>
      </div>
      <div className="apanel__scroll">
        <div className="apanel__hero">
          <span className="aavatar aavatar--lg" style={{ '--tint': tint(r.id) }} aria-hidden="true">
            {initials(r.name)}
          </span>
          <div>
            <h2>{r.name}</h2>
            <p>{r.business || 'No business name'}</p>
          </div>
        </div>

        <figure className="rvp-quote">
          <Stars rating={r.rating} size={20} />
          <blockquote>
            <p>{r.quote}</p>
          </blockquote>
        </figure>

        {!r.consent && (
          <p className="anotice anotice--late">
            They didn’t give permission to show this publicly, so it can’t go on your portfolio. Keep it private.
          </p>
        )}
        {r.status === 'pending' && r.consent && (
          <>
            <p className="anotice anotice--pending">New review. It isn’t on your portfolio until you approve it.</p>
            <div className="aactions">
              <button type="button" className="abtn abtn--sm abtn--primary" onClick={() => onUpdate({ status: 'published' })}>
                <Icon name="check" size={16} /> Approve &amp; publish
              </button>
              <button type="button" className="abtn abtn--sm" onClick={() => onUpdate({ status: 'hidden', featured: false })}>
                Keep private
              </button>
            </div>
          </>
        )}
        {r.status === 'pending' && !r.consent && (
          <div className="aactions">
            <button type="button" className="abtn abtn--sm" onClick={() => onUpdate({ status: 'hidden', featured: false })}>
              Mark as private
            </button>
          </div>
        )}
        {published && (
          <p className="anotice anotice--ok">
            Showing on your portfolio{r.featured ? ' as a featured review' : ''}.
          </p>
        )}

        {r.consent && (
          <div className="apanel__section">
            <h3 className="apanel__heading">On your portfolio</h3>
            <div className="rvp-toggle">
              <div>
                <strong>Show on portfolio</strong>
                <span>Visitors see it in the Reviews section (first name + business only).</span>
              </div>
              <Switch
                label="Show on portfolio"
                checked={published}
                onChange={() => onUpdate(published ? { status: 'hidden', featured: false } : { status: 'published' })}
              />
            </div>
            <div className="rvp-toggle">
              <div>
                <strong>Feature it</strong>
                <span>Shown first and larger. Pick your best one or two.</span>
              </div>
              <Switch
                label="Feature this review"
                checked={r.featured}
                onChange={() => onUpdate(r.featured ? { featured: false } : { featured: true, status: 'published' })}
              />
            </div>
          </div>
        )}

        <div className="apanel__section">
          <h3 className="apanel__heading">Details</h3>
          <ul className="alines">
            <li className="aline">
              <span>Source</span>
              <strong>{r.source === 'form' ? 'Review link' : 'Added by you'}</strong>
            </li>
            <li className="aline">
              <span>Received</span>
              <strong>{fullDate(r.createdAt)}</strong>
            </li>
            <li className="aline">
              <span>Email (private)</span>
              <strong>{r.email || '—'}</strong>
            </li>
            <li className="aline">
              <span>OK to show publicly</span>
              <strong>{r.consent ? 'Yes' : 'No'}</strong>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export function ReviewForm({ initial, mode, onSave, onCancel }) {
  const [f, setF] = useState(
    initial ?? { name: '', business: '', email: '', rating: 5, quote: '', consent: true, status: 'published', featured: false }
  );
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (patch) => setF((p) => ({ ...p, ...patch }));

  async function submit(e) {
    e.preventDefault();
    if (!f.name.trim()) return setErr('Add their name.');
    if (f.quote.trim().length < 10) return setErr('The review needs at least 10 characters.');
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
        <span className="apanel__title">{mode === 'new' ? 'Add review' : 'Edit review'}</span>
        <span style={{ width: 40 }} />
      </div>
      <div className="apanel__scroll aform">
        {mode === 'edit' && (
          <p className="anotice anotice--info" style={{ marginTop: 0 }}>
            Only fix typos. Changing what someone said isn’t fair to them or your visitors.
          </p>
        )}
        <div role="group" aria-labelledby="rf-stars">
          <span id="rf-stars" className="rvf-label">
            Rating
          </span>
          <div className="rvf-stars">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                className={`rvf-star${n <= f.rating ? ' is-on' : ''}`}
                aria-label={`${n} ${n === 1 ? 'star' : 'stars'}`}
                aria-pressed={f.rating === n}
                onClick={() => set({ rating: n })}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />
                </svg>
              </button>
            ))}
          </div>
        </div>
        <label className="afield">
          <span>Review</span>
          <textarea rows={5} maxLength={600} value={f.quote} onChange={(e) => set({ quote: e.target.value })} />
        </label>
        <label className="afield">
          <span>Their name</span>
          <input type="text" maxLength={120} value={f.name} onChange={(e) => set({ name: e.target.value })} />
        </label>
        <label className="afield">
          <span>Business (optional)</span>
          <input type="text" maxLength={120} value={f.business} onChange={(e) => set({ business: e.target.value })} />
        </label>
        <label className="afield">
          <span>Email (optional, private)</span>
          <input type="email" maxLength={254} value={f.email} onChange={(e) => set({ email: e.target.value })} />
        </label>
        <label className="rvf-consent">
          <input type="checkbox" checked={f.consent} onChange={(e) => set({ consent: e.target.checked })} />
          <span>They’re happy for me to show this on my website</span>
        </label>
        {mode === 'new' && f.consent && (
          <label className="rvf-consent">
            <input
              type="checkbox"
              checked={f.status === 'published'}
              onChange={(e) => set({ status: e.target.checked ? 'published' : 'hidden' })}
            />
            <span>Publish it on my portfolio now</span>
          </label>
        )}
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
          {saving ? 'Saving…' : mode === 'new' ? 'Add review' : 'Save changes'}
        </button>
      </div>
    </form>
  );
}
