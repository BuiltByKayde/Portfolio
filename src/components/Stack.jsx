import { stack, foundations } from '../data/profile.js';
import { brandIcons } from '../data/brandIcons.js';
import LineIcon from './LineIcon.jsx';

function Tile({ item }) {
  return (
    <li className="tile" style={item.brand ? { '--brand': item.brand } : undefined}>
      {item.icon ? (
        <svg className="ico" width="28" height="28" viewBox="0 0 24 24" aria-hidden="true">
          <path d={brandIcons[item.icon]} />
        </svg>
      ) : (
        <LineIcon name={item.glyph} />
      )}
      <span>{item.name}</span>
    </li>
  );
}

export default function Stack() {
  return (
    <section id="stack" className="wrap section">
      <div className="row2 section__head">
        <div>
          <p className="eyebrow">02 / STACK</p>
          <h2 className="h2">Spec sheet.</h2>
        </div>
        <p>The tools I reach for every day, front to back.</p>
      </div>

      <div className="grid2">
        {stack.map((group) => (
          <div key={group.area} className="panel">
            <div className="panel__head">
              <h3>{group.area}</h3>
              <span>{String(group.items.length).padStart(2, '0')}</span>
            </div>
            <ul className="tiles">
              {group.items.map((item) => (
                <Tile key={item.name} item={item} />
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="foundations">
        <span className="foundations__label">foundations</span>
        {foundations.map((f) => (
          <span key={f} className="chip">
            {f}
          </span>
        ))}
      </div>
    </section>
  );
}
