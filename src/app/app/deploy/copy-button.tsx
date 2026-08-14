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
      className={`shrink-0 rounded-lg px-3.5 py-1.5 text-xs font-semibold shadow-card transition ${
        copied ? "bg-teal text-white" : "bg-ink text-paper hover:bg-black"
      }`}
    >
      {copied ? "Copied ✓" : "Copy post"}
    </button>
  );
}
