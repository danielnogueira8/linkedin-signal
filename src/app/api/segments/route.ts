import { NextRequest } from "next/server";
import { createJob, runJob } from "@/lib/jobs";
import { clusterAudience } from "@/lib/clustering";
import { demoCluster } from "@/lib/demo-engine";
import { isDemoMode } from "@/lib/claude";

export async function POST(request: NextRequest) {
  const { workspaceId } = (await request.json()) as { workspaceId?: number };
  if (!workspaceId) return Response.json({ error: "workspaceId required" }, { status: 400 });

  const job = await createJob("cluster", { workspaceId });
  const engine = isDemoMode() ? demoCluster : clusterAudience;
  runJob(job.id, () => engine(job.id, workspaceId));
  return Response.json({ jobId: job.id });
}
