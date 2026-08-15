import type { ReactNode } from "react";
import { agentAvatarUri } from "@/lib/avatar";

/** Blob mascot — the identity of a synthetic agent. Humans get AvatarDot / photos. */
export function AgentAvatar({
  seed,
  size = 36,
  className = "",
}: {
  seed: string;
  size?: number;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- local data URI, no optimization needed
    <img
      src={agentAvatarUri(seed)}
      alt=""
      aria-hidden
      width={size}
      height={size}
      className={`shrink-0 rounded-full ${className}`}
    />
  );
}

/** Numbered mono step label, e.g. "02 / Audience map" */
export function StepLabel({ n, children }: { n: string; children: ReactNode }) {
  return (
    <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-cobalt">
      <span className="text-ink-faint">{n} /</span> {children}
    </p>
  );
}

/** Segmented confidence meter, beautifului-style */
export function ConfidenceMeter({ value }: { value: number }) {
  const filled = Math.round(value * 5);
  const tone = value >= 0.7 ? "bg-teal" : value >= 0.4 ? "bg-cobalt" : "bg-ember";
  const word = value >= 0.7 ? "High" : value >= 0.4 ? "Medium" : "Low";
  return (
    <span className="inline-flex items-center gap-2">
      <span className="flex gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <span
            key={i}
            className={`h-3 w-1 rounded-full ${i < filled ? tone : "bg-line-strong"}`}
          />
        ))}
      </span>
      <span className="font-mono text-[11px] text-ink-soft">{word} confidence</span>
    </span>
  );
}

const CHIP_TONES = {
  neutral: "bg-paper text-ink-soft border-line",
  cobalt: "bg-cobalt-soft text-cobalt-deep border-cobalt/20",
  teal: "bg-teal-soft text-teal border-teal/20",
  ember: "bg-ember-soft text-ember border-ember/20",
} as const;

/** Compact mono chip for tools, stats, statuses */
export function Chip({
  tone = "neutral",
  children,
}: {
  tone?: keyof typeof CHIP_TONES;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-mono text-[11px] ${CHIP_TONES[tone]}`}
    >
      {children}
    </span>
  );
}

/** Colored avatar dot from a name — the beautifului accent-color trick */
const AVATAR_TONES = ["bg-cobalt", "bg-teal", "bg-ember"];
export function AvatarDot({ name }: { name: string }) {
  const tone = AVATAR_TONES[name.charCodeAt(0) % AVATAR_TONES.length];
  return (
    <span
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${tone} text-[11px] font-semibold text-white`}
    >
      {name
        .split(" ")
        .slice(0, 2)
        .map((w) => w[0])
        .join("")}
    </span>
  );
}
