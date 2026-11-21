import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

// /admin loads its own bundle, so normal visitors never download the dashboard code.
const AdminApp = lazy(() => import('./admin/AdminApp.jsx'));
const isAdmin = window.location.pathname.replace(/\/+$/, '').startsWith('/admin');

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isAdmin ? (
      <Suspense fallback={null}>
        <AdminApp />
      </Suspense>
    ) : (
      <App />
    )}
  </StrictMode>
);
