"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AgentTrace, useJob } from "@/components/agent-trace";

export function SimulateButton({
  campaignId,
  hasResults,
}: {
  campaignId: number;
  hasResults: boolean;
}) {
  const [jobId, setJobId] = useState<number | null>(null);
  const router = useRouter();
  const handle = useJob(jobId, () => router.refresh());
  const job = handle.job;

  const start = async () => {
    const res = await fetch("/api/simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaignId }),
    });
    const data = await res.json();
    if (res.ok) setJobId(data.jobId);
  };

  const busy = job?.status === "pending" || job?.status === "running";

  return (
    <div className="w-full max-w-sm text-right">
      <button
        onClick={start}
        disabled={busy}
        className="rounded-xl bg-cobalt px-6 py-3 text-sm font-semibold text-white shadow-card transition hover:bg-cobalt-deep disabled:opacity-50"
      >
        {busy ? "Simulating…" : hasResults ? "Re-run simulation" : "Run wind tunnel"}
      </button>
      <div className="text-left">
        <AgentTrace handle={handle} label="Testing variants against your audience" />
      </div>
    </div>
  );
}
