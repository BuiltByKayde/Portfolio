// ---------------------------------------------------------------------------
// Admin login.
//
// With VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY set in .env, this
// uses Supabase Auth: only users you add in Supabase → Authentication → Users
// can sign in (public sign-ups should be turned off there).
//
// Without them (test mode), any email + password works while running
// `npm run dev`, and a production build refuses everyone.
// ---------------------------------------------------------------------------

import { supabase } from '../lib/supabase.js';

export const authConnected = Boolean(supabase);

const KEY = 'kd-admin-session'; // test mode only: where the fake session is kept

function toSession(s) {
  return s?.user ? { email: s.user.email ?? '', userId: s.user.id } : null;
}

export async function getSession() {
  if (supabase) {
    const { data } = await supabase.auth.getSession();
    return toSession(data.session);
  }
  try {
    return JSON.parse(sessionStorage.getItem(KEY));
  } catch {
    return null;
  }
}

export async function signIn(email, password) {
  if (!email || !password) {
    throw new Error('Enter your email and password.');
  }

  if (supabase) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      throw new Error(
        error.status === 400 ? 'Wrong email or password.' : 'Couldn’t sign in. Try again.'
      );
    }
    return toSession(data.session);
  }

  if (!import.meta.env.DEV) {
    throw new Error('Login isn’t connected yet. Connect Supabase to sign in.');
  }
  const session = { email };
  try {
    sessionStorage.setItem(KEY, JSON.stringify(session));
  } catch {
    // Private mode etc. — the session just won't survive a refresh.
  }
  return session;
}

export async function signOut() {
  if (supabase) {
    await supabase.auth.signOut();
    return;
  }
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

// Calls back when the Supabase session ends (signed out in another tab,
// expired refresh token). Returns an unsubscribe function.
export function onSignedOut(callback) {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((event, s) => {
    if (event === 'SIGNED_OUT' || !s) callback();
  });
  return () => data.subscription.unsubscribe();
}
