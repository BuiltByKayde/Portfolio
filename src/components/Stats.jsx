export default function Stats() {
  return (
    <section className="wrap" aria-label="At a glance">
      <div className="stats">
        <div className="stat">
          <div className="stat__value">
            1<span className="stat__unit"> yr</span>
          </div>
          <div className="stat__label">full-stack training at Mission Ready</div>
        </div>
        <div className="stat">
          <div className="stat__value">L5</div>
          <div className="stat__label">Certificate in Full-Stack Development</div>
        </div>
        <div className="stat">
          <div className="stat__value">
            UTC<span className="accent">+13</span>
          </div>
          <div className="stat__label">overlaps Australia and the US West Coast</div>
        </div>
        <div className="stat">
          <div className="stat__value">01</div>
          <div className="stat__label">
            project shipped — you're looking at it. <a href="#work">See how</a>
          </div>
        </div>
      </div>
    </section>
  );
}
