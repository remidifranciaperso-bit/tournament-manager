import { useRef, useState } from "react";
import { motion } from "framer-motion";

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
  icon: string;
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
        "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed p-8 text-center transition",
        over
          ? "border-court-500 bg-court-50"
          : file
            ? "border-court-400 bg-court-50/60"
            : "border-court-200 bg-white/60 hover:border-court-400",
      ].join(" ")}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0] ?? null)}
      />
      <motion.div
        key={file ? "has" : "empty"}
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-4xl"
      >
        {file ? "✅" : icon}
      </motion.div>
      <div className="font-display font-semibold text-deep-900">
        {file ? file.name : title}
      </div>
      <div className="text-sm text-deep-800/60">{hint}</div>
    </div>
  );
}
