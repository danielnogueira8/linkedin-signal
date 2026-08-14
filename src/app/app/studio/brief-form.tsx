"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AgentTrace, useJob } from "@/components/agent-trace";
import { GOALS, type GoalKey } from "@/lib/goals";

type Campaign = { productName: string; brief: string; goal: string };

export function BriefForm({
  workspaceId,
  existing,
}: {
  workspaceId: number;
  existing?: Campaign;
}) {
  const [productName, setProductName] = useState(existing?.productName ?? "");
  const [brief, setBrief] = useState(existing?.brief ?? "");
  const [goal, setGoal] = useState<GoalKey>(
    existing && existing.goal in GOALS ? (existing.goal as GoalKey) : "awareness",
  );
  const [jobId, setJobId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const handle = useJob(jobId, () => router.refresh());
  const job = handle.job;

  const start = async () => {
    setError(null);
    const res = await fetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId, productName, brief, goal }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Generation failed to start");
      return;
    }
    setJobId(data.jobId);
  };

  const busy = job?.status === "pending" || job?.status === "running";
  const inputCls =
    "w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm shadow-card outline-none transition placeholder:text-ink-faint focus:border-cobalt focus:ring-2 focus:ring-cobalt/15";

  return (
    <div className="mt-7 max-w-2xl space-y-4">
      <input
        value={productName}
        onChange={(e) => setProductName(e.target.value)}
        placeholder="Topic — what's this post about?"
        className={inputCls}
      />
      <textarea
        value={brief}
        onChange={(e) => setBrief(e.target.value)}
        rows={4}
        placeholder="The brief: the key message, story, or insight — and anything the post must include. One good paragraph beats ten bullet points."
        className={inputCls}
      />

      <div>
        <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">
          Post goal
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(Object.entries(GOALS) as [GoalKey, (typeof GOALS)[GoalKey]][]).map(([key, g]) => (
            <button
              key={key}
              type="button"
              onClick={() => setGoal(key)}
              className={`rounded-xl border px-3 py-2.5 text-left transition ${
                goal === key
                  ? "border-cobalt/40 bg-cobalt-soft shadow-card"
                  : "border-line bg-surface hover:border-line-strong"
              }`}
            >
              <span
                className={`block text-[13px] font-semibold ${
                  goal === key ? "text-cobalt-deep" : "text-ink"
                }`}
              >
                {g.label}
              </span>
              <span className="mt-0.5 block text-[11px] leading-snug text-ink-soft">
                {g.tagline}
              </span>
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={start}
        disabled={busy || !productName.trim() || !brief.trim()}
        className="rounded-xl bg-cobalt px-6 py-3 text-sm font-semibold text-white shadow-card transition hover:bg-cobalt-deep disabled:opacity-50"
      >
        {busy ? "Writing…" : "Generate variants"}
      </button>
      {error && <p className="text-sm text-ember">{error}</p>}
      <AgentTrace handle={handle} label="Writing takes for your audience" />
    </div>
  );
}
