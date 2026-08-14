import { after } from "next/server";
import { db, jobs } from "@/db";
import { eq } from "drizzle-orm";

export type JobType = "scrape" | "cluster" | "generate" | "simulate";

export async function createJob(type: JobType, payload: Record<string, unknown> = {}) {
  const [job] = await db.insert(jobs).values({ type, payload, status: "pending" }).returning();
  return job;
}

export async function setProgress(jobId: number, progress: string) {
  await db
    .update(jobs)
    .set({ progress, status: "running", updatedAt: new Date() })
    .where(eq(jobs.id, jobId));
}

export async function completeJob(jobId: number, result: Record<string, unknown> = {}) {
  await db
    .update(jobs)
    .set({ status: "done", result, progress: "Done", updatedAt: new Date() })
    .where(eq(jobs.id, jobId));
}

export async function failJob(jobId: number, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  await db
    .update(jobs)
    .set({ status: "error", error: message, updatedAt: new Date() })
    .where(eq(jobs.id, jobId));
}

export async function getJob(jobId: number) {
  return db.query.jobs.findFirst({ where: eq(jobs.id, jobId) });
}

/**
 * Background runner: the API route returns the job id immediately and the UI
 * polls /api/jobs/[id]. Work is scheduled via next/server's after() so
 * serverless platforms (Vercel) keep the function alive until it finishes —
 * a bare floating promise would be frozen as soon as the response is sent.
 */
export function runJob(jobId: number, work: () => Promise<Record<string, unknown> | void>) {
  after(async () => {
    try {
      await setProgress(jobId, "Starting…");
      const result = await work();
      await completeJob(jobId, result ?? {});
    } catch (err) {
      console.error(`[job ${jobId}] failed:`, err);
      await failJob(jobId, err);
    }
  });
}
