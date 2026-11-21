import { useState } from 'react';
import ArrowIcon from './ArrowIcon.jsx';
import { profile } from '../data/profile.js';

const topics = [
  { id: 'role', label: 'A role' },
  { id: 'freelance', label: 'A freelance project' },
  { id: 'hi', label: 'Just saying hi' },
];

function ContactForm() {
  const [topic, setTopic] = useState('role');
  // idle | sending | sent | mailto | error
  const [status, setStatus] = useState('idle');

  async function handleSubmit(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const topicLabel = topics.find((t) => t.id === topic).label;
    data.set('topic', topicLabel);

    // No endpoint configured: hand off to the visitor's email app.
    if (!profile.formEndpoint) {
      const subject = `${topicLabel} — from ${data.get('name')}`;
      const body = `${data.get('message')}\n\n${data.get('name')} · ${data.get('email')}`;
      window.location.href = `mailto:${profile.email}?subject=${encodeURIComponent(
        subject
      )}&body=${encodeURIComponent(body)}`;
      setStatus('mailto');
      return;
    }

    setStatus('sending');
    try {
      const res = await fetch(profile.formEndpoint, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: data,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      form.reset();
      setStatus('sent');
    } catch {
      setStatus('error');
    }
  }

  if (status === 'sent' || status === 'mailto') {
    return (
      <div className="form-done" role="status">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--ok)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M8 12.5l2.5 2.5L16 9.5" />
        </svg>
        <h3>{status === 'sent' ? 'Message sent.' : 'Almost there.'}</h3>
        <p>
          {status === 'sent'
            ? "Thanks for reaching out. I'll get back to you within a day."
            : 'Your email app should have opened with the message ready — just hit send.'}
        </p>
        <button type="button" className="btn btn--ghost" onClick={() => setStatus('idle')}>
          Send another
        </button>
      </div>
    );
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      <fieldset className="form__topics">
        <legend>What's this about?</legend>
        <div className="topics">
          {topics.map((t) => (
            <button
              key={t.id}
              type="button"
              className="topic"
              aria-pressed={topic === t.id}
              onClick={() => setTopic(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="grid2 form__row">
        <div className="field-wrap">
          <label htmlFor="cf-name">Name</label>
          <input id="cf-name" name="name" className="field" type="text" autoComplete="name" placeholder="Your name" required />
        </div>
        <div className="field-wrap">
          <label htmlFor="cf-email">Email</label>
          <input id="cf-email" name="email" className="field" type="email" autoComplete="email" placeholder="you@company.com" required />
        </div>
      </div>
      <div className="field-wrap">
        <label htmlFor="cf-msg">Message</label>
        <textarea id="cf-msg" name="message" className="field" rows="5" placeholder="A few lines about the role or project" required />
      </div>
      {/* Spam trap: real people never fill this in. */}
      <input type="text" name="_gotcha" tabIndex="-1" autoComplete="off" className="visually-hidden" aria-hidden="true" />

      {status === 'error' && (
        <p className="form__error" role="alert">
          That didn't send. Try again, or email me directly at {profile.email}.
        </p>
      )}

      <div className="form__foot">
        <span className="mono muted" style={{ fontSize: 12 }}>
          Usually replies within a day
        </span>
        <button type="submit" className="btn btn--primary" disabled={status === 'sending'}>
          {status === 'sending' ? 'Sending…' : 'Send message'} <ArrowIcon />
        </button>
      </div>
    </form>
  );
}

export default function Contact() {
  return (
    <section id="contact" className="wrap contact">
      <div className="row2" style={{ alignItems: 'start' }}>
        <div>
          <p className="eyebrow">05 / CONTACT</p>
          <h2 className="contact__title">
            Let's build
            <br />
            something.
          </h2>
          <p className="contact__lede">
            Hiring, have a project, or just want to talk code? Send a message and I'll reply
            within a day, Auckland time.
          </p>
          <a href={`mailto:${profile.email}`} className="contact__email">
            {profile.email}
          </a>
          <div className="contact__list">
            <a href={profile.github.url}>
              <span>GitHub</span>
              <span className="muted">{profile.github.label} ↗</span>
            </a>
            <a href={profile.linkedin.url}>
              <span>LinkedIn</span>
              <span className="muted">{profile.linkedin.label} ↗</span>
            </a>
            <div>
              <span>Based in</span>
              <span className="muted">Auckland, NZ</span>
            </div>
          </div>
        </div>
        <div className="form-card">
          <ContactForm />
        </div>
      </div>
      <p className="footer">
        © {new Date().getFullYear()} {profile.name} · Tāmaki Makaurau, Aotearoa
      </p>
    </section>
  );
}
