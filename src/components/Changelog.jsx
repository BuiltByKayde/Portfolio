import { changelog } from '../data/profile.js';

const statusLabel = {
  upcoming: 'UPCOMING',
  current: 'LATEST',
  released: 'RELEASED',
  initial: 'FIRST JOB',
};

function Entry({ entry, last }) {
  const current = entry.status === 'current';

  const content = (
    <>
      <div className="entry__meta">
        <div className="entry__tags">
          <span className={`version version--${entry.status}`}>{entry.version}</span>
          <span className={`entry__status entry__status--${entry.status}`}>
            {current && <span className="dot" aria-hidden="true" />}
            {statusLabel[entry.status]}
          </span>
        </div>
        {entry.when && <span className="entry__when">{entry.when}</span>}
      </div>
      <h3 className="entry__title">{entry.title}</h3>
      <p className="entry__body">{entry.body}</p>
      {entry.changes && (
        <ul className="entry__changes">
          {entry.changes.map((c) => (
            <li key={c}>
              <span className="accent" aria-hidden="true">
                +
              </span>{' '}
              {c}
            </li>
          ))}
        </ul>
      )}
    </>
  );

  return (
    <li className="tl">
      <div className="tl__rail">
        <span className={`node node--${entry.status}`} aria-hidden="true" />
        {!last && <span className="tl__line" aria-hidden="true" />}
      </div>
      <div className={last ? '' : 'tl__gap'}>
        {current ? <div className="entry--card">{content}</div> : content}
      </div>
    </li>
  );
}

export default function Changelog() {
  return (
    <section id="log" className="wrap section">
      <div className="row2 section__head">
        <div>
          <p className="eyebrow">03 / CHANGELOG</p>
          <h2 className="h2">Release notes.</h2>
        </div>
        <p>Every version so far, newest first. The next one ships with your team.</p>
      </div>
      <ol className="timeline">
        {changelog.map((entry, i) => (
          <Entry key={entry.version} entry={entry} last={i === changelog.length - 1} />
        ))}
      </ol>
    </section>
  );
}
