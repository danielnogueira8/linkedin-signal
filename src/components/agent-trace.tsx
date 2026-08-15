"use client";

import { useEffect, useRef, useState } from "react";
import { ThinkingOrb } from "thinking-orbs";
import type { OrbState } from "thinking-orbs";
import { AgentAvatar } from "./ui";

export type JobState = {
  id: number;
  status: "pending" | "running" | "done" | "error";
  progress: string;
  error: string | null;
  result: Record<string, unknown> | null;
};

export type JobHandle = {
  job: JobState | null;
  steps: string[];
  startedAt: number | null;
};

export function useJob(jobId: number | null, onDone?: (job: JobState) => void): JobHandle {
  const [job, setJob] = useState<JobState | null>(null);
  const [steps, setSteps] = useState<string[]>([]);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    if (!jobId) return;
    let stop = false;
    const collected: string[] = [];
    const started = Date.now();
    const tick = async () => {
      const res = await fetch(`/api/jobs/${jobId}`);
      if (!res.ok) return;
      const j = (await res.json()) as JobState;
      if (stop) return;
      if (j.progress && j.progress !== "Done" && collected[collected.length - 1] !== j.progress) {
        collected.push(j.progress);
      }
      setStartedAt(started);
      setSteps([...collected]);
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

  return { job, steps, startedAt };
}

function useElapsed(startedAt: number | null, running: boolean) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(t);
  }, [running]);
  if (!startedAt) return 0;
  // `now` freezes at the last interval tick once the job stops
  return (Math.max(now ?? startedAt, startedAt) - startedAt) / 1000;
}

/**
 * Agent thinking-trace: streams job progress as an expandable step log with
 * elapsed time — the agent shows its work instead of hiding behind a spinner.
 */
export function AgentTrace({
  handle,
  label,
  orbState = "solving",
}: {
  handle: JobHandle;
  label: string;
  /** Which thinking-orb animation plays while the agent runs. */
  orbState?: OrbState;
}) {
  const { job, steps, startedAt } = handle;
  const [collapsed, setCollapsed] = useState(false);
  const running = job?.status === "pending" || job?.status === "running";
  const elapsed = useElapsed(startedAt, running);

  if (!job) return null;

  if (job.status === "error") {
    return (
      <div className="trace-card mt-4 rounded-2xl border border-ember/30 bg-ember-soft px-4 py-3 text-sm text-ink">
        <span className="font-mono text-[11px] uppercase tracking-wide text-ember">
          Agent stopped
        </span>
        <p className="mt-1">{job.error ?? "Something went wrong."}</p>
      </div>
    );
  }

  const expanded = !collapsed;

  return (
    <div className="trace-card mt-4 overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        {running ? (
          <>
            <AgentAvatar seed={label} size={32} />
            <span className="shimmer-text text-sm font-medium">{label}…</span>
            <ThinkingOrb state={orbState} size={20} aria-label={`Agent ${orbState}`} />
            <span className="ml-auto font-mono text-[11px] tabular-nums text-ink-faint">
              {elapsed.toFixed(1)}s
            </span>
          </>
        ) : (
          <>
            <AgentAvatar seed={label} size={32} />
            <span className="text-sm font-medium text-ink">
              {label} — ran for {elapsed.toFixed(1)}s
            </span>
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-teal text-[9px] font-bold text-white">
              ✓
            </span>
            <span className="ml-auto font-mono text-[11px] text-ink-faint">
              {expanded ? "hide" : `${steps.length} steps`}
            </span>
          </>
        )}
      </button>

      {expanded && steps.length > 0 && (
        <div className="border-t border-line px-4 py-3">
          <ol className="space-y-2">
            {steps.map((s, i) => {
              const isActive = running && i === steps.length - 1;
              return (
                <li key={i} className="trace-step flex items-start gap-2.5 text-[13px]">
                  {isActive ? (
                    <span className="mt-1 h-2 w-2 shrink-0 animate-pulse rounded-full bg-cobalt" />
                  ) : (
                    <span className="mt-0.5 shrink-0 text-teal">✓</span>
                  )}
                  <span className={isActive ? "shimmer-text" : "text-ink-soft"}>{s}</span>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
}
