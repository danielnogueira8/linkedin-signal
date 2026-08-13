import { db, campaigns, variants, segments } from "@/db";
import { eq, desc } from "drizzle-orm";
import { getActiveWorkspace } from "@/lib/workspace";
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
      <div className="mx-auto mt-24 max-w-md text-center">
        <h1 className="text-xl font-bold">Map your audience first</h1>
        <p className="mt-2 text-zinc-400">
          The studio writes one variant set per niche — so we need your niches first.
        </p>
        <Link
          href="/app/audience"
          className="mt-5 inline-block rounded-lg bg-sky-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-400"
        >
          Go to Audience Map
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
      <p className="font-mono text-xs text-sky-400">STEP 03 — CREATIVE STUDIO</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">Brief once, write for every niche</h1>
      <p className="mt-3 max-w-xl text-zinc-400">
        Describe what you&apos;re launching. The studio writes 4 hook-style variants for each of
        your {segs.length} niches — every post aimed at one specific reader.
      </p>

      <BriefForm workspaceId={ws.id} existing={campaign ?? undefined} />

      {vars.length > 0 && campaign && (
        <div className="mt-10">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {campaign.productName} — {vars.length} variants
            </h2>
            <Link
              href="/app/windtunnel"
              className="rounded-lg bg-sky-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-400"
            >
              Next: test in the Wind Tunnel →
            </Link>
          </div>

          {segs.map((seg) => {
            const segVars = vars.filter((v) => v.segmentId === seg.id);
            if (segVars.length === 0) return null;
            return (
              <div key={seg.id} className="mt-6">
                <h3 className="text-sm font-semibold text-zinc-300">
                  {seg.emoji} {seg.name}
                </h3>
                <div className="mt-2 grid grid-cols-1 gap-3 lg:grid-cols-2">
                  {segVars.map((v) => (
                    <div
                      key={v.id}
                      className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4"
                    >
                      <span className="rounded-md bg-zinc-800 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-sky-400">
                        {v.hookStyle}
                      </span>
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">
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
