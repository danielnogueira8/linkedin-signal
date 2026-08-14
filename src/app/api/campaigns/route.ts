// Allow long-running scrape/AI jobs to finish on Vercel (fluid compute)
export const maxDuration = 300;
import { NextRequest } from "next/server";
import { db, campaigns } from "@/db";
import { createJob, runJob } from "@/lib/jobs";
import { generateVariants } from "@/lib/generation";
import { demoGenerate } from "@/lib/demo-engine";
import { isDemoMode } from "@/lib/llm";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    workspaceId?: number;
    productName?: string;
    brief?: string;
    mode?: "brief" | "draft";
    goal?: string;
  };
  const mode = body.mode === "draft" ? "draft" : "brief";

  if (!body.workspaceId || !body.brief) {
    return Response.json({ error: "workspaceId and brief are required" }, { status: 400 });
  }
  if (mode === "brief" && !body.productName) {
    return Response.json({ error: "productName is required in brief mode" }, { status: 400 });
  }
  if (mode === "draft" && body.brief.trim().length < 40) {
    return Response.json(
      { error: "That draft looks too short — paste the full post text." },
      { status: 400 },
    );
  }

  // Draft mode: derive a display topic from the draft's first line
  const productName =
    mode === "draft"
      ? (body.productName?.trim() ||
        body.brief.trim().split("\n")[0].slice(0, 60) + (body.brief.trim().split("\n")[0].length > 60 ? "…" : ""))
      : body.productName!;

  const [campaign] = await db
    .insert(campaigns)
    .values({
      workspaceId: body.workspaceId,
      productName,
      brief: body.brief,
      mode,
      goal: body.goal || "awareness",
    })
    .returning();

  const job = await createJob("generate", { campaignId: campaign.id });
  const engine = isDemoMode() ? demoGenerate : generateVariants;
  runJob(job.id, () => engine(job.id, campaign.id));
  return Response.json({ jobId: job.id, campaignId: campaign.id });
}
