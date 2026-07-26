import type { ReactNode } from "react";
import { LiveNightCourtBackground } from "../../manager/LiveNightCourtBackground";

export const MVP_PREVIEW_BUILD = "v20260726o";

/** Coque preview : fond nuit, pas de bandeau bas. */
export function MvpPreviewShell({
  children,
  center = true,
  scrollable = false,
}: {
  children: ReactNode;
  center?: boolean;
  scrollable?: boolean;
}) {
  return (
    <div className="relative h-full min-h-0 w-full overflow-hidden">
      <LiveNightCourtBackground />
      <main
        className={[
          "relative z-10 flex h-full min-h-0 flex-col items-center px-4",
          scrollable ? "overflow-y-auto overscroll-y-contain" : "overflow-hidden",
          center ? "justify-center" : "justify-start pt-3",
        ].join(" ")}
      >
        {children}
      </main>
    </div>
  );
}

export function MvpLoginButton({
  children,
  onClick,
  disabled = false,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full rounded-xl px-6 py-3.5 text-base font-bold text-arena-950 disabled:cursor-wait disabled:opacity-60"
      style={{
        background: "linear-gradient(135deg, #d4ff4a 0%, #a8e020 100%)",
        boxShadow: "0 0 28px -2px rgba(212,255,74,0.55)",
        minHeight: "48px",
      }}
    >
      {children}
    </button>
  );
}
