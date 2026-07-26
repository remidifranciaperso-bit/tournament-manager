import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { IconCheck, IconUpload } from "./Icons";

export function FileDrop({
  accept,
  file,
  onFile,
  title,
  hint,
  icon,
  variant = "neon",
  disabled = false,
  compact = false,
}: {
  accept: string;
  file: File | null;
  onFile: (f: File | null) => void;
  title: string;
  hint?: string;
  icon?: React.ReactNode;
  variant?: "neon" | "lime";
  disabled?: boolean;
  compact?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const isLime = variant === "lime";
  const accentue = over && !disabled;

  return (
    <div
      onDragOver={(e) => {
        if (disabled) return;
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        if (disabled) return;
        const f = e.dataTransfer.files?.[0];
        if (f) onFile(f);
      }}
      onClick={() => {
        if (disabled) return;
        inputRef.current?.click();
      }}
      className={[
        "group relative flex flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed text-center transition",
        compact ? "gap-2 p-5" : "gap-4 p-10",
        disabled
          ? "cursor-wait border-white/10 bg-white/[0.02] opacity-70"
          : "cursor-pointer",
        accentue
          ? isLime
            ? "border-lime/70 bg-lime/10 shadow-lime ring-2 ring-lime/25"
            : "border-neon/70 bg-neon/10 shadow-neon ring-2 ring-neon/25"
          : file
            ? isLime
              ? "border-lime/40 bg-lime/5"
              : "border-neon/40 bg-neon/5"
            : isLime
              ? "border-lime/25 bg-lime/[0.03] hover:border-lime/45 hover:bg-lime/5"
              : "border-white/15 bg-white/[0.02] hover:border-neon/30 hover:bg-white/[0.04]",
      ].join(" ")}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        disabled={disabled}
        onChange={(e) => onFile(e.target.files?.[0] ?? null)}
      />

      {/* Halo au survol ou glisser-déposer */}
      <div
        className={[
          "pointer-events-none absolute inset-0 transition",
          accentue ? "opacity-100" : "opacity-0 group-hover:opacity-100",
        ].join(" ")}
      >
        <div
          className={[
            "absolute inset-0 bg-gradient-to-b to-transparent",
            isLime ? "from-lime/10" : "from-neon/10",
          ].join(" ")}
        />
      </div>

      <motion.div
        key={file ? "has" : "empty"}
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={[
          "relative flex items-center justify-center rounded-2xl transition",
          compact ? "h-12 w-12" : "h-16 w-16",
          file
            ? isLime
              ? "bg-lime/20 text-lime"
              : "bg-neon/20 text-neon"
            : isLime
              ? "bg-white/5 text-white/40 group-hover:text-lime/80"
              : "bg-white/5 text-white/40 group-hover:text-neon/70",
        ].join(" ")}
      >
        {file ? <IconCheck className={compact ? "h-5 w-5" : "h-7 w-7"} /> : icon ?? <IconUpload className={compact ? "h-5 w-5" : "h-7 w-7"} />}
      </motion.div>

      <div>
        <div className={compact ? "text-sm font-semibold text-white" : "font-semibold text-white"}>
          {file ? file.name : title}
        </div>
        {hint ? (
          <div className="mt-1 text-xs text-white/40">{hint}</div>
        ) : null}
      </div>

      {file && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onFile(null);
          }}
          className="text-xs text-white/30 underline-offset-2 hover:text-white/60 hover:underline"
        >
          Changer de fichier
        </button>
      )}
    </div>
  );
}
