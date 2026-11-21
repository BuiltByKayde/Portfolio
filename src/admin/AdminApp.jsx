import { useEffect, useState } from 'react';
import { getSession, signOut, onSignedOut } from './auth.js';
import Login from './Login.jsx';
import Dashboard from './Dashboard.jsx';
import './admin.css';

export default function AdminApp() {
  const [session, setSession] = useState(undefined); // undefined = still checking

  useEffect(() => {
    document.title = 'Admin · builtbykayde';
    // Keep the admin area out of search results.
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);

    getSession().then((s) => setSession(s ?? null));
    const stopWatching = onSignedOut(() => setSession(null));
    return () => {
      meta.remove();
      stopWatching();
    };
  }, []);

  if (session === undefined) return null;

  if (!session) return <Login onSignedIn={setSession} />;

  return (
    <Dashboard
      session={session}
      onSignOut={async () => {
        await signOut();
        setSession(null);
      }}
    />
  );
}
