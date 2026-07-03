export function CourtBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Mesh lumineux */}
      <div className="absolute inset-0 bg-mesh" />

      {/* Texture court en bas */}
      <div
        className="absolute -bottom-32 left-1/2 h-[420px] w-[140%] -translate-x-1/2 rounded-[50%] opacity-20"
        style={{
          background:
            "radial-gradient(ellipse, #0d6b62 0%, #0a3d4a 50%, transparent 70%)",
        }}
      />

      {/* Lignes de court SVG */}
      <svg
        className="absolute inset-0 h-full w-full opacity-[0.07]"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <pattern
            id="grid"
            width="80"
            height="80"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 80 0 L 0 0 0 80"
              fill="none"
              stroke="white"
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
        {/* Ligne centrale verticale (filet) */}
        <line
          x1="50%"
          y1="0"
          x2="50%"
          y2="100%"
          stroke="white"
          strokeWidth="2"
          strokeDasharray="12 8"
        />
        {/* Lignes de service */}
        <line x1="0" y1="35%" x2="100%" y2="35%" stroke="white" strokeWidth="1.5" />
        <line x1="0" y1="65%" x2="100%" y2="65%" stroke="white" strokeWidth="1.5" />
      </svg>

      {/* Orbe néon animé */}
      <div className="absolute -right-32 -top-32 h-96 w-96 animate-pulseGlow rounded-full bg-neon/10 blur-3xl" />
      <div className="absolute -bottom-20 -left-20 h-72 w-72 animate-pulseGlow rounded-full bg-lime/5 blur-3xl" />
    </div>
  );
}

export function CourtGraphic({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 320 480"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="20"
        y="20"
        width="280"
        height="440"
        rx="8"
        fill="url(#courtGrad)"
        stroke="rgba(255,255,255,0.15)"
        strokeWidth="2"
      />
      <line
        x1="160"
        y1="20"
        x2="160"
        y2="460"
        stroke="rgba(255,255,255,0.5)"
        strokeWidth="2"
        strokeDasharray="8 6"
      />
      <line x1="20" y1="180" x2="300" y2="180" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
      <line x1="20" y1="300" x2="300" y2="300" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
      <rect x="20" y="180" width="140" height="120" stroke="rgba(255,255,255,0.2)" strokeWidth="1" fill="none" />
      <rect x="160" y="180" width="140" height="120" stroke="rgba(255,255,255,0.2)" strokeWidth="1" fill="none" />
      {/* Balle */}
      <circle cx="240" cy="120" r="18" fill="url(#ballGrad)" />
      <path
        d="M228 108 A22 22 0 0 1 252 108"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M228 132 A22 22 0 0 0 252 132"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      <defs>
        <linearGradient id="courtGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0d5c5a" />
          <stop offset="100%" stopColor="#0a3d4a" />
        </linearGradient>
        <radialGradient id="ballGrad" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#eaff8a" />
          <stop offset="100%" stopColor="#c2e12f" />
        </radialGradient>
      </defs>
    </svg>
  );
}
