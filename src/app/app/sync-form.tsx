"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AgentTrace, useJob } from "@/components/agent-trace";

export function SyncForm() {
  const [url, setUrl] = useState("");
  const [jobId, setJobId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const handle = useJob(jobId, () => {
    router.refresh();
    setTimeout(() => router.push("/app/audience"), 900);
  });
  const job = handle.job;

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
    <div className="mt-7">
      <div className="flex gap-2">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !busy && start()}
          placeholder="https://linkedin.com/in/your-profile"
          className="flex-1 rounded-xl border border-line bg-surface px-4 py-3 text-sm shadow-card outline-none transition placeholder:text-ink-faint focus:border-cobalt focus:ring-2 focus:ring-cobalt/15"
        />
        <button
          onClick={start}
          disabled={busy}
          className="rounded-xl bg-cobalt px-6 py-3 text-sm font-semibold text-white shadow-card transition hover:bg-cobalt-deep disabled:opacity-50"
        >
          {busy ? "Syncing…" : "Sync audience"}
        </button>
      </div>
      {error && <p className="mt-3 text-sm text-ember">{error}</p>}
      <AgentTrace handle={handle} label="Scraping your audience" orbState="searching" />
    </div>
  );
}
