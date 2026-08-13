"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { JobProgress, useJob } from "@/components/job-progress";

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
  const job = useJob(jobId, () => router.refresh());

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
    "w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm outline-none placeholder:text-zinc-600 focus:border-sky-500";

  return (
    <div className="mt-6 max-w-2xl space-y-3">
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
        <select value={goal} onChange={(e) => setGoal(e.target.value)} className={inputCls + " w-56"}>
          <option value="launch">Goal: product launch</option>
          <option value="waitlist">Goal: waitlist signups</option>
          <option value="leads">Goal: lead generation</option>
          <option value="awareness">Goal: awareness</option>
        </select>
        <button
          onClick={start}
          disabled={busy || !productName.trim() || !brief.trim()}
          className="rounded-lg bg-sky-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:opacity-50"
        >
          {busy ? "Writing…" : "Generate variants"}
        </button>
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <JobProgress job={job} label="Variant generation" />
    </div>
  );
}
