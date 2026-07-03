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
}: {
  accept: string;
  file: File | null;
  onFile: (f: File | null) => void;
  title: string;
  hint: string;
  icon?: React.ReactNode;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const f = e.dataTransfer.files?.[0];
        if (f) onFile(f);
      }}
      onClick={() => inputRef.current?.click()}
      className={[
        "group relative flex cursor-pointer flex-col items-center justify-center gap-4 overflow-hidden rounded-2xl border-2 border-dashed p-10 text-center transition",
        over
          ? "border-neon/60 bg-neon/5 shadow-neon"
          : file
            ? "border-neon/40 bg-neon/5"
            : "border-white/15 bg-white/[0.02] hover:border-neon/30 hover:bg-white/[0.04]",
      ].join(" ")}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0] ?? null)}
      />

      {/* Halo au survol */}
      <div className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100">
        <div className="absolute inset-0 bg-gradient-to-b from-neon/5 to-transparent" />
      </div>

      <motion.div
        key={file ? "has" : "empty"}
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={[
          "relative flex h-16 w-16 items-center justify-center rounded-2xl transition",
          file ? "bg-neon/20 text-neon" : "bg-white/5 text-white/40 group-hover:text-neon/70",
        ].join(" ")}
      >
        {file ? <IconCheck className="h-7 w-7" /> : icon ?? <IconUpload className="h-7 w-7" />}
      </motion.div>

      <div>
        <div className="font-semibold text-white">
          {file ? file.name : title}
        </div>
        <div className="mt-1 text-xs text-white/40">{hint}</div>
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
