/**
 * Tracé officiel d'un court de padel (20 m × 10 m), vu du dessus.
 * Cotes FIP : filet au centre, lignes de service à 6,95 m du filet,
 * ligne centrale de service sur la largeur (5 m).
 */
import type { CSSProperties } from "react";

const COURT = {
  length: 20,
  width: 10,
  serviceFromNet: 6.95,
};

/** Coordonnées du tracé dans un viewBox, avec marge (inset) comme la v1. */
function padelCourtLines(viewW: number, viewL: number, inset = 5) {
  const x0 = inset;
  const x1 = viewW - inset;
  const y0 = inset;
  const y1 = viewL - inset;
  const courtW = x1 - x0;
  const courtH = y1 - y0;
  const cx = x0 + courtW / 2;
  const yNet = y0 + courtH / 2;
  const serviceOffset = (COURT.serviceFromNet / COURT.length) * courtH;
  const yServiceTop = yNet - serviceOffset;
  const yServiceBottom = yNet + serviceOffset;

  return { x0, x1, y0, y1, cx, courtW, courtH, yNet, yServiceTop, yServiceBottom };
}

function PadelCourtSvg({
  className = "",
  style,
  stroke = "#d4ff4a",
  strokeOpacity = 1,
}: {
  className?: string;
  style?: CSSProperties;
  stroke?: string;
  strokeOpacity?: number;
}) {
  const vbW = 100;
  const vbL = 200;
  const {
    x0,
    x1,
    y0,
    courtW,
    courtH,
    cx,
    yNet,
    yServiceTop,
    yServiceBottom,
  } = padelCourtLines(vbW, vbL, 5);

  return (
    <svg
      className={className}
      style={style}
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid meet"
      viewBox={`0 0 ${vbW} ${vbL}`}
    >
      <g
        fill="none"
        stroke={stroke}
        strokeOpacity={strokeOpacity}
        strokeWidth="0.4"
        vectorEffect="non-scaling-stroke"
      >
        <rect x={x0} y={y0} width={courtW} height={courtH} rx="1" />
        <line x1={x0} y1={yNet} x2={x1} y2={yNet} strokeWidth="0.6" />
        <line x1={x0} y1={yServiceTop} x2={x1} y2={yServiceTop} />
        <line x1={x0} y1={yServiceBottom} x2={x1} y2={yServiceBottom} />
        <line x1={cx} y1={yServiceTop} x2={cx} y2={yNet} />
        <line x1={cx} y1={yNet} x2={cx} y2={yServiceBottom} />
      </g>
    </svg>
  );
}

/** Tracé padel 20×10 m, traits simples (sans halo). */
export function PadelCourtOutline({
  className = "",
  stroke = "#ffffff",
  strokeOpacity = 0.9,
}: {
  className?: string;
  stroke?: string;
  strokeOpacity?: number;
}) {
  return (
    <PadelCourtSvg
      className={className}
      stroke={stroke}
      strokeOpacity={strokeOpacity}
    />
  );
}

/** Bleu principal des templates PowerPoint (« templates bleus »). */
export const TEMPLATE_COURT_BLUE = "#00B0F0";

/** Terrain padel rempli (projection / mode clair). */
export function PadelCourtFilled({ className = "" }: { className?: string }) {
  const vbW = 100;
  const vbL = 200;
  const {
    x0,
    x1,
    y0,
    courtW,
    courtH,
    cx,
    yNet,
    yServiceTop,
    yServiceBottom,
  } = padelCourtLines(vbW, vbL, 5);

  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid meet"
      viewBox={`0 0 ${vbW} ${vbL}`}
    >
      <rect
        x={x0}
        y={y0}
        width={courtW}
        height={courtH}
        rx="1"
        fill={TEMPLATE_COURT_BLUE}
      />
      <g
        fill="none"
        stroke="#ffffff"
        strokeOpacity={0.92}
        strokeWidth="0.4"
        vectorEffect="non-scaling-stroke"
      >
        <rect x={x0} y={y0} width={courtW} height={courtH} rx="1" />
        <line x1={x0} y1={yNet} x2={x1} y2={yNet} strokeWidth="0.6" />
        <line x1={x0} y1={yServiceTop} x2={x1} y2={yServiceTop} />
        <line x1={x0} y1={yServiceBottom} x2={x1} y2={yServiceBottom} />
        <line x1={cx} y1={yServiceTop} x2={cx} y2={yNet} />
        <line x1={cx} y1={yNet} x2={cx} y2={yServiceBottom} />
      </g>
    </svg>
  );
}

export function CourtBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-arena-950">
      <div className="absolute inset-0 bg-mesh" />

      <PadelCourtSvg className="absolute left-1/2 top-0 h-full w-auto -translate-x-1/2 opacity-[0.07]" />
      <PadelCourtSvg
        className="absolute top-0 h-full w-auto -translate-x-1/2 opacity-[0.07]"
        style={{ left: "calc(50% - 50vh - 5vw)" }}
      />
      <PadelCourtSvg
        className="absolute top-0 h-full w-auto -translate-x-1/2 opacity-[0.07]"
        style={{ left: "calc(50% + 50vh + 5vw)" }}
      />

      <div className="absolute -right-32 -top-32 h-96 w-96 animate-pulseGlow rounded-full bg-neon/10 blur-3xl" />
      <div className="absolute -bottom-20 -left-20 h-72 w-72 animate-pulseGlow rounded-full bg-lime/5 blur-3xl" />
    </div>
  );
}

export function CourtGraphic({ className = "" }: { className?: string }) {
  const vbW = 100;
  const vbL = 200;
  const {
    x0,
    x1,
    y0,
    courtW,
    courtH,
    cx,
    yNet,
    yServiceTop,
    yServiceBottom,
  } = padelCourtLines(vbW, vbL, 5);

  return (
    <svg
      viewBox={`0 0 ${vbW} ${vbL}`}
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x={x0}
        y={y0}
        width={courtW}
        height={courtH}
        rx="2"
        fill="url(#courtGrad)"
        stroke="rgba(255,255,255,0.15)"
        strokeWidth="0.8"
      />
      <line
        x1={x0}
        y1={yNet}
        x2={x1}
        y2={yNet}
        stroke="rgba(255,255,255,0.5)"
        strokeWidth="0.8"
      />
      <line
        x1={x0}
        y1={yServiceTop}
        x2={x1}
        y2={yServiceTop}
        stroke="rgba(255,255,255,0.3)"
        strokeWidth="0.5"
      />
      <line
        x1={x0}
        y1={yServiceBottom}
        x2={x1}
        y2={yServiceBottom}
        stroke="rgba(255,255,255,0.3)"
        strokeWidth="0.5"
      />
      <line
        x1={cx}
        y1={yServiceTop}
        x2={cx}
        y2={yNet}
        stroke="rgba(255,255,255,0.25)"
        strokeWidth="0.5"
      />
      <line
        x1={cx}
        y1={yNet}
        x2={cx}
        y2={yServiceBottom}
        stroke="rgba(255,255,255,0.25)"
        strokeWidth="0.5"
      />
      <circle cx="72" cy="48" r="7" fill="url(#ballGrad)" />
      <path
        d="M66 42 A9 9 0 0 1 78 42"
        stroke="white"
        strokeWidth="1.2"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M66 54 A9 9 0 0 0 78 54"
        stroke="white"
        strokeWidth="1.2"
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
