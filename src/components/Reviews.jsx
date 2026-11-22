import { Stars } from './Star.jsx';

const tints = ['#4f86f7', '#e8a33d', '#3fb68b', '#c77dff', '#ef6f6c', '#2bb3c0'];
function tint(seed = '') {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return tints[h % tints.length];
}

function Who({ r }) {
  return (
    <figcaption className="rv-who">
      <span className="rv-av" style={{ background: tint(r.id) }} aria-hidden="true">
        {(r.firstName || '?')[0].toUpperCase()}
      </span>
      <span>
        <strong>{r.firstName}</strong>
        {r.business && <span>{r.business}</span>}
      </span>
    </figcaption>
  );
}

// Only rendered when there's at least one published review (see App.jsx).
export default function Reviews({ reviews, number }) {
  const [top, ...rest] = reviews;
  const avg = reviews.reduce((a, r) => a + r.rating, 0) / reviews.length;

  return (
    <section id="reviews" className="wrap section" aria-labelledby="reviews-title">
      <div className="row2 section__head">
        <div>
          <p className="eyebrow">{number} / REVIEWS</p>
          <h2 id="reviews-title" className="h2">
            In their words.
          </h2>
        </div>
        <p>Small businesses I’ve built for, unedited apart from the odd typo.</p>
      </div>

      <div className={`rv-grid${rest.length ? '' : ' rv-grid--single'}`}>
        <figure className="rv-card rv-card--feature">
          <div>
            <div className="rv-qmark" aria-hidden="true">
              “
            </div>
            <blockquote>
              <p>{top.quote}</p>
            </blockquote>
          </div>
          <div className="rv-card__foot">
            <Who r={top} />
            <Stars rating={top.rating} size={18} />
          </div>
        </figure>

        {rest.length > 0 && (
          <div className="rv-side">
            {rest.slice(0, 4).map((r) => (
              <figure key={r.id} className="rv-card">
                <Stars rating={r.rating} />
                <blockquote>
                  <p>{r.quote}</p>
                </blockquote>
                <Who r={r} />
              </figure>
            ))}
          </div>
        )}
      </div>

      <div className="rv-summary">
        <strong>{avg.toFixed(1)}</strong>
        <span>
          average from {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
        </span>
        <a href="/review">Worked with me? Leave a review →</a>
      </div>
    </section>
  );
}
