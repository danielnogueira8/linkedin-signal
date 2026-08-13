"use client";

import { useState } from "react";

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="shrink-0 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-200 transition hover:border-sky-500 hover:text-sky-400"
    >
      {copied ? "Copied ✓" : "Copy post"}
    </button>
  );
}
