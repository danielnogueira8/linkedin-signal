"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AgentTrace, useJob } from "@/components/agent-trace";
import { GOALS, type GoalKey } from "@/lib/goals";

type Campaign = { productName: string; brief: string; goal: string; mode: string };
type Mode = "brief" | "draft";

export function BriefForm({
  workspaceId,
  existing,
}: {
  workspaceId: number;
  existing?: Campaign;
}) {
  const [mode, setMode] = useState<Mode>(existing?.mode === "draft" ? "draft" : "brief");
  const [productName, setProductName] = useState(
    existing?.mode === "draft" ? "" : (existing?.productName ?? ""),
  );
  const [brief, setBrief] = useState(existing?.mode === "brief" ? existing.brief : "");
  const [draft, setDraft] = useState(existing?.mode === "draft" ? existing.brief : "");
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
      body: JSON.stringify(
        mode === "draft"
          ? { workspaceId, mode, brief: draft, goal }
          : { workspaceId, mode, productName, brief, goal },
      ),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Generation failed to start");
      return;
    }
    setJobId(data.jobId);
  };

  const busy = job?.status === "pending" || job?.status === "running";
  const canStart =
    mode === "draft" ? draft.trim().length >= 40 : productName.trim() && brief.trim();
  const inputCls =
    "w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm shadow-card outline-none transition placeholder:text-ink-faint focus:border-cobalt focus:ring-2 focus:ring-cobalt/15";

  return (
    <div className="mt-7 max-w-2xl space-y-4">
      <div className="flex w-fit rounded-xl border border-line bg-surface p-1 shadow-card">
        {(
          [
            ["brief", "Start from a brief"],
            ["draft", "Start from my draft"],
          ] as [Mode, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setMode(key)}
            className={`rounded-lg px-4 py-2 text-[13px] font-semibold transition ${
              mode === key ? "bg-ink text-paper shadow-card" : "text-ink-soft hover:text-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === "brief" ? (
        <>
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
        </>
      ) : (
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={9}
          placeholder={
            "Paste your LinkedIn post draft here, exactly as you'd publish it.\n\nThe studio writes 4 variations in your voice, and your original competes against them in the AI Arena."
          }
          className={inputCls}
        />
      )}

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
        disabled={busy || !canStart}
        className="rounded-xl bg-cobalt px-6 py-3 text-sm font-semibold text-white shadow-card transition hover:bg-cobalt-deep disabled:opacity-50"
      >
        {busy ? "Writing…" : mode === "draft" ? "Create variations" : "Generate variants"}
      </button>
      {error && <p className="text-sm text-ember">{error}</p>}
      <AgentTrace
        handle={handle}
        label={mode === "draft" ? "Remixing your draft" : "Writing takes for your audience"}
       
      />
    </div>
  );
}
