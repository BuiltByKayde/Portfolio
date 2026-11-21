import { principles } from '../data/profile.js';

export default function Principles() {
  return (
    <section className="wrap section" aria-label="How I work">
      <div className="grid3 principles">
        {principles.map((p) => (
          <div key={p.title} className="principle">
            <h3 className="h3">{p.title}</h3>
            <p>{p.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
