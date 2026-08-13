import { db, campaigns, variants, segments, simulations } from "@/db";
import { eq, desc } from "drizzle-orm";
import { getActiveWorkspace } from "@/lib/workspace";
import { CopyButton } from "./copy-button";
import Link from "next/link";

export const dynamic = "force-dynamic";

// LinkedIn engagement peaks (US/EU B2B): Tue-Thu mornings.
const POST_TIMES = ["Tuesday 8:30–10:00", "Wednesday 8:30–10:00", "Thursday 8:00–9:30"];

export default async function DeployPage() {
  const ws = await getActiveWorkspace();
  const campaign = ws
    ? await db.query.campaigns.findFirst({
        where: eq(campaigns.workspaceId, ws.id),
        orderBy: [desc(campaigns.createdAt)],
      })
    : null;
  const sim = campaign
    ? await db.query.simulations.findFirst({
        where: eq(simulations.campaignId, campaign.id),
        orderBy: [desc(simulations.createdAt)],
      })
    : null;

  if (!campaign || sim?.status !== "done" || !sim.results) {
    return (
      <div className="mx-auto mt-24 max-w-md text-center">
        <h1 className="text-xl font-bold">Run the wind tunnel first</h1>
        <p className="mt-2 text-zinc-400">
          Deploy shows your winning posts once the simulation has picked them.
        </p>
        <Link
          href="/app/windtunnel"
          className="mt-5 inline-block rounded-lg bg-sky-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-400"
        >
          Go to Wind Tunnel
        </Link>
      </div>
    );
  }

  const winners = await db.query.variants.findMany({
    where: eq(variants.campaignId, campaign.id),
  });
  const winning = winners.filter((v) => v.status === "winner");
  const segs = await db.query.segments.findMany({ where: eq(segments.workspaceId, ws!.id) });
  const segById = new Map(segs.map((s) => [s.id, s]));
  const resultByVariant = new Map(sim.results.variants.map((r) => [r.variantId, r]));
  const overallId = sim.results.overallWinnerVariantId;

  const ordered = [...winning].sort((a, b) =>
    a.id === overallId ? -1 : b.id === overallId ? 1 : 0,
  );

  return (
    <div>
      <p className="font-mono text-xs text-sky-400">STEP 05 — DEPLOY</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">Ship the winners</h1>
      <p className="mt-3 max-w-xl text-zinc-400">
        One winning post per niche, ready to paste into LinkedIn. Stagger them across the week
        so each niche gets its own moment.
      </p>

      <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-300">
        <span className="font-semibold text-zinc-200">Best posting windows:</span>{" "}
        {POST_TIMES.join(" · ")}{" "}
        <span className="text-zinc-500">(your timezone, B2B peak engagement)</span>
      </div>

      <div className="mt-8 space-y-5">
        {ordered.map((v) => {
          const seg = segById.get(v.segmentId);
          const r = resultByVariant.get(v.id);
          const isOverall = v.id === overallId;
          return (
            <div
              key={v.id}
              className={
                "rounded-xl border p-5 " +
                (isOverall
                  ? "border-sky-800/60 bg-sky-950/20"
                  : "border-zinc-800 bg-zinc-900/50")
              }
            >
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-semibold text-zinc-200">
                  {isOverall && <span className="mr-1.5">🏆</span>}
                  {seg?.emoji} {seg?.name}
                  <span className="ml-2 font-mono text-[10px] uppercase text-zinc-500">
                    {v.hookStyle}
                  </span>
                </p>
                <div className="flex items-center gap-3">
                  {r && (
                    <span className="text-xs text-zinc-500">
                      index <span className="font-semibold text-sky-400">{r.engagementIndex}</span>{" "}
                      · ~{r.predictedReactions} reactions · ~{r.predictedComments} comments
                    </span>
                  )}
                  <CopyButton text={v.text} />
                </div>
              </div>
              <p className="mt-3 whitespace-pre-wrap rounded-lg bg-zinc-950/60 p-4 text-sm leading-relaxed text-zinc-200">
                {v.text}
              </p>
              {seg && (
                <a
                  href={`/api/export?segmentId=${seg.id}`}
                  className="mt-3 inline-block text-xs font-medium text-sky-400 hover:text-sky-300"
                >
                  Export {seg.name} audience CSV ↓
                </a>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
