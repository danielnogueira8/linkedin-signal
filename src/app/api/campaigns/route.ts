import { NextRequest } from "next/server";
import { db, campaigns } from "@/db";
import { createJob, runJob } from "@/lib/jobs";
import { generateVariants } from "@/lib/generation";
import { demoGenerate } from "@/lib/demo-engine";
import { isDemoMode } from "@/lib/claude";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    workspaceId?: number;
    productName?: string;
    brief?: string;
    goal?: string;
  };
  if (!body.workspaceId || !body.productName || !body.brief) {
    return Response.json({ error: "workspaceId, productName and brief are required" }, { status: 400 });
  }

  const [campaign] = await db
    .insert(campaigns)
    .values({
      workspaceId: body.workspaceId,
      productName: body.productName,
      brief: body.brief,
      goal: body.goal || "launch",
    })
    .returning();

  const job = await createJob("generate", { campaignId: campaign.id });
  const engine = isDemoMode() ? demoGenerate : generateVariants;
  runJob(job.id, () => engine(job.id, campaign.id));
  return Response.json({ jobId: job.id, campaignId: campaign.id });
}
