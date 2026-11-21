import { useState } from 'react';
import Icon from './Icon.jsx';
import { fullDate, initials, domain, tint } from './format.js';

function CopyButton({ value, label }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="aicon aicon--sm"
      aria-label={done ? 'Copied' : `Copy ${label}`}
      title={done ? 'Copied' : 'Copy'}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {
          // Clipboard blocked; nothing to do.
        }
      }}
    >
      <Icon name={done ? 'check' : 'copy'} size={16} />
    </button>
  );
}

function Detail({ icon, label, children, copy }) {
  return (
    <div className="adetail">
      <span className="adetail__icon">
        <Icon name={icon} size={18} />
      </span>
      <div className="adetail__body">
        <span className="adetail__label">{label}</span>
        <span className="adetail__value">{children}</span>
      </div>
      {copy && <CopyButton value={copy} label={label.toLowerCase()} />}
    </div>
  );
}

export default function ClientPanel({ client, onClose, onEdit, onDelete, onAddComment, onDeleteComment }) {
  const [draft, setDraft] = useState('');
  const comments = client.comments ?? [];

  async function submit(e) {
    e.preventDefault();
    if (!draft.trim()) return;
    // Keep the text if saving failed, so nothing is lost.
    if ((await onAddComment(draft)) !== false) setDraft('');
  }

  return (
    <div className="apanel">
      <div className="apanel__bar">
        <button type="button" className="aicon" aria-label="Close details" title="Close" onClick={onClose}>
          <Icon name="close" />
        </button>
        <div className="apanel__actions">
          <button type="button" className="aicon" aria-label="Edit client" title="Edit" onClick={onEdit}>
            <Icon name="edit" />
          </button>
          <button type="button" className="aicon" aria-label="Delete client" title="Delete" onClick={onDelete}>
            <Icon name="trash" />
          </button>
        </div>
      </div>

      <div className="apanel__scroll">
        <div className="apanel__hero">
          <span className="aavatar aavatar--lg" style={{ '--tint': tint(client.id) }} aria-hidden="true">
            {initials(client.name)}
          </span>
          <div>
            <h2>{client.name}</h2>
            <p>{client.business || 'No business name'}</p>
          </div>
        </div>

        <div className="apanel__section">
          <h3 className="apanel__heading">Details</h3>
          <Detail icon="building" label="Business">
            {client.business || <span className="amuted">Not added</span>}
          </Detail>
          <Detail icon="mail" label="Email" copy={client.email || null}>
            {client.email ? (
              <a href={`mailto:${client.email}`}>{client.email}</a>
            ) : (
              <span className="amuted">Not added</span>
            )}
          </Detail>
          <Detail icon="phone" label="Phone" copy={client.phone || null}>
            {client.phone ? (
              <a href={`tel:${client.phone.replace(/\s+/g, '')}`}>{client.phone}</a>
            ) : (
              <span className="amuted">Not added</span>
            )}
          </Detail>
          <Detail icon="globe" label="Website">
            {client.website ? (
              <a href={client.website} target="_blank" rel="noopener noreferrer" className="alink-ext">
                {domain(client.website)} <Icon name="external" size={14} />
              </a>
            ) : (
              <span className="amuted">Not added</span>
            )}
          </Detail>
          <Detail icon="calendar" label="Added">
            {fullDate(client.createdAt)}
          </Detail>
        </div>

        <div className="apanel__section">
          <h3 className="apanel__heading">
            Notes <span className="amuted">{comments.length}</span>
          </h3>
          {comments.length === 0 ? (
            <p className="amuted apanel__none">No notes yet. Add one below — only you can see these.</p>
          ) : (
            <ul className="anotes">
              {comments.map((m) => (
                <li key={m.id} className="anote">
                  <p className="anote__text">{m.text}</p>
                  <div className="anote__meta">
                    <time dateTime={m.createdAt}>{fullDate(m.createdAt)}</time>
                    <button
                      type="button"
                      className="anote__delete"
                      onClick={() => onDeleteComment(m.id)}
                      aria-label="Delete note"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <form className="acompose" onSubmit={submit}>
        <label htmlFor="note-input" className="visually-hidden">
          Add a note
        </label>
        <textarea
          id="note-input"
          rows={2}
          placeholder="Add a note…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submit(e);
          }}
        />
        <button type="submit" className="abtn abtn--primary" disabled={!draft.trim()}>
          <Icon name="send" size={16} /> Add
        </button>
      </form>
    </div>
  );
}
