"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { JobProgress, useJob } from "@/components/job-progress";

export function SyncForm() {
  const [url, setUrl] = useState("");
  const [jobId, setJobId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const job = useJob(jobId, () => {
    router.refresh();
    setTimeout(() => router.push("/app/audience"), 800);
  });

  const start = async () => {
    setError(null);
    const res = await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ linkedinUrl: url.trim() }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Sync failed to start");
      return;
    }
    setJobId(data.jobId);
  };

  const busy = job?.status === "pending" || job?.status === "running";

  return (
    <div className="mt-6">
      <div className="flex gap-2">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !busy && start()}
          placeholder="https://linkedin.com/in/your-profile"
          className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm outline-none placeholder:text-zinc-600 focus:border-sky-500"
        />
        <button
          onClick={start}
          disabled={busy}
          className="rounded-lg bg-sky-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:opacity-50"
        >
          {busy ? "Syncing…" : "Sync audience"}
        </button>
      </div>
      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      <JobProgress job={job} label="Audience sync" />
    </div>
  );
}
