export function PadelBall({
  size = 48,
  spinning = false,
}: {
  size?: number;
  spinning?: boolean;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={spinning ? "animate-spinBall" : ""}
    >
      <defs>
        <radialGradient id="ballGrad" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#eaff8a" />
          <stop offset="100%" stopColor="#c2e12f" />
        </radialGradient>
      </defs>
      <circle cx="32" cy="32" r="30" fill="url(#ballGrad)" />
      <path
        d="M10 14 A34 34 0 0 1 54 14"
        fill="none"
        stroke="#ffffff"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M10 50 A34 34 0 0 0 54 50"
        fill="none"
        stroke="#ffffff"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}
