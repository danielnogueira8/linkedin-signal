"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { JobProgress, useJob } from "@/components/job-progress";

export function SimulateButton({
  campaignId,
  hasResults,
}: {
  campaignId: number;
  hasResults: boolean;
}) {
  const [jobId, setJobId] = useState<number | null>(null);
  const router = useRouter();
  const job = useJob(jobId, () => router.refresh());

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
    <div className="text-right">
      <button
        onClick={start}
        disabled={busy}
        className="rounded-lg bg-sky-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:opacity-50"
      >
        {busy ? "Simulating…" : hasResults ? "Re-run simulation" : "Run wind tunnel"}
      </button>
      <JobProgress job={job} label="Wind tunnel" />
    </div>
  );
}
