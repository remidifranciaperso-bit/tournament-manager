export function PadelBall({
  size = 48,
  spinning = false,
  id = "ball",
}: {
  size?: number;
  spinning?: boolean;
  id?: string;
}) {
  const gradId = `${id}-grad`;
  const shadowId = `${id}-shadow`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={spinning ? "animate-spinBall" : ""}
      aria-hidden
    >
      <defs>
        <radialGradient id={gradId} cx="32%" cy="28%" r="72%">
          <stop offset="0%" stopColor="#f0ff9a" />
          <stop offset="55%" stopColor="#d4ff4a" />
          <stop offset="100%" stopColor="#9eb82a" />
        </radialGradient>
        <filter id={shadowId} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.35" />
        </filter>
      </defs>

      <circle
        cx="32"
        cy="32"
        r="29"
        fill={`url(#${gradId})`}
        filter={`url(#${shadowId})`}
      />

      {/* Perforations caractéristiques d'une balle de padel */}
      <g fill="none" stroke="#f8ffe8" strokeWidth="2.8" strokeLinecap="round">
        <path d="M12 18 C22 8, 42 8, 52 18" />
        <path d="M12 46 C22 56, 42 56, 52 46" />
        <path d="M8 32 C18 24, 46 24, 56 32" />
        <path d="M8 32 C18 40, 46 40, 56 32" />
      </g>

      <ellipse
        cx="24"
        cy="22"
        rx="7"
        ry="4"
        fill="white"
        opacity="0.22"
        transform="rotate(-25 24 22)"
      />
    </svg>
  );
}
