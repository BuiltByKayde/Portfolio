import ArrowIcon from './ArrowIcon.jsx';
import { profile, projects } from '../data/profile.js';

function CodePeek() {
  return (
    <div className="codepeek">
      <div className="codepeek__bar">
        <span>src/data/profile.js</span>
        <span>JS</span>
      </div>
      <pre>
        <span className="tok-kw">export const</span> profile = {'{'}
        {'\n  '}
        <span className="tok-key">name</span>: <span className="tok-num">'{profile.name}'</span>,
        {'\n  '}
        <span className="tok-key">role</span>: <span className="tok-num">'{profile.role}'</span>,
        {'\n  '}
        <span className="tok-key">location</span>: <span className="tok-num">'Auckland, NZ'</span>,
        {'\n  '}
        <span className="tok-key">certificate</span>:{' '}
        <span className="tok-num">'Level 5 Full-Stack'</span>,{'\n  '}
        <span className="tok-key">status</span>: <span className="tok-num">'{profile.status}'</span>,
        {'\n};'}
      </pre>
    </div>
  );
}

function Feature({ project, onShowJson }) {
  return (
    <article className="feature-card">
      <div className="feature">
        <div className="feature__copy">
          <div className="feature__meta">
            <span className="muted">PROJECT {project.id}</span>
            <span className="live">
              <span className="dot" aria-hidden="true" />
              LIVE
            </span>
          </div>
          <h3 className="feature__title">{project.title}</h3>
          <p className="feature__body">{project.body}</p>
          <ul className="tags">
            {project.tags.map((t) => (
              <li key={t} className="chip chip--mono">
                {t}
              </li>
            ))}
          </ul>
          <div className="feature__actions">
            <a href={project.sourceUrl} className="btn btn--primary">
              View source <ArrowIcon />
            </a>
            <button type="button" className="btn btn--ghost" onClick={onShowJson}>
              Open the .json view
            </button>
          </div>
        </div>
        <CodePeek />
      </div>
    </article>
  );
}

function Slot({ project }) {
  if (project.status === 'open') {
    return (
      <a href="#contact" className="slot slot--open">
        <div className="slot__top">
          <span>PROJECT {project.id}</span>
          <span className="accent">OPEN</span>
        </div>
        <span className="slot__title">{project.title}</span>
        <span className="slot__body">{project.body}</span>
        <span className="slot__cta">
          Start a conversation <ArrowIcon />
        </span>
      </a>
    );
  }
  return (
    <article className="slot">
      <div className="slot__top">
        <span>PROJECT {project.id}</span>
        <span className="accent">IN BUILD</span>
      </div>
      <h3 className="slot__title">{project.title}</h3>
      <p className="slot__body">{project.body}</p>
      {project.meta && <p className="slot__meta">{project.meta}</p>}
    </article>
  );
}

export default function Work({ onShowJson }) {
  const featured = projects.find((p) => p.status === 'live');
  const rest = projects.filter((p) => p !== featured);

  return (
    <section id="work" className="wrap section">
      <div className="row2 section__head">
        <div>
          <p className="eyebrow">04 / WORK</p>
          <h2 className="h2">Starting with this one.</h2>
        </div>
        <p>
          Fewer, real, finished projects over a wall of tutorial clones. The first is the
          site you're reading.
        </p>
      </div>
      {featured && <Feature project={featured} onShowJson={onShowJson} />}
      <div className="grid2" style={{ marginTop: 20 }}>
        {rest.map((p) => (
          <Slot key={p.id} project={p} />
        ))}
      </div>
    </section>
  );
}
