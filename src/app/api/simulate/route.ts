// Allow long-running scrape/AI jobs to finish on Vercel (fluid compute)
export const maxDuration = 300;
import { NextRequest } from "next/server";
import { createJob, runJob } from "@/lib/jobs";
import { runArena } from "@/lib/arena";
import { demoSimulate } from "@/lib/demo-engine";
import { isDemoMode } from "@/lib/llm";

export async function POST(request: NextRequest) {
  const { campaignId } = (await request.json()) as { campaignId?: number };
  if (!campaignId) return Response.json({ error: "campaignId required" }, { status: 400 });

  const job = await createJob("simulate", { campaignId });
  const engine = isDemoMode() ? demoSimulate : runArena;
  runJob(job.id, () => engine(job.id, campaignId));
  return Response.json({ jobId: job.id });
}
