type PadelBallProps = {
  size?: number;
  spinning?: boolean;
  /** Photo réaliste (sidebar). SVG léger pour fallback. */
  realistic?: boolean;
};

export function PadelBall({
  size = 48,
  spinning = false,
  realistic = true,
}: PadelBallProps) {
  if (realistic) {
    return (
      <img
        src="/images/padel-ball.png"
        alt=""
        width={size}
        height={size}
        draggable={false}
        className={[
          "select-none object-contain",
          spinning ? "animate-spinBall" : "",
        ].join(" ")}
        style={{
          width: size,
          height: size,
          filter: "drop-shadow(0 6px 14px rgba(0,0,0,0.5))",
        }}
      />
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={spinning ? "animate-spinBall" : ""}
      aria-hidden
    >
      <defs>
        <radialGradient id="ballGrad" cx="32%" cy="28%" r="72%">
          <stop offset="0%" stopColor="#f0ff9a" />
          <stop offset="55%" stopColor="#d4ff4a" />
          <stop offset="100%" stopColor="#9eb82a" />
        </radialGradient>
      </defs>
      <circle cx="32" cy="32" r="29" fill="url(#ballGrad)" />
      <g fill="none" stroke="#f8ffe8" strokeWidth="2.8" strokeLinecap="round">
        <path d="M12 18 C22 8, 42 8, 52 18" />
        <path d="M12 46 C22 56, 42 56, 52 46" />
      </g>
    </svg>
  );
}
