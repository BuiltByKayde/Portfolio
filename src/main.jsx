import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';
import './reviews.css';

// /admin loads its own bundle, so normal visitors never download the dashboard code.
const AdminApp = lazy(() => import('./admin/AdminApp.jsx'));
// /review is the page clients use to leave a review.
const ReviewPage = lazy(() => import('./components/ReviewPage.jsx'));

const path = window.location.pathname.replace(/\/+$/, '');
const isAdmin = path.startsWith('/admin');
const isReview = path === '/review';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isAdmin ? (
      <Suspense fallback={null}>
        <AdminApp />
      </Suspense>
    ) : isReview ? (
      <Suspense fallback={null}>
        <ReviewPage />
      </Suspense>
    ) : (
      <App />
    )}
  </StrictMode>
);
