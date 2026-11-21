import Icon from './Icon.jsx';
import { shortDate, initials, tint } from './format.js';
import { TOPICS, STATUSES } from './leadsStore.js';

// "Inbox" shows everything that isn't closed.
export const FILTERS = [
  { id: 'inbox', label: 'Inbox' },
  { id: 'new', label: 'New' },
  { id: 'replied', label: 'Replied' },
  { id: 'converted', label: 'Converted' },
  { id: 'closed', label: 'Closed' },
];

export function inFilter(lead, filter) {
  return filter === 'inbox' ? lead.status !== 'closed' : lead.status === filter;
}

export default function LeadList({
  leads,
  allLeads,
  loading,
  query,
  filter,
  onFilter,
  selectedId,
  onOpen,
  onRefresh,
  onMarkAllRead,
  onLoadSamples,
  canLoadSamples,
}) {
  const unread = allLeads.filter((l) => !l.isRead).length;

  return (
    <section className="alist" aria-label="Leads">
      <div className="alist__bar">
        <div className="alist__bar-left">
          <button type="button" className="aicon" aria-label="Refresh" title="Refresh" onClick={onRefresh}>
            <Icon name="refresh" />
          </button>
          <button
            type="button"
            className="aicon"
            aria-label="Mark all as read"
            title="Mark all as read"
            onClick={onMarkAllRead}
            disabled={unread === 0}
          >
            <Icon name="checks" />
          </button>
        </div>
        <div className="alist__bar-right">
          <span className="alist__count">
            {leads.length === 0 ? '0' : `1–${leads.length}`} of {leads.length}
          </span>
        </div>
      </div>

      <div className="afilters" role="group" aria-label="Filter leads by status">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            className="achip"
            aria-pressed={filter === f.id}
            onClick={() => onFilter(f.id)}
          >
            {f.label} <span className="achip__n">{allLeads.filter((l) => inFilter(l, f.id)).length}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <p className="alist__empty">Loading leads…</p>
      ) : allLeads.length === 0 ? (
        <div className="alist__empty">
          <span className="alist__empty-icon">
            <Icon name="inbox" size={28} />
          </span>
          <h2>No leads yet</h2>
          <p>Messages from your website’s contact form will show up here.</p>
          {canLoadSamples && (
            <div className="alist__empty-actions">
              <button type="button" className="abtn" onClick={onLoadSamples}>
                Load sample leads
              </button>
            </div>
          )}
        </div>
      ) : leads.length === 0 ? (
        <p className="alist__empty">{query ? `No leads match “${query}”.` : 'Nothing here.'}</p>
      ) : (
        <ul className="alist__rows">
          {leads.map((l) => (
            <li
              key={l.id}
              className={`arow arow--lead${l.isRead ? '' : ' is-unread'}${l.id === selectedId ? ' is-selected' : ''}`}
            >
              <button type="button" className="arow__open" onClick={() => onOpen(l.id)}>
                <span className="arow__dot" aria-hidden="true" />
                <span className="aavatar" style={{ '--tint': tint(l.id) }} aria-hidden="true">
                  {initials(l.name)}
                </span>
                <span className="arow__name">
                  {l.name}
                  {!l.isRead && <span className="visually-hidden"> (unread)</span>}
                </span>
                <span className="arow__summary">
                  <span className="arow__topic">{TOPICS[l.topic]?.short ?? l.topic}</span>
                  <span className="arow__preview">{l.message.replace(/\s+/g, ' ')}</span>
                </span>
                <span className="arow__status">
                  <span className={`astatus astatus--${l.status}`}>{STATUSES[l.status]}</span>
                </span>
                <span className="arow__date">{shortDate(l.createdAt)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
