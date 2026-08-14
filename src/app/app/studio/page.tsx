import { db, campaigns, variants, segments } from "@/db";
import { eq, desc } from "drizzle-orm";
import { getActiveWorkspace } from "@/lib/workspace";
import { StepLabel, Chip } from "@/components/ui";
import { BriefForm } from "./brief-form";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function StudioPage() {
  const ws = await getActiveWorkspace();
  const segs = ws
    ? await db.query.segments.findMany({ where: eq(segments.workspaceId, ws.id) })
    : [];

  if (!ws || segs.length === 0) {
    return (
      <div className="mx-auto mt-28 max-w-md text-center">
        <h1 className="font-display text-2xl font-bold">Map your audience first</h1>
        <p className="mt-2 text-ink-soft">
          The studio writes one variant set per niche — so we need your niches first.
        </p>
        <Link
          href="/app/audience"
          className="btn-press mt-6 inline-block rounded-xl bg-cobalt px-6 py-3 text-sm font-semibold text-white shadow-card hover:bg-cobalt-deep"
        >
          Go to Audience map
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
          Brief once, write for every niche
        </h1>
        <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink-soft">
          Describe what you&apos;re launching. The studio writes 4 hook-style variants for each
          of your {segs.length} niches — every post aimed at one specific reader.
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
                <Chip tone="teal">{vars.length} variants</Chip>
              </span>
            </h2>
            <Link
              href="/app/windtunnel"
              className="btn-press rounded-xl bg-ink px-6 py-3 text-sm font-semibold text-paper shadow-card transition hover:bg-black"
            >
              Next: test in the wind tunnel →
            </Link>
          </div>

          {segs.map((seg) => {
            const segVars = vars.filter((v) => v.segmentId === seg.id);
            if (segVars.length === 0) return null;
            return (
              <div key={seg.id} className="mt-8">
                <h3 className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-faint">
                  {seg.emoji} {seg.name}
                </h3>
                <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
                  {segVars.map((v) => (
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
            );
          })}
        </div>
      )}
    </div>
  );
}
