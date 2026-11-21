// Simple stroke icons for skills that don't have a brand logo.
const glyphs = {
  api: <path d="M4 8h14l-3-3M20 16H6l3 3" />,
  lock: (
    <>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </>
  ),
  database: (
    <>
      <ellipse cx="12" cy="6" rx="7" ry="3" />
      <path d="M5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3" />
    </>
  ),
  code: <path d="M8 7l-5 5 5 5M16 7l5 5-5 5M13.5 4l-3 16" />,
  check: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.5l2.5 2.5L16 9.5" />
    </>
  ),
  upload: <path d="M12 16V4M7 9l5-5 5 5M5 20h14" />,
};

export default function LineIcon({ name, size = 28, className = 'sico' }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      {glyphs[name]}
    </svg>
  );
}
