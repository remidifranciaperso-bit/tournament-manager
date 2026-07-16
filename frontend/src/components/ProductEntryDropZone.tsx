import { useRef, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { IconCheck, IconUpload } from "./Icons";
import { PadelBall } from "./PadelBall";

interface ProductEntryDropZoneProps {
  accept: string;
  file: File | null;
  onFile: (file: File | null) => void;
  title: string;
  description?: string;
  dropHint?: string;
  icon?: ReactNode;
  prominent?: boolean;
  /** Bordure pointillée + néon au survol (style FileDrop Engine logo). */
  engineDropStyle?: boolean;
  loading?: boolean;
  disabled?: boolean;
  compact?: boolean;
}

/** Zone glisser-déposer pour la page d'entrée Live / Engine. */
export function ProductEntryDropZone({
  accept,
  file,
  onFile,
  title,
  description,
  dropHint = "Glissez votre fichier ici",
  icon,
  prominent = false,
  engineDropStyle = false,
  loading = false,
  disabled = false,
  compact = false,
}: ProductEntryDropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const handleFile = (next: File | null) => {
    if (disabled || loading) return;
    onFile(next);
  };

  return (
    <div
      onDragOver={(event) => {
        if (disabled || loading) return;
        event.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setOver(false);
        if (disabled || loading) return;
        const dropped = event.dataTransfer.files?.[0];
        if (dropped) handleFile(dropped);
      }}
      onClick={() => {
        if (disabled || loading) return;
        inputRef.current?.click();
      }}
      className={[
        "group relative flex w-full cursor-pointer flex-col items-center justify-center text-center transition",
        engineDropStyle ? "overflow-hidden border-2 border-dashed" : "",
        prominent
          ? "min-h-[12.5rem] gap-4 rounded-2xl px-6 py-8 backdrop-blur-[2px] sm:px-8 sm:py-10"
          : compact
            ? "min-h-[5.75rem] gap-2 rounded-xl border px-4 py-3.5 backdrop-blur-[2px]"
            : "min-h-[7.5rem] gap-3 rounded-xl border px-5 py-5 backdrop-blur-[2px]",
        !engineDropStyle && prominent ? "border shadow-lime" : "",
        disabled || loading
          ? "cursor-wait border-white/10 bg-black/25 opacity-80"
          : over
            ? engineDropStyle
              ? "border-lime/60 bg-lime/5 shadow-lime"
              : prominent
                ? "border-lime/75 bg-black/50"
                : "border-white/25 bg-black/35"
            : file
              ? engineDropStyle
                ? "border-lime/40 bg-lime/5 shadow-lime"
                : prominent
                  ? "border-lime/55 bg-black/45"
                  : "border-lime/30 bg-black/30"
              : engineDropStyle
                ? "border-lime/25 bg-lime/[0.03] hover:border-lime/45 hover:bg-lime/5"
                : prominent
                  ? "border-lime/50 bg-black/40 hover:border-lime/75 hover:bg-black/50"
                  : "border-white/10 bg-black/20 hover:border-white/20 hover:bg-black/30",
      ].join(" ")}
    >
      {engineDropStyle ? (
        <div className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100">
          <div className="absolute inset-0 bg-gradient-to-b from-lime/5 to-transparent" />
        </div>
      ) : null}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        disabled={disabled || loading}
        onChange={(event) => handleFile(event.target.files?.[0] ?? null)}
      />

      {loading ? (
        <div className="flex flex-col items-center gap-3">
          <PadelBall size={36} spinning realistic />
          <p className="text-xs text-white/50">Import du pack en cours…</p>
        </div>
      ) : (
        <>
          <div
            className={[
              "flex items-center justify-center rounded-xl transition",
              prominent ? "h-14 w-14 bg-lime/15 text-lime" : compact ? "h-8 w-8 text-lime/70" : "h-10 w-10 text-lime/70",
            ].join(" ")}
          >
            {file ? (
              <IconCheck className={prominent ? "h-8 w-8" : "h-6 w-6"} />
            ) : (
              icon ?? <IconUpload className={prominent ? "h-9 w-9" : compact ? "h-6 w-6" : "h-7 w-7"} />
            )}
          </div>

          <div className="flex max-w-sm flex-col gap-1.5">
            <span
              className={[
                "font-semibold text-white",
                prominent ? "text-lg sm:text-xl" : "text-sm sm:text-base",
              ].join(" ")}
            >
              {file ? file.name : title}
            </span>
            {!file && description ? (
              <span className="text-[11px] leading-snug text-white/45 sm:text-xs">
                {description}
              </span>
            ) : null}
            {!file && dropHint ? (
              <span className="text-[10px] uppercase tracking-wide text-white/30">
                {dropHint}
              </span>
            ) : null}
          </div>

          {file ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                handleFile(null);
              }}
              className="text-[11px] text-white/35 underline-offset-2 hover:text-white/60 hover:underline"
            >
              Changer de fichier
            </button>
          ) : null}
        </>
      )}
    </div>
  );
}
