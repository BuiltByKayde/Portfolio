// Email buttons in the admin open a Gmail compose window (new tab) instead of
// the computer's default mail app.
import { profile } from '../data/profile.js';

// Opens Gmail as this account, even if you're signed in to several.
const ACCOUNT = profile.email;

export function gmailCompose({ to = '', subject = '', body = '' } = {}) {
  const params = [
    ['view', 'cm'],
    ['fs', '1'],
    ['to', to],
    ['su', subject],
    ['body', body],
    ['authuser', ACCOUNT],
  ]
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&');
  return `https://mail.google.com/mail/?${params}`;
}

// Spread onto an <a> so it opens in a new tab safely.
export const newTab = { target: '_blank', rel: 'noopener noreferrer' };
