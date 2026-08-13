import { NextRequest } from "next/server";
import { createJob, runJob, completeJob } from "@/lib/jobs";
import { syncWorkspace } from "@/lib/apify";
import { isDemoMode } from "@/lib/claude";
import { ensureDemoWorkspace } from "@/lib/demo-data";

export async function POST(request: NextRequest) {
  const { linkedinUrl } = (await request.json()) as { linkedinUrl?: string };

  if (isDemoMode()) {
    const ws = await ensureDemoWorkspace();
    const job = await createJob("scrape", { demo: true });
    await completeJob(job.id, { workspaceId: ws.id, demo: true });
    return Response.json({ jobId: job.id, workspaceId: ws.id, demo: true });
  }

  if (!linkedinUrl || !/^https?:\/\/(www\.)?linkedin\.com\/in\//.test(linkedinUrl)) {
    return Response.json(
      { error: "Enter a valid LinkedIn profile URL (https://linkedin.com/in/…)" },
      { status: 400 },
    );
  }

  const job = await createJob("scrape", { linkedinUrl });
  runJob(job.id, () => syncWorkspace(job.id, linkedinUrl));
  return Response.json({ jobId: job.id });
}
