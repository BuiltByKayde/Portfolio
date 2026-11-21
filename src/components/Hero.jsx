import ArrowIcon from './ArrowIcon.jsx';
import { profile } from '../data/profile.js';

export default function Hero() {
  const [first, last] = profile.name.split(' ');

  return (
    <section className="wrap hero">
      <p className="hero__kicker">
        PORTFOLIO — EDITION 2026 · 36.85°S 174.76°E · TĀMAKI MAKAURAU
      </p>
      <h1 className="hero__name">
        {first}
        <br />
        {last}
        <span className="accent">.</span>
      </h1>

      <div className="row2 hero__row">
        <p className="hero__lede">
          Junior full-stack developer, {profile.age}, based in {profile.location}. Level 5
          Certificate in Full-Stack Development from Mission Ready, backed by two and a half
          years of work in busy, customer-facing teams.
        </p>

        <div className="status">
          <div className="status__label">
            <span className="status__dot" aria-hidden="true" />
            <span>AVAILABLE NOW</span>
          </div>
          <p>
            Open to junior and graduate full-stack roles, contract work and small
            freelance builds — in Auckland or remote.
          </p>
          <div className="status__actions">
            <a href="#contact" className="btn btn--primary">
              Get in touch <ArrowIcon />
            </a>
            <a href={profile.cvUrl} download="Kayde-Denton-CV.pdf" className="btn btn--ghost">
              Download CV
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 4v12M7 11l5 5 5-5M5 20h14" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
