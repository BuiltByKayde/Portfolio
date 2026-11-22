import { useState } from 'react';
import Icon from './Icon.jsx';
import { fullDate, initials, tint } from './format.js';
import { TOPICS, STATUSES } from './leadsStore.js';
import { gmailCompose, newTab } from './gmail.js';

function Detail({ icon, label, children, htmlFor }) {
  return (
    <div className="adetail">
      <span className="adetail__icon">
        <Icon name={icon} size={18} />
      </span>
      <div className="adetail__body">
        {htmlFor ? (
          <label htmlFor={htmlFor} className="adetail__label">
            {label}
          </label>
        ) : (
          <span className="adetail__label">{label}</span>
        )}
        <span className="adetail__value">{children}</span>
      </div>
    </div>
  );
}

export default function LeadPanel({
  lead,
  onClose,
  onStatus,
  onMarkUnread,
  onDelete,
  onReplied,
  onConvert,
  onOpenClient,
  onAddNote,
  onDeleteNote,
}) {
  const [draft, setDraft] = useState('');
  const [converting, setConverting] = useState(false);
  const notes = lead.notes ?? [];
  // Only counts as converted once a client actually exists for it.
  const isConverted = lead.status === 'converted' && !!lead.clientId;
  const first = lead.name.split(/\s+/)[0] || 'there';
  const replyHref = gmailCompose({
    to: lead.email,
    subject: 'Re: your message to builtbykayde',
    body: `Kia ora ${first},\n\nThanks for getting in touch!\n\n\n\n> ${lead.message.replace(/\n/g, '\n> ')}`,
  });

  async function submit(e) {
    e.preventDefault();
    if (!draft.trim()) return;
    if ((await onAddNote(draft)) !== false) setDraft('');
  }

  async function convert() {
    setConverting(true);
    await onConvert();
    setConverting(false);
  }

  return (
    <div className="apanel">
      <div className="apanel__bar">
        <button type="button" className="aicon" aria-label="Close details" title="Close" onClick={onClose}>
          <Icon name="close" />
        </button>
        <div className="apanel__actions">
          {lead.status !== 'closed' && (
            <button
              type="button"
              className="aicon"
              aria-label="Close lead"
              title="Mark as closed"
              onClick={() => onStatus('closed')}
            >
              <Icon name="archive" />
            </button>
          )}
          <button type="button" className="aicon" aria-label="Mark as unread" title="Mark as unread" onClick={onMarkUnread}>
            <Icon name="mail" />
          </button>
          <button type="button" className="aicon" aria-label="Delete lead" title="Delete" onClick={onDelete}>
            <Icon name="trash" />
          </button>
        </div>
      </div>

      <div className="apanel__scroll">
        <div className="apanel__hero">
          <span className="aavatar aavatar--lg" style={{ '--tint': tint(lead.id) }} aria-hidden="true">
            {initials(lead.name)}
          </span>
          <div>
            <h2>{lead.name}</h2>
            <p>{lead.business ? `${lead.business} · via contact form` : 'via contact form'}</p>
          </div>
        </div>

        <div className="apanel__section">
          <h3 className="apanel__heading">Message</h3>
          <p className="amessage">{lead.message}</p>

          {isConverted ? (
            <div className="aconverted" role="status">
              <span>Added to Clients, with this message saved as a note.</span>
              {lead.clientId && (
                <button type="button" className="aconverted__link" onClick={onOpenClient}>
                  Open client →
                </button>
              )}
            </div>
          ) : (
            <div className="aactions">
              <a className="abtn" href={replyHref} onClick={onReplied} {...newTab}>
                <Icon name="reply" size={18} /> Reply by email
              </a>
              <button type="button" className="abtn abtn--primary" onClick={convert} disabled={converting}>
                <Icon name="userPlus" size={18} /> {converting ? 'Converting…' : 'Convert to client'}
              </button>
            </div>
          )}
        </div>

        <div className="apanel__section">
          <h3 className="apanel__heading">Details</h3>
          <Detail icon="mail" label="Email">
            <a href={gmailCompose({ to: lead.email })} {...newTab}>
              {lead.email}
            </a>
          </Detail>
          <Detail icon="phone" label="Phone">
            {lead.phone ? (
              <a href={`tel:${lead.phone.replace(/\s+/g, '')}`}>{lead.phone}</a>
            ) : (
              <span className="amuted">Not given</span>
            )}
          </Detail>
          {lead.business && (
            <Detail icon="building" label="Business">
              {lead.business}
            </Detail>
          )}
          <Detail icon="note" label="Topic">
            {TOPICS[lead.topic]?.full ?? lead.topic}
          </Detail>
          <Detail icon="clock" label="Received">
            {fullDate(lead.createdAt)}
          </Detail>
          <Detail icon="check" label="Status" htmlFor="lead-status">
            <select
              id="lead-status"
              className="astatus-select"
              value={lead.status}
              onChange={(e) => onStatus(e.target.value)}
            >
              {Object.entries(STATUSES).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </Detail>
        </div>

        <div className="apanel__section">
          <h3 className="apanel__heading">
            Notes <span className="amuted">{notes.length}</span>
          </h3>
          {notes.length === 0 ? (
            <p className="amuted apanel__none">No notes yet. Only you can see these.</p>
          ) : (
            <ul className="anotes">
              {notes.map((m) => (
                <li key={m.id} className="anote">
                  <p className="anote__text">{m.text}</p>
                  <div className="anote__meta">
                    <time dateTime={m.createdAt}>{fullDate(m.createdAt)}</time>
                    <button
                      type="button"
                      className="anote__delete"
                      onClick={() => onDeleteNote(m.id)}
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
        <label htmlFor="lead-note-input" className="visually-hidden">
          Add a note
        </label>
        <textarea
          id="lead-note-input"
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
