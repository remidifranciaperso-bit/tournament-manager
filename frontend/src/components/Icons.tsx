import type { ReactNode } from "react";

type IconProps = { className?: string };

export function IconUpload({ className = "h-8 w-8" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 16V4m0 0L8 8m4-4 4 4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" strokeLinecap="round" />
    </svg>
  );
}

export function IconTrophy({ className = "h-6 w-6" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0V4z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 4H5a2 2 0 000 4h2M17 4h2a2 2 0 010 4h-2" strokeLinecap="round" />
    </svg>
  );
}

export function IconGrid({ className = "h-6 w-6" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

export function IconClock({ className = "h-6 w-6" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconCheck({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconLogo({ className = "h-8 w-8" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="12" cy="12" r="3" />
      <path d="M3 9h18" strokeLinecap="round" />
    </svg>
  );
}

export function WizardPageTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mb-8 text-center">
      <h2
        className="font-brush text-[clamp(2.25rem,7vw,4.25rem)] leading-[1.05] text-lime"
        style={{ textShadow: "0 0 40px rgba(212,255,74,0.12)" }}
      >
        {title}
      </h2>
      <p className="mx-auto mt-6 max-w-md text-sm leading-relaxed text-white/45 sm:text-base">
        {subtitle}
      </p>
    </div>
  );
}

export function StepHeader({
  num,
  title,
  subtitle,
}: {
  num: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="relative mb-8">
      <span className="step-num absolute -left-1 -top-4 select-none">{num}</span>
      <div className="relative">
        <div className="mb-1 flex items-center gap-3">
          <span className="font-display text-sm tracking-[0.3em] text-neon">
            ÉTAPE {num}
          </span>
          <span className="h-px flex-1 bg-gradient-to-r from-neon/40 to-transparent" />
        </div>
        <h2 className="font-display text-4xl tracking-wide text-white sm:text-5xl">
          {title}
        </h2>
        <p className="mt-2 text-sm text-white/50">{subtitle}</p>
      </div>
    </div>
  );
}

export function FeaturePill({ children }: { children: ReactNode }) {
  return (
    <span className="chip border-neon/20 bg-neon/5 text-neon-glow">{children}</span>
  );
}
