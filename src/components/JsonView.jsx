import { useMemo } from 'react';
import { profile, stack, projects } from '../data/profile.js';

// Built from the same data as the readable page, so the two never drift apart.
function buildPayload() {
  return {
    name: profile.name,
    age: profile.age,
    location: profile.location,
    role: profile.role,
    education: profile.education,
    experience: profile.experience,
    stack: Object.fromEntries(stack.map((row) => [row.area, row.items.map((i) => i.name)])),
    projects: projects
      .filter((p) => p.status === 'live')
      .map((p) => ({ title: p.title, stack: p.tags })),
    projectsInBuild: projects.filter((p) => p.status === 'building').length,
    status: profile.status,
    contact: profile.email,
  };
}

// Tiny JSON syntax highlighter: splits the string into key / string / number tokens.
const TOKEN = /("(?:\\.|[^"\\])*")(\s*:)?|(-?\d+(?:\.\d+)?)/g;

function highlight(json) {
  const out = [];
  let last = 0;
  let i = 0;
  for (const m of json.matchAll(TOKEN)) {
    if (m.index > last) out.push(json.slice(last, m.index));
    if (m[1] && m[2]) {
      out.push(<span key={i++} className="tok-key">{m[1]}</span>, m[2]);
    } else if (m[1]) {
      out.push(<span key={i++} className="tok-str">{m[1]}</span>);
    } else {
      out.push(<span key={i++} className="tok-num">{m[3]}</span>);
    }
    last = m.index + m[0].length;
  }
  out.push(json.slice(last));
  return out;
}

export default function JsonView({ onBack }) {
  const content = useMemo(() => highlight(JSON.stringify(buildPayload(), null, 2)), []);

  return (
    <main className="wrap json">
      <p className="json__status">GET /kayde-denton · 200 OK · application/json</p>
      <pre aria-label="Profile as JSON">{content}</pre>
      <button type="button" className="btn btn--ghost mono" onClick={onBack}>
        Back to the readable version
      </button>
    </main>
  );
}
