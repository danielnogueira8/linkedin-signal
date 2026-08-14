"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AgentTrace, useJob } from "@/components/agent-trace";

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
  const [goal, setGoal] = useState(existing?.goal ?? "launch");
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
    <div className="mt-7 max-w-2xl space-y-3">
      <input
        value={productName}
        onChange={(e) => setProductName(e.target.value)}
        placeholder="Product / launch name (e.g. Signal for LinkedIn)"
        className={inputCls}
      />
      <textarea
        value={brief}
        onChange={(e) => setBrief(e.target.value)}
        rows={4}
        placeholder="The brief: what is it, who is it for, why now, what makes it different? One good paragraph beats ten bullet points."
        className={inputCls}
      />
      <div className="flex items-center gap-3">
        <select value={goal} onChange={(e) => setGoal(e.target.value)} className={inputCls + " w-60"}>
          <option value="launch">Goal: product launch</option>
          <option value="waitlist">Goal: waitlist signups</option>
          <option value="leads">Goal: lead generation</option>
          <option value="awareness">Goal: awareness</option>
        </select>
        <button
          onClick={start}
          disabled={busy || !productName.trim() || !brief.trim()}
          className="rounded-xl bg-cobalt px-6 py-3 text-sm font-semibold text-white shadow-card transition hover:bg-cobalt-deep disabled:opacity-50"
        >
          {busy ? "Writing…" : "Generate variants"}
        </button>
      </div>
      {error && <p className="text-sm text-ember">{error}</p>}
      <AgentTrace handle={handle} label="Writing per-niche variants" />
    </div>
  );
}
