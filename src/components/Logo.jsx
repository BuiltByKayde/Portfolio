// The "builtbykayde" wordmark, built in code so it stays sharp at any size.
// "builtby" is white, "kayde" and the bar pick up the accent colour from styles.css.
export default function Logo({ tagline = true }) {
  return (
    <span className="logo">
      <span className="logo__word">
        <span className="logo__built">builtby</span>
        <span className="logo__name">kayde</span>
      </span>
      {tagline && (
        <span className="logo__line">
          <span className="logo__bar" aria-hidden="true" />
          <span className="logo__tag">FULL-STACK DEVELOPER · NZ</span>
        </span>
      )}
    </span>
  );
}
