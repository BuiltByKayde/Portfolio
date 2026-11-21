import { useState } from 'react';
import Header from './components/Header.jsx';
import Hero from './components/Hero.jsx';
import Stats from './components/Stats.jsx';
import About from './components/About.jsx';
import Stack from './components/Stack.jsx';
import Changelog from './components/Changelog.jsx';
import Work from './components/Work.jsx';
import Principles from './components/Principles.jsx';
import Contact from './components/Contact.jsx';
import JsonView from './components/JsonView.jsx';

export default function App() {
  const [mode, setMode] = useState('read');

  return (
    <>
      <Header mode={mode} onModeChange={setMode} />
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
          <Contact />
        </main>
      ) : (
        <JsonView onBack={() => setMode('read')} />
      )}
    </>
  );
}
