"use client";

import { useEffect, useRef, useState } from "react";

export type JobState = {
  id: number;
  status: "pending" | "running" | "done" | "error";
  progress: string;
  error: string | null;
  result: Record<string, unknown> | null;
};

export function useJob(jobId: number | null, onDone?: (job: JobState) => void) {
  const [job, setJob] = useState<JobState | null>(null);
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    if (!jobId) return;
    let stop = false;
    const tick = async () => {
      const res = await fetch(`/api/jobs/${jobId}`);
      if (!res.ok) return;
      const j = (await res.json()) as JobState;
      if (stop) return;
      setJob(j);
      if (j.status === "done") onDoneRef.current?.(j);
      if (j.status === "done" || j.status === "error") return;
      setTimeout(tick, 1500);
    };
    tick();
    return () => {
      stop = true;
    };
  }, [jobId]);

  return job;
}

export function JobProgress({ job, label }: { job: JobState | null; label: string }) {
  if (!job) return null;
  if (job.status === "error") {
    return (
      <div className="mt-4 rounded-lg border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-300">
        {job.error ?? "Something went wrong."}
      </div>
    );
  }
  if (job.status === "done") {
    return (
      <div className="mt-4 rounded-lg border border-emerald-900/60 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-300">
        ✓ {label} complete
      </div>
    );
  }
  return (
    <div className="mt-4 flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-sm text-zinc-300">
      <span className="h-2 w-2 animate-pulse rounded-full bg-sky-400" />
      {job.progress || `${label}…`}
    </div>
  );
}
