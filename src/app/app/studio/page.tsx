import { db, campaigns, variants, segments } from "@/db";
import { eq, desc } from "drizzle-orm";
import { getActiveWorkspace } from "@/lib/workspace";
import { StepLabel, Chip } from "@/components/ui";
import { goalFor } from "@/lib/goals";
import { BriefForm } from "./brief-form";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function StudioPage() {
  const ws = await getActiveWorkspace();
  const audience = ws
    ? await db.query.segments.findFirst({ where: eq(segments.workspaceId, ws.id) })
    : null;

  if (!ws || !audience) {
    return (
      <div className="mx-auto mt-28 max-w-md text-center">
        <h1 className="font-display text-2xl font-bold">Build your audience profile first</h1>
        <p className="mt-2 text-ink-soft">
          The studio writes for your audience — so we need its profile first.
        </p>
        <Link
          href="/app/audience"
          className="btn-press mt-6 inline-block rounded-xl bg-cobalt px-6 py-3 text-sm font-semibold text-white shadow-card hover:bg-cobalt-deep"
        >
          Go to Audience profile
        </Link>
      </div>
    );
  }

  const campaign = await db.query.campaigns.findFirst({
    where: eq(campaigns.workspaceId, ws.id),
    orderBy: [desc(campaigns.createdAt)],
  });
  const vars = campaign
    ? await db.query.variants.findMany({ where: eq(variants.campaignId, campaign.id) })
    : [];

  return (
    <div>
      <div className="rise">
        <StepLabel n="03">Creative studio</StepLabel>
        <h1 className="mt-3 font-display text-4xl font-bold tracking-tight">
          One brief, five takes
        </h1>
        <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink-soft">
          Say what the post is about and pick a goal. The studio writes five hook-style takes
          for your {audience.size}-person audience — then the AI Arena picks the strongest.
        </p>
      </div>

      <div className="rise rise-1">
        <BriefForm workspaceId={ws.id} existing={campaign ?? undefined} />
      </div>

      {vars.length > 0 && campaign && (
        <div className="mt-12">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold">
              {campaign.productName}
              <span className="ml-3 align-middle">
                <Chip tone="cobalt">{goalFor(campaign.goal).label}</Chip>
              </span>
              <span className="ml-2 align-middle">
                <Chip tone="teal">{vars.length} takes</Chip>
              </span>
            </h2>
            <Link
              href="/app/arena"
              className="btn-press rounded-xl bg-ink px-6 py-3 text-sm font-semibold text-paper shadow-card hover:bg-black"
            >
              Next: test in the AI Arena →
            </Link>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-2">
            {vars.map((v) => (
              <div
                key={v.id}
                className="rounded-2xl border border-line bg-surface p-5 shadow-card transition hover:shadow-pop"
              >
                <Chip tone="cobalt">{v.hookStyle}</Chip>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink-soft">
                  {v.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
