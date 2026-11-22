import { useEffect, useState } from 'react';
import Header from './components/Header.jsx';
import Hero from './components/Hero.jsx';
import Stats from './components/Stats.jsx';
import About from './components/About.jsx';
import Stack from './components/Stack.jsx';
import Changelog from './components/Changelog.jsx';
import Work from './components/Work.jsx';
import Principles from './components/Principles.jsx';
import Reviews from './components/Reviews.jsx';
import Contact from './components/Contact.jsx';
import JsonView from './components/JsonView.jsx';
import { fetchPublishedReviews } from './lib/reviewsApi.js';

export default function App() {
  const [mode, setMode] = useState('read');
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    fetchPublishedReviews()
      .then(setReviews)
      .catch(() => setReviews([]));
  }, []);

  const hasReviews = reviews.length > 0;

  return (
    <>
      <Header mode={mode} onModeChange={setMode} hasReviews={hasReviews} />
      {mode === 'read' ? (
        <main id="top">
          <Hero />
          <Stats />
          <About />
          <Stack />
          <Changelog />
          <Work
            onShowJson={() => {
              setMode('json');
              window.scrollTo({ top: 0 });
            }}
          />
          <Principles />
          {hasReviews && <Reviews reviews={reviews} number="05" />}
          <Contact number={hasReviews ? '06' : '05'} />
        </main>
      ) : (
        <JsonView onBack={() => setMode('read')} />
      )}
    </>
  );
}
