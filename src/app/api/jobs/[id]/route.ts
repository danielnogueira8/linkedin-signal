import { NextRequest } from "next/server";
import { getJob } from "@/lib/jobs";

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/jobs/[id]">) {
  const { id } = await ctx.params;
  const job = await getJob(Number(id));
  if (!job) return Response.json({ error: "Job not found" }, { status: 404 });
  return Response.json({
    id: job.id,
    type: job.type,
    status: job.status,
    progress: job.progress,
    error: job.error,
    result: job.result,
  });
}
