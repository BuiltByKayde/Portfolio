import { useState } from 'react';
import Logo from '../components/Logo.jsx';
import Icon from './Icon.jsx';
import { signIn } from './auth.js';

export default function Login({ onSignedIn }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setBusy(true);
    setError('');
    try {
      const session = await signIn(String(data.get('email')).trim(), String(data.get('password')));
      onSignedIn(session);
    } catch (err) {
      setError(err.message || 'Couldn’t sign in. Try again.');
      setBusy(false);
    }
  }

  return (
    <div className="login">
      <div className="login__card">
        <div className="login__brand">
          <Logo />
        </div>

        <div className="login__head">
          <span className="login__lock">
            <Icon name="lock" size={18} />
          </span>
          <h1>Sign in</h1>
          <p>Admin area for managing clients.</p>
        </div>

        <form className="login__form" onSubmit={handleSubmit} noValidate>
          <div className="afield">
            <label htmlFor="login-email">Email</label>
            <input
              id="login-email"
              name="email"
              type="email"
              autoComplete="username"
              placeholder="you@example.com"
              required
            />
          </div>
          <div className="afield">
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>

          {error && (
            <p className="login__error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="abtn abtn--primary abtn--block" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <a href="/" className="login__back">
          <Icon name="arrowLeft" size={16} /> Back to the site
        </a>
      </div>
    </div>
  );
}
