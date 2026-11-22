import { useAucklandTime } from '../hooks/useAucklandTime.js';
import Logo from './Logo.jsx';

const baseLinks = [
  ['#about', '01 about'],
  ['#stack', '02 stack'],
  ['#log', '03 changelog'],
  ['#work', '04 work'],
];

export default function Header({ mode, onModeChange, hasReviews = false }) {
  const time = useAucklandTime();
  const links = hasReviews
    ? [...baseLinks, ['#reviews', '05 reviews'], ['#contact', '06 contact']]
    : [...baseLinks, ['#contact', '05 contact']];

  return (
    <header className="header">
      <div className="wrap header__inner">
        <a
          href="#top"
          className="brand"
          aria-label="builtbykayde, home"
          onClick={() => onModeChange('read')}
        >
          <Logo />
        </a>

        {mode === 'read' && (
          <nav className="nav" aria-label="Sections">
            {links.map(([href, label]) => (
              <a key={href} href={href}>
                {label}
              </a>
            ))}
          </nav>
        )}

        <div className="header__right">
          <span className="clock" aria-label={`Auckland time ${time}`}>
            AKL {time}
          </span>
          <div className="toggle" role="group" aria-label="View mode">
            <button
              type="button"
              aria-pressed={mode === 'read'}
              onClick={() => onModeChange('read')}
            >
              read
            </button>
            <button
              type="button"
              aria-pressed={mode === 'json'}
              onClick={() => onModeChange('json')}
            >
              .json
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
