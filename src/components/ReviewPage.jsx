import { useEffect, useState } from 'react';
import Logo from './Logo.jsx';
import Star from './Star.jsx';
import { submitReview } from '../lib/reviewsApi.js';

const WORDS = ['Tap a star', 'Poor', 'Okay', 'Good', 'Great', 'Excellent'];

// The page clients reach from builtbykayde.vercel.app/review
export default function ReviewPage() {
  const [rating, setRating] = useState(5);
  const [quote, setQuote] = useState('');
  const [name, setName] = useState('');
  const [business, setBusiness] = useState('');
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(true);
  const [status, setStatus] = useState('idle'); // idle | sending | sent
  const [error, setError] = useState('');

  useEffect(() => {
    document.title = 'Leave a review · builtbykayde';
  }, []);

  async function submit(e) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    if (form.get('_gotcha')) {
      setStatus('sent');
      return;
    }
    if (quote.trim().length < 10) return setError('Add a few words about how it went.');
    if (!name.trim()) return setError('Add your name.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError('Check your email address.');
    setError('');
    setStatus('sending');
    try {
      await submitReview({
        name: name.trim(),
        business: business.trim(),
        email: email.trim(),
        rating,
        quote: quote.trim(),
        consent,
      });
      setStatus('sent');
    } catch (err) {
      setError(err.friendly || 'That didn’t send. Try again in a moment.');
      setStatus('idle');
    }
  }

  const first = name.trim().split(/\s+/)[0];

  return (
    <main className="rvp">
      <a href="/" className="rvp__logo" aria-label="builtbykayde home">
        <Logo />
      </a>

      <section className="rvp__card" aria-labelledby="rvp-title">
        {status === 'sent' ? (
          <div className="rvp__done" role="status">
            <span className="rvp__done-icon" aria-hidden="true">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
            </span>
            <h1 id="rvp-title">Ngā mihi{first ? `, ${first}` : ''}!</h1>
            <p>Your review means a lot. It’ll show on my site once I’ve had a look.</p>
            <p className="rvp__back">
              <a href="/">Back to builtbykayde →</a>
            </p>
          </div>
        ) : (
          <>
            <h1 id="rvp-title">How did it go?</h1>
            <p className="rvp__lede">
              Thanks for working with me! A few honest words help other small businesses decide. It takes about two
              minutes.
            </p>

            <form className="rvp__form" onSubmit={submit} noValidate>
              <div role="group" aria-labelledby="rvp-stars">
                <span id="rvp-stars" className="rvp__label">
                  Your rating
                </span>
                <div className="rvp__stars">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      className={`rvp__star${n <= rating ? ' is-on' : ''}`}
                      aria-label={`${n} ${n === 1 ? 'star' : 'stars'}`}
                      aria-pressed={rating === n}
                      onClick={() => setRating(n)}
                    >
                      <Star size={24} />
                    </button>
                  ))}
                </div>
                <p className="rvp__note">
                  {rating} of 5 · {WORDS[rating]}
                </p>
              </div>

              <div className="field-wrap">
                <label htmlFor="rvp-quote" className="rvp__label rvp__label--row">
                  Your review <span className="field-hint">{quote.length} / 600</span>
                </label>
                <textarea
                  id="rvp-quote"
                  className="field"
                  rows={5}
                  maxLength={600}
                  placeholder="What did I build for you, and how has it helped your business?"
                  value={quote}
                  onChange={(e) => setQuote(e.target.value)}
                />
              </div>

              <div className="grid2 rvp__row">
                <div className="field-wrap">
                  <label htmlFor="rvp-name">Your name</label>
                  <input
                    id="rvp-name"
                    className="field"
                    type="text"
                    autoComplete="name"
                    maxLength={120}
                    placeholder="First and last name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="field-wrap">
                  <label htmlFor="rvp-biz">
                    Business <span className="field-hint">optional</span>
                  </label>
                  <input
                    id="rvp-biz"
                    className="field"
                    type="text"
                    autoComplete="organization"
                    maxLength={120}
                    placeholder="Business name"
                    value={business}
                    onChange={(e) => setBusiness(e.target.value)}
                  />
                </div>
              </div>

              <div className="field-wrap">
                <label htmlFor="rvp-email">
                  Email <span className="field-hint">never shown publicly</span>
                </label>
                <input
                  id="rvp-email"
                  className="field"
                  type="email"
                  autoComplete="email"
                  maxLength={254}
                  placeholder="you@business.co.nz"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <label className="rvp__consent">
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                <span>
                  Kayde can show my review, first name and business on <strong>builtbykayde.vercel.app</strong>. My
                  email stays private.
                </span>
              </label>

              {/* Spam trap: real people never fill this in. */}
              <input type="text" name="_gotcha" tabIndex="-1" autoComplete="off" className="visually-hidden" aria-hidden="true" />

              {error && (
                <p className="form__error" role="alert">
                  {error}
                </p>
              )}

              <div className="rvp__foot">
                <span className="mono muted" style={{ fontSize: 12 }}>
                  Reviews are checked before they appear
                </span>
                <button type="submit" className="btn btn--primary" disabled={status === 'sending'}>
                  {status === 'sending' ? 'Sending…' : 'Send review'}
                </button>
              </div>
            </form>
          </>
        )}
      </section>
    </main>
  );
}
