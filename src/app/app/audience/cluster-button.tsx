"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { JobProgress, useJob } from "@/components/job-progress";

export function ClusterButton({
  workspaceId,
  hasSegments,
}: {
  workspaceId: number;
  hasSegments: boolean;
}) {
  const [jobId, setJobId] = useState<number | null>(null);
  const router = useRouter();
  const job = useJob(jobId, () => router.refresh());

  const start = async () => {
    const res = await fetch("/api/segments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId }),
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
        {busy ? "Mapping…" : hasSegments ? "Re-map audience" : "Map my audience"}
      </button>
      <JobProgress job={job} label="Audience mapping" />
    </div>
  );
}
