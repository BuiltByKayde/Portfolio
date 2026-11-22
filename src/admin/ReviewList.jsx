import { useState } from 'react';
import Icon from './Icon.jsx';
import { Stars } from '../components/Star.jsx';
import { initials, shortDate, tint } from './format.js';
import { REVIEW_STATUSES } from './reviewsStore.js';
import { gmailCompose, newTab } from './gmail.js';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'published', label: 'Published' },
  { id: 'hidden', label: 'Private' },
];

export const reviewLink = () => `${window.location.origin}/review`;

function LinkCard() {
  const [copied, setCopied] = useState(false);
  const link = reviewLink();
  const askEmail = gmailCompose({
    subject: 'Would you leave a quick review?',
    body: `Hi there,\n\nThanks again for working with me! If you're happy with your website, would you mind leaving a short review? It takes about two minutes and really helps other small businesses find me:\n\n${link}\n\nNgā mihi,\nKayde`,
  });
  return (
    <section className="rvl-link" aria-label="Your review link">
      <div className="rvl-link__text">
        <strong>Ask for a review</strong>
        <span>Send happy clients this link. Their review lands here as Pending until you approve it.</span>
      </div>
      <span className="rvl-link__url">
        <span className="rvl-link__addr">{link.replace(/^https?:\/\//, '')}</span>
        <button
          type="button"
          className="abtn abtn--sm"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(link);
              setCopied(true);
              setTimeout(() => setCopied(false), 1800);
            } catch {
              // Clipboard blocked; the link is visible to copy by hand.
            }
          }}
        >
          <Icon name={copied ? 'check' : 'copy'} size={16} /> {copied ? 'Copied' : 'Copy'}
        </button>
      </span>
      <a className="abtn abtn--sm" href={askEmail} {...newTab}>
        <Icon name="send" size={16} /> Email a client
      </a>
    </section>
  );
}

export function reviewInFilter(r, f) {
  return f === 'all' || r.status === f;
}

export default function ReviewList({ reviews, loading, query, filter, onFilter, selectedId, onOpen, onRefresh, canLoadSamples, onLoadSamples, onNew }) {
  const q = query.toLowerCase();
  const visible = reviews.filter(
    (r) => reviewInFilter(r, filter) && (!q || [r.name, r.business, r.quote].join(' ').toLowerCase().includes(q))
  );

  return (
    <>
      <LinkCard />
      <section className="alist" aria-label="Reviews">
        <div className="alist__bar alist__bar--wrap">
          <div className="afilters afilters--inline" role="group" aria-label="Filter reviews">
            {FILTERS.map((f) => (
              <button key={f.id} type="button" className="achip" aria-pressed={filter === f.id} onClick={() => onFilter(f.id)}>
                {f.label} <span className="achip__n">{reviews.filter((r) => reviewInFilter(r, f.id)).length}</span>
              </button>
            ))}
          </div>
          <div className="alist__bar-right">
            <button type="button" className="aicon" aria-label="Refresh" title="Refresh" onClick={onRefresh}>
              <Icon name="refresh" />
            </button>
            <span className="alist__count">
              {visible.length} of {reviews.length}
            </span>
          </div>
        </div>

        {loading ? (
          <p className="alist__empty">Loading reviews…</p>
        ) : reviews.length === 0 ? (
          <div className="alist__empty">
            <span className="alist__empty-icon">
              <Icon name="star" size={28} />
            </span>
            <h2>No reviews yet</h2>
            <p>Send a happy client your review link, or add one you’ve already received.</p>
            <div className="alist__empty-actions">
              <button type="button" className="abtn abtn--primary" onClick={onNew}>
                <Icon name="plus" size={18} /> Add review
              </button>
              {canLoadSamples && (
                <button type="button" className="abtn" onClick={onLoadSamples}>
                  Load sample reviews
                </button>
              )}
            </div>
          </div>
        ) : visible.length === 0 ? (
          <p className="alist__empty">{query ? `No reviews match “${query}”.` : 'Nothing here.'}</p>
        ) : (
          <ul className="alist__rows">
            {visible.map((r) => (
              <li key={r.id} className={`arow arow--rv${r.id === selectedId ? ' is-selected' : ''}`}>
                <button type="button" className="arow__open" onClick={() => onOpen(r.id)}>
                  <span className="aavatar" style={{ '--tint': tint(r.id) }} aria-hidden="true">
                    {initials(r.name)}
                  </span>
                  <span className="rvl-who">
                    <span className="rvl-who__name">{r.name}</span>
                    <span className="rvl-who__biz">{r.business}</span>
                  </span>
                  <span className="rvl-quote">
                    <Stars rating={r.rating} size={14} />
                    <span>{r.quote}</span>
                  </span>
                  <span className="rvl-src">
                    <span className="atag">{r.source === 'form' ? 'Review link' : 'Added by you'}</span>
                  </span>
                  <span>
                    <span className={`astatus astatus--rv-${r.status}`}>
                      {REVIEW_STATUSES[r.status]}
                      {r.featured ? ' ★' : ''}
                    </span>
                  </span>
                  <span className="arow__date">{shortDate(r.createdAt)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
